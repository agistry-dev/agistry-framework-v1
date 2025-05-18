import { AdapterClient } from './client';
import { AdapterId, AdapterContext, AdapterConfig } from './types';

export class AdapterExecutor {
  private client: AdapterClient;

  constructor(config: AdapterConfig) {
    this.client = new AdapterClient(config);
  }

  async runBeforeLLM(
    input: string,
    adapterIds: AdapterId[],
    context: AdapterContext = {}
  ): Promise<{ prompt: string; context: AdapterContext }> {
    let currentInput = input;
    const updatedContext = { ...context };

    for (const adapterId of adapterIds) {
      const { output, status, data, error } = await this.client.callAdapter(
        adapterId,
        currentInput,
        updatedContext
      );

      if (status === 'error') {
        throw new Error(`Adapter ${adapterId} failed: ${error}`);
      }

      if (output) {
        currentInput = output;
      }

      if (data) {
        Object.assign(updatedContext, data);
      }
    }

    return { prompt: currentInput, context: updatedContext };
  }

  async runAfterLLM(
    context: AdapterContext,
    adapterIds: AdapterId[]
  ): Promise<void> {
    for (const adapterId of adapterIds) {
      const { status, error } = await this.client.callAdapter(
        adapterId,
        null,
        context
      );

      if (status === 'error') {
        throw new Error(`Post-LLM adapter ${adapterId} failed: ${error}`);
      }
    }
  }

  // Convenience method to run multiple adapters in parallel
  async runParallel(
    input: string | null,
    adapterIds: AdapterId[],
    context: AdapterContext = {}
  ): Promise<AdapterContext> {
    const results = await this.client.batchCallAdapters(adapterIds, input, context);
    
    const updatedContext = { ...context };
    results.forEach((result, index) => {
      if (result.status === 'error') {
        throw new Error(`Adapter ${adapterIds[index]} failed: ${result.error}`);
      }
      if (result.data) {
        Object.assign(updatedContext, result.data);
      }
    });

    return updatedContext;
  }
} 