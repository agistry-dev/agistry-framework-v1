import { adapterRegistry } from './adapterRegistry';

export type AdapterId = keyof typeof adapterRegistry;
export type AdapterType = (typeof adapterRegistry)[AdapterId]['type'];

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

export interface AdapterConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  retry?: Partial<RetryConfig>;
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