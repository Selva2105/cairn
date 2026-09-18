import { Module } from '@nestjs/common';
import { PrismaModule } from '@cairn/database';
import { CairnPipelineModule } from '@cairn/pipeline';
import { AppConfigModule } from '@cairn/shared-config';

import { HouseholdModule } from '../household/household.module';
import { ConnectorsController } from './connectors.controller';
import { ConnectorsService } from './connectors.service';

@Module({
  imports: [
    HouseholdModule,
    PrismaModule,
    CairnPipelineModule,
    AppConfigModule,
  ],
  controllers: [ConnectorsController],
  providers: [ConnectorsService],
  exports: [ConnectorsService],
})
export class ConnectorsModule {}
