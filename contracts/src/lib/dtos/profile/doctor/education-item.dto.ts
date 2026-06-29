import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EducationItemDto {
  @ApiProperty()
  @IsString()
  institution!: string;

  @ApiProperty()
  @IsString()
  degree!: string;
}

export class UpdateDoctorEducationDto {
  @ApiProperty({ type: [EducationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationItemDto)
  education!: EducationItemDto[];
}
