import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordService, TokenService } from '@cairn/auth';
import type { GoogleProfile } from '@cairn/auth';
import { PrismaService } from '@cairn/database';
import { ERROR_CODES, ROLES, type Role } from '@cairn/shared-constants';

import { LoginDto } from './dto/login.dto';
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

  async loginWithGoogle(profile: GoogleProfile): Promise<AuthTokens> {
    const existingByGoogleId = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (existingByGoogleId) {
      const membership = await this.prisma.householdMember.findFirst({
        where: { userId: existingByGoogleId.id },
      });
      if (!membership) {
        throw new UnauthorizedException(ERROR_CODES.HOUSEHOLD_NOT_FOUND);
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
        data: { googleId: profile.googleId },
      });
      const membership = await this.prisma.householdMember.findFirst({
        where: { userId: linked.id },
      });
      if (!membership) {
        throw new UnauthorizedException(ERROR_CODES.HOUSEHOLD_NOT_FOUND);
      }
      return this.issueTokens(
        linked.id,
        membership.householdId,
        toRole(membership.role),
      );
    }

    const { user, household } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.googleId,
        },
      });
      const createdHousehold = await tx.household.create({
        data: {
          name: `${profile.name}'s Household`,
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
}
