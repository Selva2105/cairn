import { Injectable, NotFoundException } from '@nestjs/common';
import type { Document } from '@cairn/database';
import { PrismaService } from '@cairn/database';
import { del, put, get as getBlob } from '@vercel/blob';

import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

export interface DocumentFileDownload {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  fileName: string;
}

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
    const document = await this.get(householdId, id);
    if (document.fileUrl) {
      await del(document.fileUrl);
    }
    await this.prisma.document.delete({ where: { id } });
  }

  async uploadFile(
    householdId: string,
    id: string,
    file: Express.Multer.File,
  ): Promise<Document> {
    const document = await this.get(householdId, id);
    if (document.fileUrl) {
      await del(document.fileUrl); // replacing an existing attachment
    }
    const blob = await put(
      `documents/${householdId}/${id}/${file.originalname}`,
      file.buffer,
      { access: 'private', contentType: file.mimetype, addRandomSuffix: true },
    );
    return this.prisma.document.update({
      where: { id },
      data: {
        fileUrl: blob.url,
        fileName: file.originalname,
        fileSize: file.size,
        fileMimeType: file.mimetype,
      },
    });
  }

  async removeFile(householdId: string, id: string): Promise<Document> {
    const document = await this.get(householdId, id);
    if (document.fileUrl) {
      await del(document.fileUrl);
    }
    return this.prisma.document.update({
      where: { id },
      data: {
        fileUrl: null,
        fileName: null,
        fileSize: null,
        fileMimeType: null,
      },
    });
  }

  async downloadFile(
    householdId: string,
    id: string,
  ): Promise<DocumentFileDownload> {
    const document = await this.get(householdId, id);
    if (!document.fileUrl) {
      throw new NotFoundException('This document has no attached file');
    }
    const result = await getBlob(document.fileUrl, { access: 'private' });
    if (!result || result.statusCode !== 200) {
      throw new NotFoundException('Attached file could not be found');
    }
    return {
      stream: result.stream,
      contentType: document.fileMimeType ?? result.blob.contentType,
      fileName: document.fileName ?? result.blob.pathname,
    };
  }
}
