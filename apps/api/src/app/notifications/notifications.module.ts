import { Module } from '@nestjs/common';
import { CairnAuthModule } from '@cairn/auth';

import { HouseholdModule } from '../household/household.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [CairnAuthModule, HouseholdModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
