import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus(): Record<string, unknown> {
    return {
      status: 'AI agent service is running',
      uptime: new Date(process.uptime() * 1000).toISOString().slice(11, 19),
      timestamp: new Date().toISOString(),
    };
  }
}
