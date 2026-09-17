import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  type?: string;

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
