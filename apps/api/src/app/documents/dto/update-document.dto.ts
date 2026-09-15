import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { DocumentTypeDto } from './create-document.dto';

export class UpdateDocumentDto {
  @IsOptional()
  @IsEnum(DocumentTypeDto)
  type?: DocumentTypeDto;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsDateString()
  expiresOn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
