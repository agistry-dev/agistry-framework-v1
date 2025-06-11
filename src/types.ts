import { adapterRegistry } from './adapterRegistry';

export type AdapterId = keyof typeof adapterRegistry;
export type AdapterType = (typeof adapterRegistry)[AdapterId]['type'];

// Adapter Discovery Types
export interface AdapterMetadata {
  id: AdapterId;
  type: AdapterType;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface AdapterDiscoveryResponse {
  adapters: AdapterMetadata[];
  total: number;
  timestamp: Date;
}

export type AdapterContext = {
  userId?: string;
  chatId?: string;
  [key: string]: any;
};

export interface AdapterRequest {
  adapterId: AdapterId;
  input: string | null;
  context?: AdapterContext;
}

export interface AdapterResponse {
  output?: string;
  status: 'ok' | 'error';
  data?: any;
  error?: string;
}

// Simple Retry Configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // max delay cap
  backoffMultiplier: number; // for exponential backoff
}

// Health Check Types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface AdapterHealth {
  status: HealthStatus;
  latency: number;
  lastCheck: Date;
  message?: string;
}

export interface SystemHealth {
  status: HealthStatus;
  adapters: Record<AdapterId, AdapterHealth>;
  timestamp: Date;
}

export interface AdapterConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  retry?: Partial<RetryConfig>;
  healthCheck?: {
    enabled: boolean;
    interval: number; // Check interval in ms
    timeout: number; // Health check timeout
  };
}

// Circuit Breaker States
export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  successes: number;
}

// Enhanced Error Types
export class AdapterError extends Error {
  constructor(
    message: string,
    public adapterId: AdapterId,
    public attempt: number,
    public isRetryable: boolean = true,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public adapterId: AdapterId,
    public circuitState: CircuitState
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class MaxRetriesExceededError extends Error {
  constructor(
    message: string,
    public adapterId: AdapterId,
    public totalAttempts: number,
    public lastError?: Error
  ) {
    super(message);
    this.name = 'MaxRetriesExceededError';
  }
} 