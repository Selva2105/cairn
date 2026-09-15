import { SetMetadata } from '@nestjs/common';
import type { Role } from '@cairn/shared-constants';

export const ROLES_KEY = 'roles';
export const RequireHouseholdRole = (...roles: Role[]) =>
  SetMetadata(ROLES_KEY, roles);
