import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AppConfigService } from '@cairn/shared-config';
import type { Request } from 'express';

@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-cron-secret'];
    if (provided !== this.config.get('CRON_SECRET')) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
