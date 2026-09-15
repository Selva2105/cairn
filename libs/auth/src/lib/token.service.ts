import { createHmac, randomBytes, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '@cairn/shared-config';

import type { AccessTokenPayload } from './types';

export interface IssuedRefreshToken {
  jti: string;
  token: string; // raw value returned to the client -- never stored as-is
  hashedToken: string; // stored in the RefreshToken table
  familyId: string;
  expiresAt: Date;
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwtService.verify<AccessTokenPayload>(token, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Issues a fresh opaque refresh token. Pass the current `familyId` when rotating an
   * existing session so the whole family can be revoked together on reuse detection
   * (ARCHITECTURE.md §10); omit it to start a new family (first login).
   */
  issueRefreshToken(familyId: string = randomUUID()): IssuedRefreshToken {
    const jti = randomUUID();
    const token = randomBytes(48).toString('hex');
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    return {
      jti,
      token,
      hashedToken: this.hashRefreshToken(token),
      familyId,
      expiresAt,
    };
  }

  hashRefreshToken(token: string): string {
    return createHmac('sha256', this.config.get('JWT_REFRESH_SECRET'))
      .update(token)
      .digest('hex');
  }

  signInviteToken(householdId: string): string {
    return this.jwtService.sign(
      { householdId, purpose: 'household-invite' },
      { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: '7d' },
    );
  }

  verifyInviteToken(token: string): { householdId: string } {
    const payload = this.jwtService.verify<{
      householdId: string;
      purpose: string;
    }>(token, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
    });
    if (payload.purpose !== 'household-invite') {
      throw new Error('Invalid invite token');
    }
    return { householdId: payload.householdId };
  }
}
