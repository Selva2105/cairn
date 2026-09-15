import { Injectable, NotFoundException } from '@nestjs/common';
import { toDomainEventType } from '@cairn/domain';
import type { EventType } from '@cairn/shared-constants';
import { Prisma, PrismaService, type Rule } from '@cairn/database';

import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  list(householdId: string): Promise<Rule[]> {
    return this.prisma.rule.findMany({
      where: { householdId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(householdId: string, id: string): Promise<Rule> {
    const rule = await this.prisma.rule.findFirst({
      where: { id, householdId },
    });
    if (!rule) {
      throw new NotFoundException('Rule not found');
    }
    return rule;
  }

  create(householdId: string, dto: CreateRuleDto): Promise<Rule> {
    return this.prisma.rule.create({
      data: {
        householdId,
        name: dto.name,
        eventType: toDomainEventType(dto.eventType as EventType),
        definition: dto.definition as Prisma.InputJsonValue,
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async update(
    householdId: string,
    id: string,
    dto: UpdateRuleDto,
  ): Promise<Rule> {
    await this.get(householdId, id);
    return this.prisma.rule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.definition !== undefined
          ? { definition: dto.definition as Prisma.InputJsonValue }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(householdId: string, id: string): Promise<void> {
    await this.get(householdId, id);
    await this.prisma.rule.delete({ where: { id } });
  }
}
