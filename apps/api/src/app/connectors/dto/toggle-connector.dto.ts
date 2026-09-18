import { IsBoolean } from 'class-validator';

export class ToggleConnectorDto {
  @IsBoolean()
  enabled!: boolean;
}
