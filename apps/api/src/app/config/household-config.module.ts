import { Module } from '@nestjs/common';
import { PrismaModule } from '@cairn/database';

import { HouseholdModule } from '../household/household.module';
import { HouseholdConfigController } from './household-config.controller';
import { HouseholdConfigService } from './household-config.service';

@Module({
  imports: [PrismaModule, HouseholdModule],
  controllers: [HouseholdConfigController],
  providers: [HouseholdConfigService],
  exports: [HouseholdConfigService],
})
export class HouseholdConfigModule {}
