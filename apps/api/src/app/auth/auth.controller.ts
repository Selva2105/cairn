import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { GoogleAuthGuard } from '@cairn/auth';
import type { GoogleProfile } from '@cairn/auth';
import { AppConfigService } from '@cairn/shared-config';
import { API_ROUTES, COOKIES } from '@cairn/shared-constants';
import type { Request, Response } from 'express';

import { AuthService, type AuthTokens } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
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
  async googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const profile = req.user as GoogleProfile;
    const tokens = await this.authService.loginWithGoogle(profile);
    this.setAuthCookies(res, tokens);
    return { status: 'ok' };
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
