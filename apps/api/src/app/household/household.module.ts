import { Module } from '@nestjs/common';
import { CairnAuthModule } from '@cairn/auth';
import { CairnNotificationsModule } from '@cairn/notifications';

import { UsersModule } from '../users/users.module';
import { HouseholdInvitePreviewController } from './household-invite-preview.controller';
import { HouseholdController } from './household.controller';
import { HouseholdService } from './household.service';

@Module({
  imports: [CairnAuthModule, CairnNotificationsModule, UsersModule],
  controllers: [HouseholdController, HouseholdInvitePreviewController],
  providers: [HouseholdService],
  exports: [HouseholdService],
})
export class HouseholdModule {}
