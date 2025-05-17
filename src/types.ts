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

export interface AdapterConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
} 