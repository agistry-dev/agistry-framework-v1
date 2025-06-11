import { AdapterRequest, AdapterResponse, AdapterConfig, AdapterId, AdapterContext, RetryConfig } from './types';
import { isValidAdapterId } from './adapterRegistry';
import { HealthManager } from './healthManager';

export class AdapterClient {
  private config: AdapterConfig;
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds max
    backoffMultiplier: 2
  };
  private healthManager: HealthManager;

  constructor(config: AdapterConfig) {
    this.config = {
      timeout: 30000,  // Default 30s timeout
      ...config
    };
    this.healthManager = new HealthManager(this);

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

        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (!this.shouldRetry(error, attempt, retryConfig.maxAttempts)) {
          break;
        }

        if (attempt < retryConfig.maxAttempts) {
          const delay = this.getRetryDelay(attempt, retryConfig);
          console.log(`Retrying ${adapterId} in ${delay}ms (attempt ${attempt}/${retryConfig.maxAttempts})`);
          await this.sleep(delay);
        }
      }
    }

    // If we get here, all retries failed
    return {
      status: 'error',
      error: lastError instanceof Error ? lastError.message : 'Unknown error occurred'
    };
  }

  // Batch adapter execution
  async batchCallAdapters(
    adapterIds: AdapterId[],
    input: string | null,
    context: AdapterContext = {}
  ): Promise<AdapterResponse[]> {
    return Promise.all(
      adapterIds.map(adapterId => this.callAdapter(adapterId, input, context))
    );
  }

  // Health check methods
  getHealthManager(): HealthManager {
    return this.healthManager;
  }

  async checkHealth(): Promise<void> {
    await this.healthManager.checkSystemHealth();
  }

  startHealthMonitoring(interval?: number): void {
    this.healthManager.startMonitoring(interval);
  }

  stopHealthMonitoring(): void {
    this.healthManager.stopMonitoring();
  }
} 