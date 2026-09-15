import {
  BadRequestException,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AccessTokenPayload } from '@cairn/auth';
import { JwtAuthGuard } from '@cairn/auth';
import { memoryStorage } from 'multer';

import { CurrentUser } from '../common/current-user.decorator';
import { HouseholdService } from '../household/household.service';
import { ReceiptsService } from './receipts.service';

const MAX_RECEIPT_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB -- a phone photo, not a scanned PDF

@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/receipts')
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly householdService: HouseholdService,
  ) {}

  @Post('scan')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_RECEIPT_IMAGE_BYTES },
    }),
  )
  async scan(
    @Param('householdId') householdId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    if (!file) {
      throw new BadRequestException(
        'No image uploaded -- expected a multipart "image" field',
      );
    }
    const { wasNew, event } = await this.receiptsService.scanAndRecord(
      householdId,
      file.buffer,
    );
    return { status: wasNew ? 'recorded' : 'duplicate', event };
  }
}
