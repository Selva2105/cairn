import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { AccessTokenPayload } from '@cairn/auth';
import { GoogleAuthGuard, JwtAuthGuard } from '@cairn/auth';
import type { GoogleProfile } from '@cairn/auth';

import { CurrentUser } from '../common/current-user.decorator';
import { AppConfigService } from '@cairn/shared-config';
import { API_ROUTES, COOKIES } from '@cairn/shared-constants';
import type { Request, Response } from 'express';

import { ConnectorsService } from '../connectors/connectors.service';
import { AuthService, type AuthTokens } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignupDto } from './dto/signup.dto';

const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Catch()
export class OAuthExceptionFilter implements ExceptionFilter {
  catch(_exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const appUrl = process.env.WEB_APP_ORIGIN ?? 'http://localhost:4200';

    if (typeof req.query?.state === 'string') {
      try {
        const decoded = JSON.parse(
          Buffer.from(req.query.state, 'base64url').toString('utf-8'),
        );
        if (decoded.connectorKey) {
          return res.redirect(
            `${appUrl}/dashboard/settings/integrations?error=oauth_denied`,
          );
        }
      } catch {
        // ignore
      }
    }

    return res.redirect(`${appUrl}/login?error=sso_failed`);
  }
}

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
    private readonly connectorsService: ConnectorsService,
  ) {}

  @Post(API_ROUTES.AUTH.SIGNUP)
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signup(dto);
    this.setAuthCookies(res, tokens);
    return { status: 'ok' };
  }

  @Post(API_ROUTES.AUTH.LOGIN)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);
    this.setAuthCookies(res, tokens);
    return { status: 'ok' };
  }

  @Post(API_ROUTES.AUTH.FORGOT_PASSWORD)
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post(API_ROUTES.AUTH.RESET_PASSWORD)
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post(API_ROUTES.AUTH.REFRESH)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[COOKIES.REFRESH_TOKEN];
    if (!raw) {
      throw new UnauthorizedException();
    }
    const tokens = await this.authService.refresh(raw);
    this.setAuthCookies(res, tokens);
    return { status: 'ok' };
  }

  @Post(API_ROUTES.AUTH.LOGOUT)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[COOKIES.REFRESH_TOKEN];
    if (raw) {
      await this.authService.logout(raw);
    }
    const domain = this.config.get('COOKIE_DOMAIN');
    res.clearCookie(COOKIES.ACCESS_TOKEN, { domain });
    res.clearCookie(COOKIES.REFRESH_TOKEN, { domain, path: '/api/auth' });
    return { status: 'ok' };
  }

  @Get(API_ROUTES.AUTH.GOOGLE)
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {
    // Passport redirects to Google; this handler body never runs.
  }

  @Get(API_ROUTES.AUTH.GOOGLE_CALLBACK)
  @UseGuards(GoogleAuthGuard)
  @UseFilters(OAuthExceptionFilter)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const appUrl = this.config.get('WEB_APP_ORIGIN') ?? 'http://localhost:4200';
    try {
      const profile = req.user as GoogleProfile;
      if (!profile) {
        return res.redirect(`${appUrl}/login?error=sso_failed`);
      }

      let inviteToken: string | undefined;
      let redirectPath: string | undefined;

      if (typeof req.query?.state === 'string') {
        try {
          const decoded = JSON.parse(
            Buffer.from(req.query.state, 'base64url').toString('utf-8'),
          );

          if (decoded.connectorKey && decoded.householdId) {
            await this.connectorsService.saveGoogleTokens({
              householdId: decoded.householdId,
              connectorKey: decoded.connectorKey,
              accessToken: profile.accessToken,
              refreshToken: profile.refreshToken,
              email: profile.email,
            });
            return res.redirect(
              `${appUrl}/dashboard/settings/integrations?connected=${decoded.connectorKey.toLowerCase()}`,
            );
          }

          if (typeof decoded.token === 'string') {
            inviteToken = decoded.token;
          }
          if (typeof decoded.from === 'string') {
            redirectPath = decoded.from;
          }
        } catch {
          // Ignore malformed state payload
        }
      }

      const tokens = await this.authService.loginWithGoogle(
        profile,
        inviteToken,
      );
      this.setAuthCookies(res, tokens);

      if (!inviteToken && redirectPath && redirectPath.startsWith('/')) {
        return res.redirect(`${appUrl}${redirectPath}`);
      }

      return res.redirect(`${appUrl}/dashboard/overview`);
    } catch {
      return res.redirect(`${appUrl}/login?error=sso_failed`);
    }
  }

  @Get(API_ROUTES.AUTH.SESSION)
  @UseGuards(JwtAuthGuard)
  session(@CurrentUser() user: AccessTokenPayload): {
    userId: string;
    householdId: string;
    role: string;
  } {
    return { userId: user.sub, householdId: user.householdId, role: user.role };
  }

  private setAuthCookies(res: Response, tokens: AuthTokens): void {
    const domain = this.config.get('COOKIE_DOMAIN');
    const secure = this.config.get('NODE_ENV') === 'production';
    res.cookie(COOKIES.ACCESS_TOKEN, tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      domain,
      maxAge: ACCESS_COOKIE_MAX_AGE_MS,
    });
    res.cookie(COOKIES.REFRESH_TOKEN, tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      domain,
      // Scoped to the whole /api/auth subtree (not just /refresh) so logout can still read
      // and revoke it. The global prefix means this must include `/api`, not just the bare
      // API_ROUTES constant, or browsers/curl never send the cookie back.
      path: '/api/auth',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
  }
}
