import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment'; 

export interface ErrorResponse {
  code: string;
  message: string;
  timestamp: string;
  details?: any;
}

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private logger = inject(LoggerService);

  handleError(error: any): ErrorResponse {
    const errorResponse: ErrorResponse = {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    };

    if (error instanceof HttpErrorResponse) {
      errorResponse.code = `HTTP_${error.status}`;
      errorResponse.message = this.getHttpErrorMessage(error);
      errorResponse.details = error.error;

      this.logger.error(`HTTP Error ${error.status}: ${errorResponse.message}`, error);
    } else if (error instanceof Error) {
      errorResponse.code = 'CLIENT_ERROR';
      errorResponse.message = error.message;
      errorResponse.details = error.stack;

      this.logger.error(`Client Error: ${error.message}`, error);
    } else {
      errorResponse.message = String(error);
      this.logger.error('Unknown Error', error);
    }

    // Send to monitoring service in production
    if (environment.production && environment.enableMonitoring) {
      this.sendToMonitoring(errorResponse);
    }

    return errorResponse;
  }

  private getHttpErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
      return error.error.message;
    }

    switch (error.status) {
      case 400:
        return 'Bad Request';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'Not Found';
      case 408:
        return 'Request Timeout';
      case 429:
        return 'Too Many Requests';
      case 500:
        return 'Internal Server Error';
      case 502:
        return 'Bad Gateway';
      case 503:
        return 'Service Unavailable';
      case 504:
        return 'Gateway Timeout';
      default:
        return `HTTP Error ${error.status}`;
    }
  }

  private sendToMonitoring(error: ErrorResponse): void {
    // Implement integration with Sentry, LogRocket, or similar
    console.log('Sending error to monitoring service:', error);
  }
}
