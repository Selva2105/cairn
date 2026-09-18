import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AccessTokenPayload } from '@cairn/auth';
import { JwtAuthGuard } from '@cairn/auth';
import type { EventLog } from '@cairn/database';
import type { PendingEvent, PipelineRunSummary } from '@cairn/pipeline';

import { CurrentUser } from '../common/current-user.decorator';
import { HouseholdService } from '../household/household.service';
import { CreateManualEventDto } from './dto/create-manual-event.dto';
import { EventsService } from './events.service';

@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly householdService: HouseholdService,
  ) {}

  @Get()
  async list(
    @Param('householdId') householdId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<EventLog[]> {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.eventsService.list(householdId);
  }

  @Get('review')
  async listNeedingReview(
    @Param('householdId') householdId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<PendingEvent[]> {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.eventsService.listNeedingReview(householdId);
  }

  @Post(':eventId/approve')
  async approve(
    @Param('householdId') householdId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<PipelineRunSummary> {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.eventsService.approveReview(householdId, eventId);
  }

  @Post(':eventId/dismiss')
  async dismiss(
    @Param('householdId') householdId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ status: 'ok' }> {
    await this.householdService.requireMembership(user.sub, householdId);
    await this.eventsService.dismissReview(householdId, eventId);
    return { status: 'ok' };
  }

  @Post()
  async create(
    @Param('householdId') householdId: string,
    @Body() dto: CreateManualEventDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<EventLog> {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.eventsService.recordManualEvent(householdId, dto);
  }
}
