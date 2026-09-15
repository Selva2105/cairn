import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AccessTokenPayload } from '@cairn/auth';
import { JwtAuthGuard } from '@cairn/auth';

import { CurrentUser } from '../common/current-user.decorator';
import { HouseholdService } from '../household/household.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly householdService: HouseholdService,
  ) {}

  @Get()
  async list(
    @Param('householdId') householdId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.tasksService.list(householdId);
  }

  @Post()
  async create(
    @Param('householdId') householdId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.tasksService.create(householdId, dto);
  }

  @Patch(':id')
  async update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.tasksService.update(householdId, id, dto);
  }

  // Owner-only: any member can be assigned a task and update its own status, but removing a
  // task outright is a household-management action, not a personal one. Checked against the
  // membership row freshly loaded for *this* householdId -- not the JWT's `role` claim, which
  // is only scoped to whichever household was active at login/refresh and can't be trusted for
  // a different householdId in the URL.
  @Delete(':id')
  async remove(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const membership = await this.householdService.requireMembership(
      user.sub,
      householdId,
    );
    if (membership.role !== 'OWNER') {
      throw new ForbiddenException('Only the household owner can delete tasks');
    }
    await this.tasksService.remove(householdId, id);
    return { status: 'ok' };
  }
}
