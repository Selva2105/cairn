import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TokenService } from '@cairn/auth';
import { Prisma, PrismaService, type HouseholdMember } from '@cairn/database';
import {
  buildHouseholdInviteEmail,
  NotificationDispatchService,
} from '@cairn/notifications';
import { NOTIFICATION_CHANNELS } from '@cairn/shared-constants';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  emailVerifiedAt: true,
  createdAt: true,
} as const;

const householdWithMembers = Prisma.validator<Prisma.HouseholdDefaultArgs>()({
  include: { members: { include: { user: { select: SAFE_USER_SELECT } } } },
});

export type HouseholdWithMembers = Prisma.HouseholdGetPayload<
  typeof householdWithMembers
>;

@Injectable()
export class HouseholdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly notifications: NotificationDispatchService,
  ) {}

  findById(householdId: string): Promise<HouseholdWithMembers | null> {
    return this.prisma.household.findUnique({
      where: { id: householdId },
      ...householdWithMembers,
    });
  }

  async requireMembership(
    userId: string,
    householdId: string,
  ): Promise<HouseholdMember> {
    const membership = await this.prisma.householdMember.findUnique({
      where: { householdId_userId: { householdId, userId } },
    });
    if (!membership) {
      throw new NotFoundException('Household not found');
    }
    return membership;
  }

  /**
   * Checked against the membership row for *this* householdId, not the JWT's `role` claim --
   * that's only scoped to whichever household was active at login/refresh and can't be
   * trusted for a different household a route references.
   */
  async requireOwnerMembership(
    userId: string,
    householdId: string,
  ): Promise<HouseholdMember> {
    const membership = await this.requireMembership(userId, householdId);
    if (membership.role !== 'OWNER') {
      throw new ForbiddenException('Only the household owner can do this');
    }
    return membership;
  }

  createInvite(householdId: string): string {
    return this.tokenService.signInviteToken(householdId);
  }

  /**
   * Public-facing (no membership check) so an invitee can see which household they're being
   * asked to join before they've even signed up -- called from the un-guarded
   * HouseholdInvitePreviewController.
   */
  async previewInvite(token: string): Promise<{ householdName: string }> {
    let householdId: string;
    try {
      ({ householdId } = this.tokenService.verifyInviteToken(token));
    } catch {
      throw new BadRequestException(
        'This invite link is invalid or has expired',
      );
    }

    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
      select: { name: true },
    });
    if (!household) {
      throw new NotFoundException('Household not found');
    }
    return { householdName: household.name };
  }

  async sendInviteEmail(params: {
    to: string;
    householdName: string;
    inviterName: string;
    token: string;
  }): Promise<void> {
    const appUrl = process.env.WEB_APP_ORIGIN ?? 'http://localhost:4200';
    const { subject, body } = buildHouseholdInviteEmail({
      householdName: params.householdName,
      inviterName: params.inviterName,
      joinUrl: `${appUrl}/join?token=${params.token}`,
    });
    await this.notifications.dispatch(NOTIFICATION_CHANNELS.EMAIL, {
      to: params.to,
      subject,
      body,
    });
  }

  joinWithInvite(userId: string, token: string): Promise<HouseholdMember> {
    let householdId: string;
    try {
      ({ householdId } = this.tokenService.verifyInviteToken(token));
    } catch {
      throw new BadRequestException(
        'This invite link is invalid or has expired',
      );
    }
    return this.prisma.householdMember.upsert({
      where: { householdId_userId: { householdId, userId } },
      update: {},
      create: { householdId, userId, role: 'MEMBER' },
    });
  }
}
