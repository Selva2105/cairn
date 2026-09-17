import { IsOptional, IsString } from 'class-validator';

export class SimulateWhatsAppDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  buttonId?: string;
}
