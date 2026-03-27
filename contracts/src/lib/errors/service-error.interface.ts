export interface ServiceError {
  statusCode: number;
  message: string;
  error?: string | string[];
}
