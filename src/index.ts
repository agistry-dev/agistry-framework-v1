import 'dotenv/config';
export * from './types';
export * from './client';
export * from './executor';
export * from './adapterRegistry';

// Re-export commonly used types for convenience
export type {
  AdapterId,
  AdapterType,
  AdapterContext,
  AdapterRequest,
  AdapterResponse,
  AdapterConfig
} from './types';

// Default export
export { AdapterClient as default } from './client';
