import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsentGrant } from '../../entities/consent-grant.entity';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConsentGrant])],
  controllers: [ConsentController],
  providers: [ConsentService],
})
export class ConsentModule {}