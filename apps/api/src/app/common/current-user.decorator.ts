import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AccessTokenPayload } from '@cairn/auth';
import type { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AccessTokenPayload }>();
    return request.user;
  },
);
