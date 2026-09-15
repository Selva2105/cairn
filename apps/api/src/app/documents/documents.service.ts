import { Injectable, NotFoundException } from '@nestjs/common';
import type { Document } from '@cairn/database';
import { PrismaService } from '@cairn/database';

import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(householdId: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { householdId },
      orderBy: { expiresOn: 'asc' },
    });
  }

  async get(householdId: string, id: string): Promise<Document> {
    const document = await this.prisma.document.findFirst({
      where: { id, householdId },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  create(householdId: string, dto: CreateDocumentDto): Promise<Document> {
    return this.prisma.document.create({
      data: {
        householdId,
        type: dto.type,
        label: dto.label,
        expiresOn: new Date(dto.expiresOn),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async update(
    householdId: string,
    id: string,
    dto: UpdateDocumentDto,
  ): Promise<Document> {
    await this.get(householdId, id); // 404s if it doesn't belong to this household
    return this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.label ? { label: dto.label } : {}),
        ...(dto.expiresOn ? { expiresOn: new Date(dto.expiresOn) } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async remove(householdId: string, id: string): Promise<void> {
    await this.get(householdId, id);
    await this.prisma.document.delete({ where: { id } });
  }
}
