import { Module } from '@nestjs/common';
import { CairnAuthModule } from '@cairn/auth';

import { HouseholdModule } from '../household/household.module';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';

@Module({
  imports: [CairnAuthModule, HouseholdModule],
  controllers: [RulesController],
  providers: [RulesService],
})
export class RulesModule {}
