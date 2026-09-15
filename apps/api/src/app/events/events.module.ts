import { Module } from '@nestjs/common';
import { CairnAuthModule } from '@cairn/auth';

import { HouseholdModule } from '../household/household.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [CairnAuthModule, HouseholdModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
