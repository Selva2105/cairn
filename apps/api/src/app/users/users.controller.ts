import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@cairn/auth';
import type { AccessTokenPayload } from '@cairn/auth';

import { CurrentUser } from '../common/current-user.decorator';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
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

  @Patch('me')
  updateProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<PublicUserProfile> {
    return this.usersService.updateProfile(user.sub, dto.name ?? '');
  }

  @Patch('me/phone')
  setPhone(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdatePhoneDto,
  ): Promise<PublicUserProfile> {
    return this.usersService.setPhone(user.sub, dto.phone);
  }
}
