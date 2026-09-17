import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordService, TokenService } from '@cairn/auth';
import type { GoogleProfile } from '@cairn/auth';
import { PrismaService } from '@cairn/database';
import {
  buildPasswordResetEmail,
  NotificationDispatchService,
} from '@cairn/notifications';
import {
  ERROR_CODES,
  NOTIFICATION_CHANNELS,
  ROLES,
  type Role,
} from '@cairn/shared-constants';

import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function toRole(prismaRole: 'OWNER' | 'MEMBER'): Role {
  return prismaRole === 'OWNER' ? ROLES.OWNER : ROLES.MEMBER;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly notifications: NotificationDispatchService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthTokens> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(ERROR_CODES.EMAIL_ALREADY_REGISTERED);
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const { user, household } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { email: dto.email, name: dto.name, passwordHash },
      });
      const createdHousehold = await tx.household.create({
        data: {
          name: dto.householdName,
          members: { create: { userId: createdUser.id, role: 'OWNER' } },
        },
      });
      return { user: createdUser, household: createdHousehold };
    });

    return this.issueTokens(user.id, household.id, ROLES.OWNER);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (
      !user?.passwordHash ||
      !(await this.passwordService.verify(user.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException(ERROR_CODES.INVALID_CREDENTIALS);
    }

    const membership = await this.prisma.householdMember.findFirst({
      where: { userId: user.id },
    });
    if (!membership) {
      throw new UnauthorizedException(ERROR_CODES.HOUSEHOLD_NOT_FOUND);
    }

    return this.issueTokens(
      user.id,
      membership.householdId,
      toRole(membership.role),
    );
  }

  async loginWithGoogle(
    profile: GoogleProfile,
    inviteToken?: string,
  ): Promise<AuthTokens> {
    let invitedHouseholdId: string | null = null;
    if (inviteToken) {
      try {
        const payload = this.tokenService.verifyInviteToken(inviteToken);
        invitedHouseholdId = payload.householdId;
      } catch {
        // Invite token invalid or expired -- continue with normal flow
      }
    }

    const existingByGoogleId = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (existingByGoogleId) {
      if (invitedHouseholdId) {
        const member = await this.prisma.householdMember.upsert({
          where: {
            householdId_userId: {
              householdId: invitedHouseholdId,
              userId: existingByGoogleId.id,
            },
          },
          update: {},
          create: {
            householdId: invitedHouseholdId,
            userId: existingByGoogleId.id,
            role: 'MEMBER',
          },
        });
        return this.issueTokens(
          existingByGoogleId.id,
          invitedHouseholdId,
          toRole(member.role),
        );
      }

      const membership = await this.prisma.householdMember.findFirst({
        where: { userId: existingByGoogleId.id },
      });
      if (!membership) {
        const createdHousehold = await this.prisma.household.create({
          data: {
            name: `${existingByGoogleId.name || 'My'}'s Household`,
            members: {
              create: { userId: existingByGoogleId.id, role: 'OWNER' },
            },
          },
        });
        return this.issueTokens(
          existingByGoogleId.id,
          createdHousehold.id,
          ROLES.OWNER,
        );
      }
      return this.issueTokens(
        existingByGoogleId.id,
        membership.householdId,
        toRole(membership.role),
      );
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });
    if (existingByEmail) {
      const linked = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: profile.googleId,
          emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
        },
      });

      if (invitedHouseholdId) {
        const member = await this.prisma.householdMember.upsert({
          where: {
            householdId_userId: {
              householdId: invitedHouseholdId,
              userId: linked.id,
            },
          },
          update: {},
          create: {
            householdId: invitedHouseholdId,
            userId: linked.id,
            role: 'MEMBER',
          },
        });
        return this.issueTokens(
          linked.id,
          invitedHouseholdId,
          toRole(member.role),
        );
      }

      const membership = await this.prisma.householdMember.findFirst({
        where: { userId: linked.id },
      });
      if (!membership) {
        const createdHousehold = await this.prisma.household.create({
          data: {
            name: `${linked.name || 'My'}'s Household`,
            members: { create: { userId: linked.id, role: 'OWNER' } },
          },
        });
        return this.issueTokens(linked.id, createdHousehold.id, ROLES.OWNER);
      }
      return this.issueTokens(
        linked.id,
        membership.householdId,
        toRole(membership.role),
      );
    }

    // New user signing up with Google
    if (invitedHouseholdId) {
      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            googleId: profile.googleId,
            emailVerifiedAt: new Date(),
          },
        });
        await tx.householdMember.create({
          data: {
            householdId: invitedHouseholdId!,
            userId: createdUser.id,
            role: 'MEMBER',
          },
        });
        return createdUser;
      });
      return this.issueTokens(user.id, invitedHouseholdId, ROLES.MEMBER);
    }

    const { user, household } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.googleId,
          emailVerifiedAt: new Date(),
        },
      });
      const createdHousehold = await tx.household.create({
        data: {
          name: `${profile.name || 'My'}'s Household`,
          members: { create: { userId: createdUser.id, role: 'OWNER' } },
        },
      });
      return { user: createdUser, household: createdHousehold };
    });

    return this.issueTokens(user.id, household.id, ROLES.OWNER);
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const hashed = this.tokenService.hashRefreshToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { hashedToken: hashed },
    });

    if (!stored) {
      throw new UnauthorizedException(ERROR_CODES.TOKEN_INVALID);
    }

    if (stored.revokedAt || stored.expiresAt < new Date()) {
      // Reuse of an already-rotated/revoked token -- revoke the whole family (ARCHITECTURE.md §10).
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(ERROR_CODES.REFRESH_TOKEN_REUSE_DETECTED);
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const membership = await this.prisma.householdMember.findFirst({
      where: { userId: stored.userId },
    });
    if (!membership) {
      throw new UnauthorizedException(ERROR_CODES.HOUSEHOLD_NOT_FOUND);
    }

    return this.issueTokens(
      stored.userId,
      membership.householdId,
      toRole(membership.role),
      stored.familyId,
    );
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const hashed = this.tokenService.hashRefreshToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { hashedToken: hashed },
    });
    if (stored) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  private async issueTokens(
    userId: string,
    householdId: string,
    role: Role,
    familyId?: string,
  ): Promise<AuthTokens> {
    const accessToken = this.tokenService.signAccessToken({
      sub: userId,
      householdId,
      role,
    });
    const issued = this.tokenService.issueRefreshToken(familyId);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        jti: issued.jti,
        hashedToken: issued.hashedToken,
        familyId: issued.familyId,
        expiresAt: issued.expiresAt,
      },
    });

    return { accessToken, refreshToken: issued.token };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user && user.passwordHash) {
      const token = this.tokenService.signPasswordResetToken(
        user.id,
        user.email,
      );
      const appUrl = process.env.WEB_APP_ORIGIN ?? 'http://localhost:4200';
      const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
      const { subject, body } = buildPasswordResetEmail({
        userName: user.name,
        resetUrl,
      });

      try {
        await this.notifications.dispatch(NOTIFICATION_CHANNELS.EMAIL, {
          to: user.email,
          subject,
          body,
        });
      } catch (err) {
        console.error('Failed to send password reset email:', err);
      }
    }

    return {
      message:
        'If an account exists with this email address, instructions have been sent to reset your password.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ status: string }> {
    let payload: { userId: string; email: string };
    try {
      payload = this.tokenService.verifyPasswordResetToken(dto.token);
    } catch {
      throw new BadRequestException(
        'This password reset link is invalid or has expired',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user || user.email !== payload.email) {
      throw new BadRequestException(
        'This password reset link is invalid or has expired',
      );
    }

    const newHash = await this.passwordService.hash(dto.password);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return { status: 'ok' };
  }
}
