import { Injectable } from '@nestjs/common';
import { PrismaService } from '@cairn/database';

export interface PublicUserProfile {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

const PUBLIC_PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  emailVerifiedAt: true,
  createdAt: true,
} as const;

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
}
