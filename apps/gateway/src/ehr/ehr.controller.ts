import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { EhrService } from './ehr.service';
import { DocumentConverterService } from './document-converter.service';
import {
  AuthRole,
  CreateEhrRecordDto,
  UpdateEhrRecordDto,
  CreateConsentGrantDto,
  UpdateConsentGrantDto,
  PaginationDto,
  EhrSourceType,
} from '@medicpadi-backend/contracts';
import { AuthGuard } from '../guards/auth/auth.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { CloudinaryService } from '@medicpadi-backend/utils';

const SOURCE_TYPE_FOLDER: Record<EhrSourceType, string> = {
  [EhrSourceType.APPOINTMENT]: 'medicpadi/appointment',
  [EhrSourceType.LAB_RESULT]: 'medicpadi/lab',
  [EhrSourceType.PRESCRIPTION]: 'medicpadi/prescription',
  [EhrSourceType.UPLOAD]: 'medicpadi/upload',
};

@Controller('ehr')
@UseGuards(AuthGuard)
export class EhrController {
  constructor(
    private readonly ehrService: EhrService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly documentConverterService: DocumentConverterService,
  ) {}

  // EHR Records

  @Post('/records')
  @Roles(AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        patient_id: { type: 'string', format: 'uuid' },
        provider_id: { type: 'string', format: 'uuid' },
        source_type: { type: 'string', enum: Object.values(EhrSourceType) },
        source_id: { type: 'string', format: 'uuid' },
        content_encrypted: { type: 'string' },
        document_url: { type: 'string', description: 'Link to an existing document' },
        document: { type: 'string', format: 'binary', description: 'PDF, DOC, or DOCX file (max 20 MB)' },
      },
      required: ['patient_id', 'source_type'],
    },
  })
  @UseInterceptors(FileInterceptor('document', { storage: memoryStorage() }))
  async createRecord(
    @Body() dto: CreateEhrRecordDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType:
              /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/,
          }),
        ],
      }),
    )
    document?: Express.Multer.File,
  ) {
    if (document) {
      let fileToUpload = document;

      if (this.documentConverterService.needsConversion(document)) {
        const pdfBuffer = await this.documentConverterService.convertToPdf(document);
        fileToUpload = {
          ...document,
          buffer: pdfBuffer,
          mimetype: 'application/pdf',
          originalname: document.originalname.replace(/\.(doc|docx)$/i, '.pdf'),
          size: pdfBuffer.length,
        };
      }

      const folder = SOURCE_TYPE_FOLDER[dto.source_type] ?? 'medicpadi/upload';
      try {
        const result = await this.cloudinaryService.uploadDocument(fileToUpload, folder);
        dto.document_url = result.secure_url;
      } catch {
        throw new BadRequestException('Failed to upload document');
      }
    }

    if (!dto.document_url && !dto.content_encrypted) {
      throw new BadRequestException('Provide either a document file, a document_url, or content_encrypted');
    }

    return this.ehrService.createRecord(dto);
  }

  @Get('/records')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  findAllRecords(@Query() query: PaginationDto) {
    return this.ehrService.findAllRecords(query);
  }

  @Get('/records/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  findOneRecord(@Param('id') id: string) {
    return this.ehrService.findOneRecord(id);
  }

  @Patch('/records/:id')
  @Roles(AuthRole.CONSULTANT, AuthRole.ADMIN)
  updateRecord(@Param('id') id: string, @Body() dto: UpdateEhrRecordDto) {
    return this.ehrService.updateRecord(id, dto);
  }

  @Delete('/records/:id')
  @Roles(AuthRole.ADMIN)
  removeRecord(@Param('id') id: string) {
    return this.ehrService.removeRecord(id);
  }

  // Consents

  @Post('/consents')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  createConsent(@Body() dto: CreateConsentGrantDto) {
    return this.ehrService.createConsent(dto);
  }

  @Get('/consents')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  findAllConsents(@Query() query: PaginationDto) {
    return this.ehrService.findAllConsents(query);
  }

  @Get('/consents/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  findOneConsent(@Param('id') id: string) {
    return this.ehrService.findOneConsent(id);
  }

  @Patch('/consents/:id')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  updateConsent(@Param('id') id: string, @Body() dto: UpdateConsentGrantDto) {
    return this.ehrService.updateConsent(id, dto);
  }

  @Delete('/consents/:id')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  revokeConsent(@Param('id') id: string) {
    return this.ehrService.revokeConsent(id);
  }
}
