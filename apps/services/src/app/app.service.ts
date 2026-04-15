import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus(): Record<string, any> {
    return {
      status: 'Ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
