import { AIProvider } from '../types';
import { apiKeyRegistry, getKeysForProvider, getAvailableModels } from './modelRegistry';

// Result of model selection
export interface ModelSelection {
  keyId: string;
  apiKey: string;
  provider: AIProvider;
  model: string;
}

// Select the best available model for a given provider
export function selectModel(
  provider: AIProvider,
  requestedModel?: string,
  preferredKeyId?: string
): ModelSelection | null {
  const providerKeys = getKeysForProvider(provider);

  if (providerKeys.length === 0) {
    console.warn(`No API keys configured for provider: ${provider}`);
    return null;
  }

  // If a specific key is preferred, try that first
  if (preferredKeyId) {
    const preferredEntry = providerKeys.find(entry => entry.id === preferredKeyId);
    if (preferredEntry && preferredEntry.models.length > 0) {
      const model = requestedModel && preferredEntry.models.includes(requestedModel)
        ? requestedModel
        : preferredEntry.models[0];

      return {
        keyId: preferredEntry.id,
        apiKey: preferredEntry.key,
        provider,
        model
      };
    }
  }

  // Try to find the requested model across all keys
  if (requestedModel) {
    for (const entry of providerKeys) {
      if (entry.models.includes(requestedModel)) {
        return {
          keyId: entry.id,
          apiKey: entry.key,
          provider,
          model: requestedModel
        };
      }
    }
  }

  // Fallback: use the first available model from any key
  // Prioritize primary keys, then by last successful use
  const sortedKeys = providerKeys
    .filter(entry => entry.models.length > 0)
    .sort((a, b) => {
      // Primary keys first
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;

      // Then by most recent successful use
      const aTime = a.lastUsed?.getTime() || 0;
      const bTime = b.lastUsed?.getTime() || 0;
      return bTime - aTime;
    });

  if (sortedKeys.length > 0) {
    const selectedEntry = sortedKeys[0];
    const fallbackMessage = requestedModel
      ? `Requested model "${requestedModel}" unavailable, falling back to "${selectedEntry.models[0]}"`
      : `Using available model "${selectedEntry.models[0]}"`;

    console.warn(`⚠️ ${fallbackMessage} (key: ${selectedEntry.id})`);

    return {
      keyId: selectedEntry.id,
      apiKey: selectedEntry.key,
      provider,
      model: selectedEntry.models[0]
    };
  }

  console.error(`❌ No valid models available for provider: ${provider}`);
  return null;
}

// Validate if a model is available for a provider
export function isModelAvailable(provider: AIProvider, model: string): boolean {
  const availableModels = getAvailableModels(provider);
  return availableModels.includes(model);
}

// Get all available models for a provider
export function getAllAvailableModels(provider: AIProvider): string[] {
  return getAvailableModels(provider);
}

// Get model selection with validation
export function selectModelWithValidation(
  provider: AIProvider,
  requestedModel?: string,
  preferredKeyId?: string
): ModelSelection {
  const selection = selectModel(provider, requestedModel, preferredKeyId);

  if (!selection) {
    throw new Error(`No valid model selection available for provider: ${provider}`);
  }

  // Log the selection
  console.log(`🎯 Selected model: ${selection.model} with key: ${selection.keyId} (${selection.provider})`);

  return selection;
}

// Update usage tracking for a key
export function updateKeyUsage(keyId: string, success: boolean): void {
  const entry = apiKeyRegistry.find(e => e.id === keyId);
  if (entry) {
    if (success) {
      entry.lastUsed = new Date();
      entry.lastFailed = undefined;
    } else {
      entry.lastFailed = new Date();
    }
  }
}
