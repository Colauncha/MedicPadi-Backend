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
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  RequestConsentDto,
} from '@medicpadi-backend/contracts';
import { AuthGuard, RequestWithUser } from '../guards/auth/auth.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { CloudinaryService } from '@medicpadi-backend/utils';

const SOURCE_TYPE_FOLDER: Record<EhrSourceType, string> = {
  [EhrSourceType.APPOINTMENT]: 'Medicpadi/appointment',
  [EhrSourceType.LAB_RESULT]: 'Medicpadi/lab',
  [EhrSourceType.PRESCRIPTION]: 'Medicpadi/prescription',
  [EhrSourceType.UPLOAD]: 'Medicpadi/upload',
};

@ApiTags('Electronic Health Records')
@ApiBearerAuth('access-token')
@Controller('ehr')
@UseGuards(AuthGuard)
export class EhrController {
  constructor(
    private readonly ehrService: EhrService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly documentConverterService: DocumentConverterService,
  ) {}

  // ──────────────────────────────────────────────
  // EHR Records
  // ──────────────────────────────────────────────

  @Post('/records')
  @Roles(AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Create an EHR record',
    description: `Creates a new Electronic Health Record for a patient. Supply the content as one of:
- A **file upload** (PDF, DOC, or DOCX — max 20 MB). DOC/DOCX files are automatically converted to PDF before storage.
- A **document_url** pointing to an already-hosted document.
- A **content_encrypted** string containing encrypted clinical notes.

At least one of these three must be provided. Accessible by \`consultant\` and \`admin\` roles.`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['patient_id', 'source_type'],
      properties: {
        patient_id: { type: 'string', format: 'uuid', description: 'UUID of the patient this record belongs to.' },
        provider_id: { type: 'string', format: 'uuid', description: 'UUID of the healthcare provider creating the record.' },
        source_type: {
          type: 'string',
          enum: Object.values(EhrSourceType),
          description: 'Origin of the record (appointment, lab_result, prescription, or upload).',
        },
        source_id: { type: 'string', format: 'uuid', description: 'UUID of the related source entity (e.g. appointment ID).' },
        content_encrypted: { type: 'string', description: 'Encrypted clinical notes or structured content.' },
        document_url: { type: 'string', description: 'URL to an already-hosted document (PDF/DOC/DOCX).' },
        document: {
          type: 'string',
          format: 'binary',
          description: 'Document file to upload (PDF, DOC, or DOCX — max 20 MB). DOC/DOCX are auto-converted to PDF.',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'EHR record created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error, unsupported file type, or no content provided.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — consultant or admin role required.' })
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
    document: Express.Multer.File | undefined,
    @Req() req: RequestWithUser,
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

      const folder = SOURCE_TYPE_FOLDER[dto.source_type] ?? 'Medicpadi/upload';
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

    return this.ehrService.createRecord(dto, req.user);
  }

  @Get('/records')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'List EHR records',
    description: 'Returns a paginated list of EHR records. Patients only see their own records. Consultants see records of patients who have granted them active consent (filter by `id` = patient ID). Admins see all. Accessible by `patient`, `consultant`, and `admin` roles.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of EHR records.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  findAllRecords(@Query() query: PaginationDto, @Req() req: RequestWithUser) {
    return this.ehrService.findAllRecords(query, req.user);
  }

  @Get('/records/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Get an EHR record by ID',
    description: 'Returns a single EHR record. Patients may only read their own records; consultants need an active consent grant from the patient. Accessible by `patient`, `consultant`, and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the EHR record.' })
  @ApiResponse({ status: 200, description: 'EHR record found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Record not found.' })
  findOneRecord(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.ehrService.findOneRecord(id, req.user);
  }

  @Patch('/records/:id')
  @Roles(AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Update an EHR record',
    description: 'Updates an existing EHR record. Consultants need an active `full_access` consent grant from the patient. Accessible by `consultant` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the EHR record to update.' })
  @ApiResponse({ status: 200, description: 'Record updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — consultant or admin role required.' })
  @ApiResponse({ status: 404, description: 'Record not found.' })
  updateRecord(
    @Param('id') id: string,
    @Body() dto: UpdateEhrRecordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ehrService.updateRecord(id, dto, req.user);
  }

  @Delete('/records/:id')
  @Roles(AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Delete an EHR record',
    description: 'Permanently removes an EHR record. Accessible by `admin` role only.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the EHR record to delete.' })
  @ApiResponse({ status: 200, description: 'Record deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — admin role required.' })
  @ApiResponse({ status: 404, description: 'Record not found.' })
  removeRecord(@Param('id') id: string) {
    return this.ehrService.removeRecord(id);
  }

  // ──────────────────────────────────────────────
  // Consent Grants
  // ──────────────────────────────────────────────

  @Post('/consents')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Grant EHR access consent',
    description: 'Allows a patient to grant a provider access to their EHR records. For patients, `patient_id` is set from the authenticated user; admins must supply it. Accessible by `patient` and `admin` roles.',
  })
  @ApiResponse({ status: 201, description: 'Consent granted.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — patient or admin role required.' })
  createConsent(@Body() dto: CreateConsentGrantDto, @Req() req: RequestWithUser) {
    return this.ehrService.createConsent(dto, req.user);
  }

  @Post('/consents/request')
  @Roles(AuthRole.CONSULTANT)
  @ApiOperation({
    summary: 'Request access to a patient\'s EHR',
    description:
      'Creates a pending consent grant and notifies the patient (email + in-app) with a link to review it. The patient approves or declines via `POST /ehr/consents/:id/approve` or `/decline`. Accessible by `consultant` role.',
  })
  @ApiResponse({ status: 201, description: 'Access request created and patient notified.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — consultant role required.' })
  @ApiResponse({ status: 409, description: 'Access already granted, or a request is already pending.' })
  requestConsent(@Body() dto: RequestConsentDto, @Req() req: RequestWithUser) {
    return this.ehrService.requestConsent(dto, req.user);
  }

  @Post('/consents/:id/approve')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Approve an EHR access request',
    description:
      'Activates a pending consent grant, giving the requesting provider access at the requested level. Only the patient who owns the request (or an admin) can approve. Accessible by `patient` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the pending consent grant.' })
  @ApiResponse({ status: 201, description: 'Access request approved.' })
  @ApiResponse({ status: 400, description: 'Request is not pending.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Not the owner of this request.' })
  @ApiResponse({ status: 404, description: 'Consent grant not found.' })
  approveConsent(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.ehrService.approveConsent(id, req.user);
  }

  @Post('/consents/:id/decline')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Decline an EHR access request',
    description:
      'Declines a pending consent grant. Only the patient who owns the request (or an admin) can decline. Accessible by `patient` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the pending consent grant.' })
  @ApiResponse({ status: 201, description: 'Access request declined.' })
  @ApiResponse({ status: 400, description: 'Request is not pending.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Not the owner of this request.' })
  @ApiResponse({ status: 404, description: 'Consent grant not found.' })
  declineConsent(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.ehrService.declineConsent(id, req.user);
  }

  @Post('/consents/:id/cancel')
  @Roles(AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Cancel an EHR access request',
    description:
      'Withdraws a pending access request. Only the consultant who made the request (or an admin) can cancel it. Accessible by `consultant` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the pending consent grant.' })
  @ApiResponse({ status: 201, description: 'Access request cancelled.' })
  @ApiResponse({ status: 400, description: 'Request is not pending.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Not the requester of this access request.' })
  @ApiResponse({ status: 404, description: 'Consent grant not found.' })
  cancelConsentRequest(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.ehrService.cancelConsentRequest(id, req.user);
  }

  @Get('/consents')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'List consent grants',
    description: 'Returns a paginated list of EHR consent grants. Patients see grants they have issued; consultants see grants issued to them. Accessible by `patient`, `consultant`, and `admin` roles.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of consent grants.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  findAllConsents(@Query() query: PaginationDto, @Req() req: RequestWithUser) {
    return this.ehrService.findAllConsents(query, req.user);
  }

  @Get('/consents/:id')
  @Roles(AuthRole.PATIENT, AuthRole.CONSULTANT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Get a consent grant by ID',
    description: 'Returns a single consent grant record. Accessible by `patient`, `consultant`, and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the consent grant.' })
  @ApiResponse({ status: 200, description: 'Consent grant found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Consent grant not found.' })
  findOneConsent(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.ehrService.findOneConsent(id, req.user);
  }

  @Patch('/consents/:id')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Update a consent grant',
    description: 'Modifies the scope or expiry of an existing consent grant. Accessible by `patient` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the consent grant to update.' })
  @ApiResponse({ status: 200, description: 'Consent grant updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — patient or admin role required.' })
  @ApiResponse({ status: 404, description: 'Consent grant not found.' })
  updateConsent(
    @Param('id') id: string,
    @Body() dto: UpdateConsentGrantDto,
    @Req() req: RequestWithUser,
  ) {
    return this.ehrService.updateConsent(id, dto, req.user);
  }

  @Delete('/consents/:id')
  @Roles(AuthRole.PATIENT, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Revoke a consent grant',
    description: 'Revokes a previously granted consent, removing provider access to the patient\'s EHR. Accessible by `patient` and `admin` roles.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the consent grant to revoke.' })
  @ApiResponse({ status: 200, description: 'Consent revoked.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions — patient or admin role required.' })
  @ApiResponse({ status: 404, description: 'Consent grant not found.' })
  revokeConsent(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.ehrService.revokeConsent(id, req.user);
  }
}
