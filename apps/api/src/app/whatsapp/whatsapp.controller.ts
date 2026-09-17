import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { AccessTokenPayload } from '@cairn/auth';
import { JwtAuthGuard } from '@cairn/auth';
import { AppConfigService } from '@cairn/shared-config';
import type { Request } from 'express';

import { CurrentUser } from '../common/current-user.decorator';
import { HouseholdService } from '../household/household.service';
import { SimulateWhatsAppDto } from './dto/simulate-whatsapp.dto';
import { verifyMetaSignature } from './verify-meta-signature';
import type { InboundMessage, SimulationResult } from './whatsapp.service';
import { WhatsAppService } from './whatsapp.service';

interface VerifyQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

@Controller()
export class WhatsAppController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly config: AppConfigService,
    private readonly householdService: HouseholdService,
  ) {}

  // Meta's one-time setup handshake.
  @Get('webhooks/whatsapp')
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

  // Every inbound message/status callback afterward from Meta.
  @Post('webhooks/whatsapp')
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

    const message = extractInboundMessage(req.body);
    if (message) {
      await this.whatsAppService.handleInboundMessage(message);
    }

    return { status: 'ok' };
  }

  // Local interactive simulator endpoint (protected by JWT auth)
  @Post('households/:householdId/whatsapp/simulate')
  @UseGuards(JwtAuthGuard)
  async simulate(
    @Param('householdId') householdId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SimulateWhatsAppDto,
  ): Promise<SimulationResult> {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.whatsAppService.simulate(householdId, dto.text, dto.buttonId);
  }
}

export function extractInboundMessage(body: unknown): InboundMessage | null {
  const value = (body as { entry?: { changes?: { value?: unknown }[] }[] })
    ?.entry?.[0]?.changes?.[0]?.value as
    | {
        messages?: {
          from?: string;
          type?: string;
          text?: { body?: string };
          interactive?: {
            type?: string;
            button_reply?: { id?: string; title?: string };
            list_reply?: { id?: string; title?: string; description?: string };
          };
        }[];
      }
    | undefined;

  const message = value?.messages?.[0];
  if (!message || !message.from) {
    return null;
  }

  // 1. Text messages
  if (message.type === 'text' && message.text?.body) {
    return { from: message.from, text: message.text.body };
  }

  // 2. Interactive Quick Reply Buttons
  if (
    message.type === 'interactive' &&
    message.interactive?.type === 'button_reply' &&
    message.interactive.button_reply?.id
  ) {
    return {
      from: message.from,
      text: message.interactive.button_reply.title ?? '',
      buttonId: message.interactive.button_reply.id,
    };
  }

  // 3. Interactive List Menus
  if (
    message.type === 'interactive' &&
    message.interactive?.type === 'list_reply' &&
    message.interactive.list_reply?.id
  ) {
    return {
      from: message.from,
      text: message.interactive.list_reply.title ?? '',
      buttonId: message.interactive.list_reply.id,
    };
  }

  return null;
}
