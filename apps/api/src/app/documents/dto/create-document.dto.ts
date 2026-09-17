import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum DocumentTypeDto {
  PASSPORT = 'PASSPORT',
  INSURANCE = 'INSURANCE',
  WARRANTY = 'WARRANTY',
  REGISTRATION = 'REGISTRATION',
  OTHER = 'OTHER',
}

export class CreateDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  type!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsDateString()
  expiresOn!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
