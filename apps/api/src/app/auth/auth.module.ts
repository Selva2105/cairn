import { Module } from '@nestjs/common';
import { CairnAuthModule } from '@cairn/auth';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [CairnAuthModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
