import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  override getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const token =
      (req.query?.token as string) || (req.query?.inviteToken as string);
    const from = req.query?.from as string;

    const stateObj: Record<string, string> = {};
    if (token) stateObj.token = token;
    if (from) stateObj.from = from;

    if (Object.keys(stateObj).length > 0) {
      return {
        state: Buffer.from(JSON.stringify(stateObj)).toString('base64url'),
      };
    }
    return {};
  }
}
