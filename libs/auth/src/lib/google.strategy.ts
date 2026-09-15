import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { AppConfigService } from '@cairn/shared-config';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: AppConfigService) {
    super({
      clientID: config.get('GOOGLE_OAUTH_CLIENT_ID'),
      clientSecret: config.get('GOOGLE_OAUTH_CLIENT_SECRET'),
      callbackURL: config.get('GOOGLE_OAUTH_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(
        new Error('Google profile did not include an email address'),
        undefined,
      );
      return;
    }
    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      name: profile.displayName,
    };
    done(null, googleProfile);
  }
}
