import { Logger } from '@nestjs/common';

const isDevelopment = process.env['NODE_ENV'] === 'development';

export function logError(error: unknown, context: string = 'Error'): void {
  if (!isDevelopment) return;

  const logger = new Logger(context);

  if (error instanceof Error) {
    logger.error(`${error.message}\n${error.stack}`);
  } else if (typeof error === 'object' && error !== null) {
    logger.error(JSON.stringify(error, null, 2));
  } else {
    logger.error(String(error));
  }
}
