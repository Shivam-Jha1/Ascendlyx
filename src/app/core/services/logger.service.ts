import { environment } from '../../../environments/environment';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LogLevelValues: { [key in LogLevel]: number } = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private currentLogLevel: number = LogLevelValues[environment.logLevel as LogLevel] || 0;

  log(message: string, data?: any): void {
    this.logMessage('info', message, data);
  }

  debug(message: string, data?: any): void {
    this.logMessage('debug', message, data);
  }

  warn(message: string, data?: any): void {
    this.logMessage('warn', message, data);
  }

  error(message: string, error?: any): void {
    this.logMessage('error', message, error);
  }

  private logMessage(level: LogLevel, message: string, data?: any): void {
    const levelValue = LogLevelValues[level];

    if (levelValue < this.currentLogLevel && !environment.production) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, message, data || '');
        break;
      case 'info':
        console.info(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        break;
    }
  }
}

import { Injectable } from '@angular/core';
