import { EVENT_TYPES } from '@cairn/shared-constants';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRuleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsIn(Object.values(EVENT_TYPES))
  eventType!: string;

  // Shape: { when: { daysUntil: { field, lte?, gte? } }, then: [{ action, channel, priority }] }
  // See libs/rules-engine's RuleDefinition -- validated defensively at evaluation time, not here.
  @IsObject()
  definition!: Record<string, unknown>;

  @IsOptional()
  isActive?: boolean;
}
