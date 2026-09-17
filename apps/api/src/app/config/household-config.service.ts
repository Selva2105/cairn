import { Injectable, NotFoundException } from '@nestjs/common';
import type { HouseholdConfig } from '@cairn/database';
import { PrismaService } from '@cairn/database';

import { UpdateConfigDto } from './dto/update-config.dto';

export const DEFAULT_DOCUMENT_TYPES = [
  'PASSPORT',
  'NATIONAL_ID',
  'DRIVERS_LICENSE',
  'INSURANCE',
  'VEHICLE_RC',
  'WARRANTY',
  'REGISTRATION',
  'PROPERTY_LEASE',
  'TAX_RETURN',
  'MEDICAL',
  'OTHER',
];

@Injectable()
export class HouseholdConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateConfig(householdId: string): Promise<HouseholdConfig> {
    const household = await this.prisma.household.findUnique({
      where: { id: householdId },
    });
    if (!household) {
      throw new NotFoundException(`Household ${householdId} not found`);
    }

    const existing = await this.prisma.householdConfig.findUnique({
      where: { householdId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.householdConfig.create({
      data: {
        householdId,
        documentTypes: DEFAULT_DOCUMENT_TYPES,
        currency: 'INR',
        currencySymbol: '₹',
        timezone: 'Asia/Kolkata',
        billReminderDays: [7, 3, 1],
        docReminderDays: [30, 14, 1],
        digestTime: '08:00',
        digestChannel: 'EMAIL',
        defaultTaskPriority: 'MEDIUM',
      },
    });
  }

  async updateConfig(
    householdId: string,
    dto: UpdateConfigDto,
  ): Promise<HouseholdConfig> {
    await this.getOrCreateConfig(householdId);

    return this.prisma.householdConfig.update({
      where: { householdId },
      data: {
        ...(dto.currency !== undefined
          ? { currency: dto.currency.toUpperCase() }
          : {}),
        ...(dto.currencySymbol !== undefined
          ? { currencySymbol: dto.currencySymbol }
          : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.documentTypes !== undefined
          ? {
              documentTypes: dto.documentTypes.map((t) =>
                t.trim().toUpperCase(),
              ),
            }
          : {}),
        ...(dto.billReminderDays !== undefined
          ? { billReminderDays: dto.billReminderDays }
          : {}),
        ...(dto.docReminderDays !== undefined
          ? { docReminderDays: dto.docReminderDays }
          : {}),
        ...(dto.digestTime !== undefined ? { digestTime: dto.digestTime } : {}),
        ...(dto.digestChannel !== undefined
          ? { digestChannel: dto.digestChannel }
          : {}),
        ...(dto.defaultTaskPriority !== undefined
          ? { defaultTaskPriority: dto.defaultTaskPriority }
          : {}),
      },
    });
  }

  async addDocumentType(
    householdId: string,
    rawType: string,
  ): Promise<HouseholdConfig> {
    const config = await this.getOrCreateConfig(householdId);
    const normalized = rawType.trim().toUpperCase().replace(/\s+/g, '_');

    if (config.documentTypes.includes(normalized)) {
      return config;
    }

    return this.prisma.householdConfig.update({
      where: { householdId },
      data: {
        documentTypes: [...config.documentTypes, normalized],
      },
    });
  }

  async removeDocumentType(
    householdId: string,
    rawType: string,
  ): Promise<HouseholdConfig> {
    const config = await this.getOrCreateConfig(householdId);
    const normalized = rawType.trim().toUpperCase();

    const updated = config.documentTypes.filter((t) => t !== normalized);

    return this.prisma.householdConfig.update({
      where: { householdId },
      data: {
        documentTypes: updated.length > 0 ? updated : ['OTHER'],
      },
    });
  }

  async resetDocumentTypes(householdId: string): Promise<HouseholdConfig> {
    await this.getOrCreateConfig(householdId);

    return this.prisma.householdConfig.update({
      where: { householdId },
      data: {
        documentTypes: DEFAULT_DOCUMENT_TYPES,
      },
    });
  }
}
