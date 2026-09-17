import { Module } from '@nestjs/common';
import { CairnNotificationsModule } from '@cairn/notifications';
import { CairnPipelineModule } from '@cairn/pipeline';

import { HouseholdConfigModule } from '../config/household-config.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [
    CairnPipelineModule,
    CairnNotificationsModule,
    HouseholdConfigModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
})
export class WhatsAppModule {}
