import { AIProvider } from '../types';

// Registry entry for each API key and its supported models
export interface APIKeyEntry {
  id: string; // Unique identifier
  key: string; // The actual API key
  provider: AIProvider;
  models: string[]; // Dynamically populated from ListModels
  isPrimary: boolean; // Flag for primary/secondary
  lastUsed?: Date; // Timestamp of last successful use
  lastFailed?: Date; // Timestamp of last failure
  lastFetched?: Date; // When models were last fetched
}

// Centralized registry for all API keys and their supported models
export const apiKeyRegistry: APIKeyEntry[] = [];

// Cache for available models per provider
export const modelCache = new Map<AIProvider, string[]>();

// Add an API key to the registry
export function addAPIKey(entry: Omit<APIKeyEntry, 'models' | 'lastFetched'>): void {
  const existingIndex = apiKeyRegistry.findIndex(e => e.id === entry.id);
  if (existingIndex >= 0) {
    // Update existing entry
    apiKeyRegistry[existingIndex] = {
      ...apiKeyRegistry[existingIndex],
      ...entry,
      models: apiKeyRegistry[existingIndex].models, // Preserve existing models
      lastFetched: apiKeyRegistry[existingIndex].lastFetched
    };
  } else {
    // Add new entry
    apiKeyRegistry.push({
      ...entry,
      models: [],
      lastFetched: undefined
    });
  }
}

// Remove an API key from the registry
export function removeAPIKey(id: string): void {
  const index = apiKeyRegistry.findIndex(e => e.id === id);
  if (index >= 0) {
    apiKeyRegistry.splice(index, 1);
  }
}

// Get all keys for a specific provider
export function getKeysForProvider(provider: AIProvider): APIKeyEntry[] {
  return apiKeyRegistry.filter(entry => entry.provider === provider);
}

// Get primary key for a provider
export function getPrimaryKey(provider: AIProvider): APIKeyEntry | undefined {
  return apiKeyRegistry.find(entry => entry.provider === provider && entry.isPrimary);
}

// Update models for a specific key
export function updateModelsForKey(keyId: string, models: string[]): void {
  const entry = apiKeyRegistry.find(e => e.id === keyId);
  if (entry) {
    entry.models = models;
    entry.lastFetched = new Date();
  }
}

// Get all available models for a provider (across all keys)
export function getAvailableModels(provider: AIProvider): string[] {
  const cached = modelCache.get(provider);
  if (cached) return cached;

  const models = new Set<string>();
  getKeysForProvider(provider).forEach(entry => {
    entry.models.forEach(model => models.add(model));
  });

  const modelArray = Array.from(models);
  modelCache.set(provider, modelArray);
  return modelArray;
}

// Clear model cache for a provider
export function clearModelCache(provider?: AIProvider): void {
  if (provider) {
    modelCache.delete(provider);
  } else {
    modelCache.clear();
  }
}

// Environment variable utilities
export function loadFromEnvironment(): void {
  const envMappings = {
    'GOOGLE_API_KEY': AIProvider.GOOGLE,
    'GOOGLE_API_KEY_1': AIProvider.GOOGLE,
    'GOOGLE_API_KEY_2': AIProvider.GOOGLE,
    'OPENAI_API_KEY': AIProvider.OPENAI,
    'OPENAI_API_KEY_1': AIProvider.OPENAI,
    'OPENAI_API_KEY_2': AIProvider.OPENAI,
    'ANTHROPIC_API_KEY': AIProvider.ANTHROPIC,
    'ANTHROPIC_API_KEY_1': AIProvider.ANTHROPIC,
    'ANTHROPIC_API_KEY_2': AIProvider.ANTHROPIC,
  };

  Object.entries(envMappings).forEach(([envVar, provider]) => {
    const apiKey = process.env[envVar];
    if (apiKey && apiKey.trim() !== '') {
      const keyId = envVar.toLowerCase();
      const isPrimary = envVar.includes('_1') || !envVar.includes('_');
      
      // Check if key already exists
      const existingIndex = apiKeyRegistry.findIndex(e => e.id === keyId);
      if (existingIndex >= 0) {
        // Update existing key
        apiKeyRegistry[existingIndex].key = apiKey.trim();
        apiKeyRegistry[existingIndex].isPrimary = isPrimary;
      } else {
        // Add new key
        addAPIKey({
          id: keyId,
          key: apiKey.trim(),
          provider,
          isPrimary
        });
      }
      
      console.log(`✅ Loaded ${provider} API key from ${envVar}`);
    }
  });
}

// Get registry statistics
export function getRegistryStats(): {
  totalKeys: number;
  keysByProvider: Record<AIProvider, number>;
  primaryKeys: number;
  keysWithModels: number;
} {
  const stats = {
    totalKeys: apiKeyRegistry.length,
    keysByProvider: {} as Record<AIProvider, number>,
    primaryKeys: apiKeyRegistry.filter(k => k.isPrimary).length,
    keysWithModels: apiKeyRegistry.filter(k => k.models.length > 0).length
  };

  Object.values(AIProvider).forEach(provider => {
    stats.keysByProvider[provider] = getKeysForProvider(provider).length;
  });

  return stats;
}

// Validate API key format
export function validateAPIKey(provider: AIProvider, apiKey: string): boolean {
  if (!apiKey || apiKey.trim() === '') return false;

  const trimmedKey = apiKey.trim();
  
  switch (provider) {
    case AIProvider.GOOGLE:
      // Google API keys are typically 39 characters alphanumeric
      return /^[a-zA-Z0-9_-]{39}$/.test(trimmedKey);
    
    case AIProvider.OPENAI:
      // OpenAI API keys start with 'sk-' and are typically 48-51 characters
      return /^sk-[a-zA-Z0-9]{48,51}$/.test(trimmedKey);
    
    case AIProvider.ANTHROPIC:
      // Anthropic API keys start with 'sk-ant-' and are longer
      return /^sk-ant-[a-zA-Z0-9_-]{90,95}$/.test(trimmedKey);
    
    default:
      return true; // No validation for unknown providers
  }
}

// Export registry to JSON (for backup/restore)
export function exportRegistry(): string {
  const exportData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    registry: apiKeyRegistry.map(entry => ({
      id: entry.id,
      provider: entry.provider,
      isPrimary: entry.isPrimary,
      models: entry.models,
      lastFetched: entry.lastFetched,
      // Note: We don't export the actual API key for security
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}

// Import registry from JSON (requires API keys to be re-added)
export function importRegistry(jsonData: string): { success: boolean; imported: number; errors: string[] } {
  const errors: string[] = [];
  let imported = 0;

  try {
    const data = JSON.parse(jsonData);
    
    if (!data.registry || !Array.isArray(data.registry)) {
      errors.push('Invalid registry format');
      return { success: false, imported: 0, errors };
    }

    data.registry.forEach((entry: any) => {
      try {
        if (entry.id && entry.provider) {
          // Check if entry already exists
          const existingIndex = apiKeyRegistry.findIndex(e => e.id === entry.id);
          if (existingIndex >= 0) {
            // Update existing entry (preserve API key)
            apiKeyRegistry[existingIndex].provider = entry.provider;
            apiKeyRegistry[existingIndex].isPrimary = entry.isPrimary || false;
            apiKeyRegistry[existingIndex].models = entry.models || [];
            apiKeyRegistry[existingIndex].lastFetched = entry.lastFetched ? new Date(entry.lastFetched) : undefined;
          } else {
            // Add new entry without API key (user must provide it)
            addAPIKey({
              id: entry.id,
              key: '', // Empty key - user must provide
              provider: entry.provider,
              isPrimary: entry.isPrimary || false
            });
          }
          imported++;
        }
      } catch (error) {
        errors.push(`Failed to import entry ${entry.id}: ${error}`);
      }
    });

    return { success: imported > 0, imported, errors };
  } catch (error) {
    errors.push(`Failed to parse JSON: ${error}`);
    return { success: false, imported: 0, errors };
  }
}
