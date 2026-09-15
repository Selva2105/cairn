import { Module } from '@nestjs/common';
import { CairnAuthModule } from '@cairn/auth';

import { HouseholdModule } from '../household/household.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [CairnAuthModule, HouseholdModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
