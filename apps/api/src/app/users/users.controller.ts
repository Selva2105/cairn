import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@cairn/auth';
import type { AccessTokenPayload } from '@cairn/auth';

import { CurrentUser } from '../common/current-user.decorator';
import { type PublicUserProfile, UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<PublicUserProfile | null> {
    return this.usersService.findPublicProfile(user.sub);
  }
}
