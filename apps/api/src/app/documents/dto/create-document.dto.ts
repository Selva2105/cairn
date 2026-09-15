import {
  IsDateString,
  IsEnum,
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
  @IsEnum(DocumentTypeDto)
  type!: DocumentTypeDto;

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
