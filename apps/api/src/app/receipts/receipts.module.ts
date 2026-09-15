import { Module } from '@nestjs/common';
import { CairnAuthModule } from '@cairn/auth';
import { CairnPipelineModule } from '@cairn/pipeline';

import { HouseholdModule } from '../household/household.module';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';

@Module({
  imports: [CairnAuthModule, HouseholdModule, CairnPipelineModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
})
export class ReceiptsModule {}
