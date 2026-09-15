import { EVENT_TYPES } from '@cairn/shared-constants';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateManualEventDto {
  @IsIn(Object.values(EVENT_TYPES))
  type!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  externalId?: string;
}
