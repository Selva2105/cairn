import { Matches } from 'class-validator';

export class UpdatePhoneDto {
  // E.164 format, e.g. +14155552671
  @Matches(/^\+[1-9]\d{7,14}$/)
  phone!: string;
}
