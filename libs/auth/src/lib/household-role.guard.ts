import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@cairn/shared-constants';

import { ROLES_KEY } from './roles.decorator';
import type { AccessTokenPayload } from './types';

@Injectable()
export class HouseholdRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AccessTokenPayload }>();
    const role = request.user?.role;
    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException('Insufficient household role');
    }
    return true;
  }
}
