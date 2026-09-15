import type { Role } from '@cairn/shared-constants';

export interface AccessTokenPayload {
  sub: string; // user id
  householdId: string;
  role: Role;
}
