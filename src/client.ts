import { AdapterRequest, AdapterResponse, AdapterConfig, AdapterId, AdapterContext } from './types';
import { isValidAdapterId } from './adapterRegistry';

export class AdapterClient {
  private config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = {
      timeout: 30000,  // Default 30s timeout
      ...config
    };
  }

  async callAdapter(
    adapterId: AdapterId,
    input: string | null,
    context: AdapterContext = {}
  ): Promise<AdapterResponse> {
    if (!isValidAdapterId(adapterId)) {
      throw new Error(`Invalid adapter ID: ${adapterId}`);
    }

    const request: AdapterRequest = {
      adapterId,
      input,
      context
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/run-adapter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Adapter ${adapterId} failed: ${error}`);
      }

      return response.json();
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
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
} 