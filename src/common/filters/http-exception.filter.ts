import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ExceptionResponse =
  | string
  | {
      message?: unknown;
      code?: unknown;
      [key: string]: unknown;
    };

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal server error';
    let errorCode = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseContent = exception.getResponse() as ExceptionResponse;

      if (typeof responseContent === 'string') {
        message = responseContent;
        errorCode = exception.name;
      } else if (responseContent && typeof responseContent === 'object') {
        const responseObject = responseContent;
        if (
          typeof responseObject.message === 'string' ||
          Array.isArray(responseObject.message)
        ) {
          message = responseObject.message;
        } else {
          message = responseObject;
        }
        if (typeof responseObject.code === 'string') {
          errorCode = responseObject.code;
        } else {
          errorCode = exception.name;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = exception.name;
    }

    this.logger.error(
      `${request.method} ${request.url} ${status} ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      code: errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
