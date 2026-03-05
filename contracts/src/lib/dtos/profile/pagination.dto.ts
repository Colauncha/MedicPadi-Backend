import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class PaginationDto {
  @ApiProperty()
  @IsNumber()
  limit?: number = 10;

  @ApiProperty()
  @IsNumber()
  page?: number = 1;
}
