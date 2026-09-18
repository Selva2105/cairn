import { Module } from '@nestjs/common';
import { CairnAuthModule } from '@cairn/auth';
import { CairnNotificationsModule } from '@cairn/notifications';

import { ConnectorsModule } from '../connectors/connectors.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [CairnAuthModule, CairnNotificationsModule, ConnectorsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
