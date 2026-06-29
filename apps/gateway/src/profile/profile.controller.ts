import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { Multer } from 'multer';
import { ProfileService } from './profile.service';
import {
  ProfileDtoType,
  UpdateProfileDtoType,
  CreateAdminDto,
  CreateDoctorDto,
  CreatePatientDto,
  CreatePharmacyDto,
  CreateLaboratoryDto,
  UpdateAdminDto,
  UpdateDoctorDto,
  UpdatePatientDto,
  UpdatePharmacyDto,
  UpdateLaboratoryDto,
  AuthRole,
  BusinessHoursDto,
  PaginationDto,
  SettingsDto,
  UpdateDoctorEducationDto,
} from '@medicpadi-backend/contracts';
import { AuthGuard, RequestWithUser } from '../guards/auth/auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CloudinaryService } from '@medicpadi-backend/utils';
import { Roles } from '../guards/decorators/roles.decorator';

@ApiTags('Profile')
@ApiBearerAuth('access-token')
@Controller('profile')
@ApiExtraModels(
  CreateAdminDto,
  CreateDoctorDto,
  CreatePatientDto,
  CreatePharmacyDto,
  CreateLaboratoryDto,
  UpdateAdminDto,
  UpdateDoctorDto,
  UpdatePatientDto,
  UpdatePharmacyDto,
  UpdateLaboratoryDto,
)
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a profile',
    description:
      'Creates a role-specific profile for the authenticated user. The request body shape varies by role: use `CreatePatientDto`, `CreateDoctorDto`, `CreatePharmacyDto`, `CreateLaboratoryDto`, or `CreateAdminDto`.',
  })
  @ApiResponse({ status: 201, description: 'Profile created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or profile already exists.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  create(@Body() createProfileDto: ProfileDtoType) {
    return this.profileService.create(createProfileDto);
  }

  @Get()
  @Roles(
    AuthRole.ADMIN,
    AuthRole.PATIENT,
    AuthRole.CONSULTANT,
    AuthRole.LAB,
    AuthRole.PHARMACY,
  )
  @ApiOperation({
    summary: 'List all profiles',
    description:
      'Returns a paginated list of profiles. Accessible by `admin` and `patient` roles.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of profiles.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions — admin or patient role required.',
  })
  findAll(@Query() query: PaginationDto) {
    return this.profileService.findAll(query);
  }

  @Get('retrieve')
  @ApiOperation({
    summary: 'Get own profile',
    description: "Returns the authenticated user's own profile.",
  })
  @ApiResponse({
    status: 200,
    description: "The authenticated user's profile.",
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  retrieve(@Req() request: RequestWithUser) {
    return this.profileService.retrieve(request.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a profile by ID',
    description:
      'Returns a single profile by its ID. Pass the `role` query parameter to look up the correct profile type.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the profile to retrieve.' })
  @ApiQuery({
    name: 'role',
    required: false,
    description:
      'Role type of the profile (e.g. `consultant`, `patient`, `pharmacy`, `lab`).',
  })
  @ApiResponse({ status: 200, description: 'Profile found.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  findOne(@Param('id') id: string, @Query('role') role: string) {
    return this.profileService.findOne(id, role);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update own profile',
    description:
      "Updates the authenticated user's profile. The request body shape varies by role: use the appropriate `Update*Dto` for the account type.",
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  update(
    @Body() updateProfileDto: UpdateProfileDtoType,
    @Req() request: RequestWithUser,
  ) {
    return this.profileService.update(request.user, updateProfileDto);
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete own profile',
    description: "Permanently deletes the authenticated user's profile.",
  })
  @ApiResponse({ status: 200, description: 'Profile deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  remove(@Req() request: RequestWithUser) {
    return this.profileService.remove(request.user.id);
  }

  @Post('/profile-picture')
  @ApiOperation({
    summary: 'Upload a profile picture',
    description:
      'Uploads a profile picture for the authenticated user. Accepted formats: PNG, JPEG, WebP. Maximum file size: 2 MB. Returns the Cloudinary `public_id` and `url` of the uploaded image.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file (PNG, JPEG, or WebP — max 2 MB).',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Profile picture uploaded. Returns `{ public_id, url }`.',
  })
  @ApiResponse({
    status: 400,
    description: 'File missing, wrong format, or exceeds 2 MB.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @UseInterceptors(FileInterceptor('image'))
  async updateProfilePicture(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(png|jpeg|webp)$/ }),
        ],
      }),
    )
    image: Express.Multer.File,
    @Req() request: RequestWithUser,
  ) {
    let imageUrlObj: { public_id: string; url: string } | any = null;
    try {
      imageUrlObj = await this.cloudinaryService.uploadImage(image);
    } catch (error) {
      throw new BadRequestException('Failed to upload image');
    }
    if (!imageUrlObj) {
      throw new BadRequestException('Failed to upload image');
    }
    imageUrlObj = {
      public_id: imageUrlObj.public_id,
      url: imageUrlObj.secure_url,
    };
    const update = await this.profileService.update(request.user, {
      profilePicture: imageUrlObj,
    });
    return update
      ? imageUrlObj
      : new BadRequestException('Failed to update profile picture');
  }

  @Patch('/settings')
  @ApiOperation({
    summary: 'Update account settings',
    description:
      'Updates notification preferences, theme, and MFA setting for the authenticated user. All fields are optional.',
  })
  @ApiResponse({ status: 200, description: 'Settings updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  async updateSettings(
    @Body() settingsDto: SettingsDto,
    @Req() request: RequestWithUser,
  ) {
    return this.profileService.updateSettings(request.user, settingsDto);
  }

  @Patch('/education')
  @Roles(AuthRole.CONSULTANT)
  @ApiOperation({
    summary: 'Update education history',
    description:
      'Replaces the education history for the authenticated consultant. Sends the full list of entries — each update overwrites the previous list.',
  })
  @ApiResponse({ status: 200, description: 'Education updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions — consultant role required.',
  })
  async updateEducation(
    @Body() educationDto: UpdateDoctorEducationDto,
    @Req() request: RequestWithUser,
  ) {
    return this.profileService.updateEducation(
      request.user,
      educationDto.education,
    );
  }

  @Patch('/business-hours')
  @Roles(AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB, AuthRole.ADMIN)
  @ApiOperation({
    summary: 'Update business hours',
    description:
      'Sets or updates the operating hours for a provider account. Accessible by `consultant`, `pharmacy`, `lab`, and `admin` roles.',
  })
  @ApiResponse({ status: 200, description: 'Business hours updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions — provider or admin role required.',
  })
  async updateBusinessHours(
    @Body() businessHoursDto: BusinessHoursDto,
    @Req() request: RequestWithUser,
  ) {
    return this.profileService.updateBusinessHours(
      request.user,
      businessHoursDto,
    );
  }
}
