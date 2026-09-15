import { randomUUID } from 'node:crypto';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap } from 'rxjs';

const HEADER_NAME = 'x-correlation-id';

/**
 * Generates (or forwards, if already present) a correlation ID for every request, echoed back
 * as a response header and logged on completion -- what makes it possible to trace one
 * request's life end to end across the API, the pipeline, and notification delivery.
 * See ARCHITECTURE.md §12.
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context
      .switchToHttp()
      .getRequest<Request & { correlationId?: string }>();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId =
      request.headers[HEADER_NAME]?.toString() ?? randomUUID();
    request.correlationId = correlationId;
    response.setHeader(HEADER_NAME, correlationId);

    const startedAt = Date.now();
    return next.handle().pipe(
      tap(() => {
        this.logger.log(
          `${correlationId} ${request.method} ${request.originalUrl} ${Date.now() - startedAt}ms`,
        );
      }),
    );
  }
}
