import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { AppConfigService } from '@cairn/shared-config';
import { COOKIES } from '@cairn/shared-constants';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AccessTokenPayload } from './types';

function extractFromCookie(req: Request): string | null {
  return req?.cookies?.[COOKIES.ACCESS_TOKEN] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: AccessTokenPayload): AccessTokenPayload {
    return payload;
  }
}
