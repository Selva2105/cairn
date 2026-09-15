import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TokenService } from '@cairn/auth';
import { Prisma, PrismaService, type HouseholdMember } from '@cairn/database';

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

  joinWithInvite(userId: string, token: string): Promise<HouseholdMember> {
    const { householdId } = this.tokenService.verifyInviteToken(token);
    return this.prisma.householdMember.upsert({
      where: { householdId_userId: { householdId, userId } },
      update: {},
      create: { householdId, userId, role: 'MEMBER' },
    });
  }
}
