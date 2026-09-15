import { Injectable, NotFoundException } from '@nestjs/common';
import type { Task } from '@cairn/database';
import { PrismaService } from '@cairn/database';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  list(householdId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { householdId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(householdId: string, id: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: { id, householdId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  create(householdId: string, dto: CreateTaskDto): Promise<Task> {
    return this.prisma.task.create({
      data: {
        householdId,
        description: dto.description,
        ...(dto.assigneeId ? { assigneeId: dto.assigneeId } : {}),
        ...(dto.dueOn ? { dueOn: new Date(dto.dueOn) } : {}),
      },
    });
  }

  async update(
    householdId: string,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    await this.get(householdId, id);
    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.dueOn !== undefined ? { dueOn: new Date(dto.dueOn) } : {}),
      },
    });
  }

  async remove(householdId: string, id: string): Promise<void> {
    await this.get(householdId, id);
    await this.prisma.task.delete({ where: { id } });
  }
}
