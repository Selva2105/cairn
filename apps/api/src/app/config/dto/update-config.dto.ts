import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateConfigDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5)
  currencySymbol?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  billReminderDays?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  docReminderDays?: number[];

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'digestTime must be in HH:mm format',
  })
  digestTime?: string;

  @IsOptional()
  @IsString()
  @IsIn(['EMAIL', 'WHATSAPP', 'BOTH'])
  digestChannel?: string;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  defaultTaskPriority?: string;
}

export class AddDocumentTypeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  type!: string;
}
