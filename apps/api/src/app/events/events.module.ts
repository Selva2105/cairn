import { Module } from '@nestjs/common';
import { CairnAuthModule } from '@cairn/auth';
import { CairnPipelineModule } from '@cairn/pipeline';

import { HouseholdModule } from '../household/household.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [CairnAuthModule, HouseholdModule, CairnPipelineModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
