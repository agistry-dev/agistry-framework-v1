import { AdapterRequest, AdapterResponse, AdapterConfig, AdapterId, AdapterContext, RetryConfig, AdapterDiscoveryResponse, LogConfig } from './types';
import { isValidAdapterId } from './adapterRegistry';
import { HealthManager } from './healthManager';
import { Logger } from './logger';

export class AdapterClient {
  private config: AdapterConfig;
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds max
    backoffMultiplier: 2
  };
  private healthManager: HealthManager;
  private logger: Logger;

  constructor(config: AdapterConfig) {
    this.config = {
      timeout: 30000,  // Default 30s timeout
      ...config
    };
    this.healthManager = new HealthManager(this);
    this.logger = new Logger(this.config.logging);

    // Start health monitoring if enabled
    if (this.config.healthCheck?.enabled) {
      this.healthManager.startMonitoring(this.config.healthCheck.interval);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getRetryDelay(attempt: number, retryConfig: RetryConfig): number {
    const delay = retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, retryConfig.maxDelay);
  }

  private shouldRetry(error: any, attempt: number, maxAttempts: number): boolean {
    if (attempt >= maxAttempts) return false;
    
    // Don't retry on 4xx errors (client errors)
    if (error.status >= 400 && error.status < 500) return false;
    
    // Retry on network errors, 5xx errors, timeouts
    return true;
  }

  async callAdapter(
    adapterId: AdapterId,
    input: string | null,
    context: AdapterContext = {}
  ): Promise<AdapterResponse> {
    if (!isValidAdapterId(adapterId)) {
      this.logger.error(`Invalid adapter ID: ${adapterId}`);
      throw new Error(`Invalid adapter ID: ${adapterId}`);
    }

    const retryConfig = { ...this.defaultRetryConfig, ...this.config.retry };
    let lastError: any;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const request: AdapterRequest = {
          adapterId,
          input,
          context
        };

        this.logger.debug(`Calling adapter ${adapterId}`, { request });

        const response = await fetch(`${this.config.baseUrl}/run-adapter`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers
          },
          body: JSON.stringify(request)
        });

        if (!response.ok) {
          const error: any = new Error(`Adapter ${adapterId} failed: ${response.statusText}`);
          error.status = response.status;
          throw error;
        }

        const result = await response.json();
        this.logger.debug(`Adapter ${adapterId} response`, { result });
        return result;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Adapter ${adapterId} attempt ${attempt} failed`, { error });
        
        if (!this.shouldRetry(error, attempt, retryConfig.maxAttempts)) {
          break;
        }

        if (attempt < retryConfig.maxAttempts) {
          const delay = this.getRetryDelay(attempt, retryConfig);
          this.logger.info(`Retrying ${adapterId} in ${delay}ms (attempt ${attempt}/${retryConfig.maxAttempts})`);
          await this.sleep(delay);
        }
      }
    }

    // If we get here, all retries failed
    const errorResponse: AdapterResponse = {
      status: 'error',
      error: lastError instanceof Error ? lastError.message : 'Unknown error occurred'
    };
    this.logger.error(`Adapter ${adapterId} failed after all retries`, { error: errorResponse });
    return errorResponse;
  }

  // Batch adapter execution
  async batchCallAdapters(
    adapterIds: AdapterId[],
    input: string | null,
    context: AdapterContext = {}
  ): Promise<AdapterResponse[]> {
    this.logger.debug('Starting batch adapter execution', { adapterIds, context });
    return Promise.all(
      adapterIds.map(adapterId => this.callAdapter(adapterId, input, context))
    );
  }

  // Health check methods
  getHealthManager(): HealthManager {
    return this.healthManager;
  }

  async checkHealth(): Promise<void> {
    this.logger.debug('Running health check');
    await this.healthManager.checkSystemHealth();
  }

  startHealthMonitoring(interval?: number): void {
    this.logger.info('Starting health monitoring', { interval });
    this.healthManager.startMonitoring(interval);
  }

  stopHealthMonitoring(): void {
    this.logger.info('Stopping health monitoring');
    this.healthManager.stopMonitoring();
  }

  // Adapter Discovery Methods
  async getAvailableAdapters() {
    this.logger.debug('Fetching available adapters');
    const response = await fetch(`${this.config.baseUrl}/adapters`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      }
    });

    if (!response.ok) {
      const error = `Failed to fetch adapters: ${response.statusText}`;
      this.logger.error(error);
      throw new Error(error);
    }

    const adapters = await response.json();
    this.logger.debug('Available adapters', { adapters });
    return adapters;
  }

  async getAdapterInfo(adapterId: AdapterId): Promise<AdapterDiscoveryResponse['adapters'][0] | null> {
    this.logger.debug(`Fetching adapter info for ${adapterId}`);
    if (!isValidAdapterId(adapterId)) {
      const error = `Invalid adapter ID: ${adapterId}`;
      this.logger.error(error);
      throw new Error(error);
    }

    const response = await fetch(`${this.config.baseUrl}/adapters/${adapterId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      }
    });

    if (!response.ok) {
      const error = `Failed to fetch adapter info: ${response.statusText}`;
      this.logger.error(error);
      throw new Error(error);
    }

    const info = await response.json();
    this.logger.debug(`Adapter info for ${adapterId}`, { info });
    return info;
  }

  // Logger methods
  enableLogging(config?: Partial<LogConfig>): void {
    this.logger.setConfig({ enabled: true, ...config });
  }

  disableLogging(): void {
    this.logger.disable();
  }

  getLogger(): Logger {
    return this.logger;
  }
} 