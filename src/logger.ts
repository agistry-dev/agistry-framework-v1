import { LogLevel, LogConfig } from './types';

export class Logger {
  private config: LogConfig;
  private static defaultConfig: LogConfig = {
    level: 'info',
    enabled: false
  };

  constructor(config?: Partial<LogConfig>) {
    this.config = {
      ...Logger.defaultConfig,
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled || this.config.level === 'none') return false;
    
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const configIndex = levels.indexOf(this.config.level);
    const messageIndex = levels.indexOf(level);
    
    return messageIndex >= configIndex;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, data);

    if (this.config.customLogger) {
      this.config.customLogger(level, message, data);
      return;
    }

    switch (level) {
      case 'debug':
        console.debug(formattedMessage);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      case 'error':
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  setConfig(config: Partial<LogConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
  }

  getConfig(): LogConfig {
    return { ...this.config };
  }
} 