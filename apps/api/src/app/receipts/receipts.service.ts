import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { OcrConnector, recognizeText } from '@cairn/connectors-ocr';
import type { DomainEvent } from '@cairn/domain';
import { PipelineService } from '@cairn/pipeline';

export interface ReceiptScanResult {
  wasNew: boolean;
  event: DomainEvent;
}

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);
  private readonly connector = new OcrConnector();

  constructor(private readonly pipeline: PipelineService) {}

  async scanAndRecord(
    householdId: string,
    image: Buffer,
  ): Promise<ReceiptScanResult> {
    const text = await recognizeText(image);

    let event: DomainEvent;
    try {
      event = {
        ...this.connector.normalize({
          externalId: randomUUID(),
          raw: { text },
        }),
        householdId,
      };
    } catch (error) {
      this.logger.warn(
        `Receipt scan for household ${householdId} did not parse: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        'Could not read a bill amount from that photo -- try a clearer shot of the total.',
      );
    }

    const wasNew = await this.pipeline.recordManualEvent(householdId, event);
    return { wasNew, event };
  }
}
