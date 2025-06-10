import { AdapterClient } from './client';
import { AdapterHealth, HealthStatus, SystemHealth, AdapterId } from './types';
import { adapterRegistry } from './adapterRegistry';

export class HealthManager {
  private client: AdapterClient;
  private healthState: Map<AdapterId, AdapterHealth>;
  private checkInterval?: NodeJS.Timeout;
  private lastSystemCheck?: Date;

  constructor(client: AdapterClient) {
    this.client = client;
    this.healthState = new Map();
  }

  private async checkAdapterHealth(adapterId: AdapterId): Promise<AdapterHealth> {
    const startTime = Date.now();
    
    try {
      const response = await this.client.callAdapter(adapterId, null, { 
        healthCheck: true 
      });

      const latency = Date.now() - startTime;

      if (response.status === 'error') {
        return {
          status: 'unhealthy',
          latency,
          lastCheck: new Date(),
          message: response.error
        };
      }

      // Consider high latency as degraded
      const status: HealthStatus = latency > 1000 ? 'degraded' : 'healthy';

      return {
        status,
        latency,
        lastCheck: new Date(),
        message: status === 'degraded' ? 'High latency detected' : undefined
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkSystemHealth(): Promise<SystemHealth> {
    const adapters = Object.keys(adapterRegistry).reduce((acc, adapterId) => {
      acc[adapterId as AdapterId] = {
        status: 'unhealthy',
        latency: 0,
        lastCheck: new Date(),
        message: 'Not checked yet'
      };
      return acc;
    }, {} as Record<AdapterId, AdapterHealth>);

    let overallStatus: HealthStatus = 'healthy';

    // Check each adapter
    for (const adapterId of Object.keys(adapterRegistry) as AdapterId[]) {
      const health = await this.checkAdapterHealth(adapterId);
      adapters[adapterId] = health;
      this.healthState.set(adapterId, health);

      // Update overall status
      if (health.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (health.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    }

    this.lastSystemCheck = new Date();

    return {
      status: overallStatus,
      adapters,
      timestamp: this.lastSystemCheck
    };
  }

  startMonitoring(interval: number = 60000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Initial check
    this.checkSystemHealth().catch(console.error);

    // Schedule periodic checks
    this.checkInterval = setInterval(() => {
      this.checkSystemHealth().catch(console.error);
    }, interval);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  getAdapterHealth(adapterId: AdapterId): AdapterHealth | undefined {
    return this.healthState.get(adapterId);
  }

  getLastSystemHealth(): SystemHealth | undefined {
    if (!this.lastSystemCheck) return undefined;

    const adapters = Object.keys(adapterRegistry).reduce((acc, adapterId) => {
      const health = this.healthState.get(adapterId as AdapterId);
      acc[adapterId as AdapterId] = health || {
        status: 'unhealthy',
        latency: 0,
        lastCheck: new Date(),
        message: 'Not checked yet'
      };
      return acc;
    }, {} as Record<AdapterId, AdapterHealth>);

    let overallStatus: HealthStatus = 'healthy';

    Object.values(adapters).forEach(health => {
      if (health.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (health.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    });

    return {
      status: overallStatus,
      adapters,
      timestamp: this.lastSystemCheck
    };
  }
} 