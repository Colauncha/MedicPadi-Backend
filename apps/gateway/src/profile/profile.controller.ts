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
} from '@medicpadi-backend/contracts';
import { AuthGuard, RequestWithUser } from '../guards/auth/auth.guard';
import { ApiBody, ApiConsumes, ApiExtraModels } from '@nestjs/swagger';
import { CloudinaryService } from '@medicpadi-backend/utils';
import { Roles } from '../guards/decorators/roles.decorator';

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
  create(@Body() createProfileDto: ProfileDtoType) {
    return this.profileService.create(createProfileDto);
  }

  @Get()
  @Roles(AuthRole.ADMIN, AuthRole.PATIENT)
  findAll(@Query() query: PaginationDto) {
    return this.profileService.findAll(query);
  }

  @Get('retrieve')
  retrieve(@Req() request: RequestWithUser) {
    return this.profileService.retrieve(request.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('role') role: string) {
    return this.profileService.findOne(id, role);
  }

  @Patch()
  update(
    @Body() updateProfileDto: UpdateProfileDtoType,
    @Req() request: RequestWithUser,
  ) {
    return this.profileService.update(request.user, updateProfileDto);
  }

  @Delete()
  remove(@Req() request: RequestWithUser) {
    return this.profileService.remove(request.user.id);
  }

  @Post('/profile-picture')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
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

  @Patch('/business-hours')
  @Roles(AuthRole.CONSULTANT, AuthRole.PHARMACY, AuthRole.LAB, AuthRole.ADMIN)
  async updateBusinessHours(
    @Body() businessHoursDto: BusinessHoursDto,
    @Req() request: RequestWithUser,
  ) {
    return this.profileService.updateBusinessHours(
      request.user,
      businessHoursDto,
    );
  }

  // Laboratory specific method

  // @Post('/laboratory/test-offered')
  // @UseGuards(AuthGuard)
  // async addLabTestOffered(
  //   @Body() testOffered: TestOfferedDto,
  //   @Req() request: RequestWithUser,
  // ) {
  //   return this.profileService.addLabTestOffered(request.user.id, testOffered);
  // }
}
