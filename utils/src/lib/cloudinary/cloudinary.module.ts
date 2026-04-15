import { Module } from '@nestjs/common';
import { CloudinaryProvider, CLOUDINARY } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';

@Module({
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryProvider, CLOUDINARY, CloudinaryService],
})
export class CloudinaryModule {}
