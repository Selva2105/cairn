import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@cairn/database';
import { AppConfigService } from '@cairn/shared-config';

export interface PublicUserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  whatsappConfigured: boolean;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  // Never expose the full User record (it carries passwordHash) to a client.
  async findPublicProfile(id: string): Promise<PublicUserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_PROFILE_SELECT,
    });
    if (!user) {
      return null;
    }
    return {
      ...user,
      whatsappConfigured: this.isWhatsAppConfigured(),
    };
  }

  async updateProfile(id: string, name: string): Promise<PublicUserProfile> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { name },
      select: PUBLIC_PROFILE_SELECT,
    });
    return {
      ...user,
      whatsappConfigured: this.isWhatsAppConfigured(),
    };
  }

  async setPhone(id: string, phone: string): Promise<PublicUserProfile> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { phone },
        select: PUBLIC_PROFILE_SELECT,
      });
      return {
        ...user,
        whatsappConfigured: this.isWhatsAppConfigured(),
      };
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

  private isWhatsAppConfigured(): boolean {
    const phoneNumberId = this.config.get('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = this.config.get('WHATSAPP_ACCESS_TOKEN');
    return Boolean(phoneNumberId && accessToken);
  }
}
