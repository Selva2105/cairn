import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AccessTokenPayload } from '@cairn/auth';
import { JwtAuthGuard } from '@cairn/auth';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { Readable } from 'node:stream';

import { CurrentUser } from '../common/current-user.decorator';
import { HouseholdService } from '../household/household.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentsService } from './documents.service';

const MAX_DOCUMENT_FILE_BYTES = 15 * 1024 * 1024; // 15MB -- a scanned PDF or phone photo

@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly householdService: HouseholdService,
  ) {}

  @Get()
  async list(
    @Param('householdId') householdId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.documentsService.list(householdId);
  }

  @Get(':id')
  async get(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.documentsService.get(householdId, id);
  }

  @Post()
  async create(
    @Param('householdId') householdId: string,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.documentsService.create(householdId, dto);
  }

  @Patch(':id')
  async update(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.documentsService.update(householdId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    await this.documentsService.remove(householdId, id);
    return { status: 'ok' };
  }

  @Post(':id/file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_DOCUMENT_FILE_BYTES },
    }),
  )
  async uploadFile(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    if (!file) {
      throw new BadRequestException(
        'No file uploaded -- expected a multipart "file" field',
      );
    }
    return this.documentsService.uploadFile(householdId, id, file);
  }

  @Get(':id/file')
  async downloadFile(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
    @Res() res: Response,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    const { stream, contentType, fileName } =
      await this.documentsService.downloadFile(householdId, id);
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${fileName.replace(/"/g, '')}"`,
    );
    Readable.fromWeb(stream).pipe(res);
  }

  @Delete(':id/file')
  async removeFile(
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    await this.householdService.requireMembership(user.sub, householdId);
    return this.documentsService.removeFile(householdId, id);
  }
}
