import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { AppConfigService } from '@cairn/shared-config';
import type { Request } from 'express';

import { verifyMetaSignature } from './verify-meta-signature';
import { WhatsAppService } from './whatsapp.service';

interface VerifyQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

@Controller('webhooks/whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly config: AppConfigService,
  ) {}

  // Meta's one-time setup handshake.
  @Get()
  verify(@Query() query: VerifyQuery): string {
    const verifyToken =
      this.config.get('WHATSAPP_VERIFY_TOKEN') ||
      process.env['WHATSAPP_VERIFY_TOKEN'];
    if (
      query['hub.mode'] === 'subscribe' &&
      verifyToken &&
      query['hub.verify_token'] === verifyToken
    ) {
      return query['hub.challenge'] ?? '';
    }
    throw new ForbiddenException();
  }

  // Every inbound message/status callback afterward.
  @Post()
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
  ): Promise<{ status: string }> {
    const appSecret =
      this.config.get('WHATSAPP_APP_SECRET') ||
      process.env['WHATSAPP_APP_SECRET'];
    if (
      !appSecret ||
      !req.rawBody ||
      !verifyMetaSignature(req.rawBody, signature, appSecret)
    ) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    const message = extractTextMessage(req.body);
    if (message) {
      await this.whatsAppService.handleInboundMessage(message);
    }

    return { status: 'ok' };
  }
}

function extractTextMessage(
  body: unknown,
): { from: string; text: string } | null {
  const value = (body as { entry?: { changes?: { value?: unknown }[] }[] })
    ?.entry?.[0]?.changes?.[0]?.value as
    | {
        messages?: { from?: string; type?: string; text?: { body?: string } }[];
      }
    | undefined;

  const message = value?.messages?.[0];
  if (message?.type !== 'text' || !message.from || !message.text?.body) {
    return null;
  }

  return { from: message.from, text: message.text.body };
}
