import 'dotenv/config';
export * from './types';
export * from './client';
export * from './executor';
export * from './adapterRegistry';
export * from './healthManager';

// Re-export commonly used types for convenience
export type {
  AdapterId,
  AdapterType,
  AdapterContext,
  AdapterRequest,
  AdapterResponse,
  AdapterConfig,
  HealthStatus,
  AdapterHealth,
  SystemHealth
} from './types';

// Default export
export { AdapterClient as default } from './client';
