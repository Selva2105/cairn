import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@cairn/database';

export interface PublicUserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

const PUBLIC_PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  emailVerifiedAt: true,
  createdAt: true,
} as const;

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Never expose the full User record (it carries passwordHash) to a client.
  findPublicProfile(id: string): Promise<PublicUserProfile | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_PROFILE_SELECT,
    });
  }

  async setPhone(id: string, phone: string): Promise<PublicUserProfile> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { phone },
        select: PUBLIC_PROFILE_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION
      ) {
        throw new ConflictException(
          'This phone number is already linked to another account',
        );
      }
      throw error;
    }
  }
}
