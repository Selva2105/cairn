import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { GoogleStrategy } from './google.strategy';
import { HouseholdRoleGuard } from './household-role.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  providers: [
    JwtStrategy,
    GoogleStrategy,
    TokenService,
    PasswordService,
    JwtAuthGuard,
    HouseholdRoleGuard,
  ],
  exports: [TokenService, PasswordService, JwtAuthGuard, HouseholdRoleGuard],
})
export class CairnAuthModule {}
