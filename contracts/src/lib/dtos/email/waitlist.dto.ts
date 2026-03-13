import { PartialType } from '@nestjs/mapped-types';
import { WelcomeEmailDto } from './welcome.dto';

export class WaitlistEmailDto extends PartialType(WelcomeEmailDto) {}
