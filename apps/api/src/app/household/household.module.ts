import { Module } from '@nestjs/common';
import { CairnAuthModule } from '@cairn/auth';

import { HouseholdController } from './household.controller';
import { HouseholdService } from './household.service';

@Module({
  imports: [CairnAuthModule],
  controllers: [HouseholdController],
  providers: [HouseholdService],
  exports: [HouseholdService],
})
export class HouseholdModule {}
