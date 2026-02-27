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
} from '@nestjs/common';
import { Request } from 'express';
import { ProfileService } from './profile.service';
import {
  ProfileDtoType,
  UpdateProfileDtoType,
} from '@medicpadi-backend/contracts';
import { AuthGuard } from '../guards/auth/auth.guard';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  create(@Body() createProfileDto: ProfileDtoType) {
    return this.profileService.create(createProfileDto);
  }

  @Get()
  findAll() {
    return this.profileService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get('retrieve')
  retrieve(@Req() request: Request) {
    return this.profileService.findOne(request.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profileService.findOne(id);
  }

  @UseGuards(AuthGuard)
  @Patch()
  update(
    @Body() updateProfileDto: UpdateProfileDtoType,
    @Req() request: Request,
  ) {
    return this.profileService.update(request.user.id, updateProfileDto);
  }

  @UseGuards(AuthGuard)
  @Delete()
  remove(@Req() request: Request) {
    return this.profileService.remove(request.user.id);
  }
}
