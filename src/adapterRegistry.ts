export type AdapterType = 'tool' | 'prompt' | 'action';

export const adapterRegistry = {
  // Document Processing Tools
  'pdf-text-extractor': { type: 'tool' as const },
  
  // Legal Analysis
  'persona-legal': { type: 'prompt' as const },
  'vector-search-legal': { type: 'tool' as const },
  'risk-analyzer': { type: 'tool' as const },
  
  // Notification & Logging
  'slack-sender': { type: 'action' as const },
  'db-logger': { type: 'action' as const },
  'telegram-alert': { type: 'action' as const },
  
} as const;

// Helper function to validate adapter IDs at runtime
export function isValidAdapterId(id: string): id is keyof typeof adapterRegistry {
  return id in adapterRegistry;
}

// Helper function to get adapter type
export function getAdapterType(id: keyof typeof adapterRegistry): AdapterType {
  return adapterRegistry[id].type;
} 