import { Module } from '@nestjs/common';
import { CairnNotificationsModule } from '@cairn/notifications';
import { CairnPipelineModule } from '@cairn/pipeline';

import { HouseholdConfigModule } from '../config/household-config.module';
import { HouseholdModule } from '../household/household.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [
    CairnPipelineModule,
    CairnNotificationsModule,
    HouseholdConfigModule,
    HouseholdModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
})
export class WhatsAppModule {}
