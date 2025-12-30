import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider } from '../types';
import { apiKeyRegistry, updateModelsForKey, clearModelCache } from './modelRegistry';

// Fetch available models for Google Gemini
async function fetchGoogleModels(apiKey: string): Promise<string[]> {
  try {
    // Google Generative AI SDK doesn't have listModels method
    // Return known working models for now
    const knownModels = [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
      'gemini-pro',
      'gemini-pro-vision'
    ];
    
    // For now, return known working models without testing
    // Testing can cause rate limits and errors during initialization
    const workingModels = [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro'
    ];
    
    return workingModels;
  } catch (error) {
    console.error('Failed to fetch Google models:', error);
    // Return fallback models
    return ['gemini-1.5-pro', 'gemini-1.5-flash'];
  }
}

// Fetch available models for OpenAI
async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const client = new OpenAI({ apiKey });
    const models = await client.models.list();
    return models.data
      .filter(model => model.id.includes('gpt')) // Filter to GPT models that support chat
      .map(model => model.id);
  } catch (error) {
    console.error('Failed to fetch OpenAI models:', error);
    return [];
  }
}

// Fetch available models for Anthropic
async function fetchAnthropicModels(apiKey: string): Promise<string[]> {
  try {
    // Anthropic doesn't have a public listModels API, so we'll use known models
    // In a real implementation, you might need to check their API documentation
    // For now, return known working models
    const client = new Anthropic({ apiKey });

    // Test a few known models to see which ones work
    const knownModels = [
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229'
    ];

    const workingModels: string[] = [];

    for (const modelId of knownModels) {
      try {
        // Quick test to see if model exists (without actually generating content)
        await client.messages.create({
          model: modelId,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        });
        workingModels.push(modelId);
      } catch (error) {
        // Model not available, skip
        continue;
      }
    }

    return workingModels;
  } catch (error) {
    console.error('Failed to fetch Anthropic models:', error);
    return [];
  }
}

// Fetch models for a specific provider
async function fetchModelsForProvider(provider: AIProvider, apiKey: string): Promise<string[]> {
  switch (provider) {
    case AIProvider.GOOGLE:
      return await fetchGoogleModels(apiKey);
    case AIProvider.OPENAI:
      return await fetchOpenAIModels(apiKey);
    case AIProvider.ANTHROPIC:
      return await fetchAnthropicModels(apiKey);
    default:
      console.warn(`Unknown provider: ${provider}`);
      return [];
  }
}

// Populate available models for all keys in the registry
export async function populateAvailableModels(): Promise<void> {
  console.log('🔄 Populating available models for all API keys...');

  for (const entry of apiKeyRegistry) {
    if (!entry.key) continue;

    try {
      console.log(`📡 Fetching models for ${entry.provider} key: ${entry.id}`);
      const models = await fetchModelsForProvider(entry.provider, entry.key);

      if (models.length > 0) {
        updateModelsForKey(entry.id, models);
        console.log(`✅ Found ${models.length} models for ${entry.provider}: ${models.join(', ')}`);
      } else {
        console.warn(`⚠️ No models found for ${entry.provider} key: ${entry.id}`);
        updateModelsForKey(entry.id, []);
      }
    } catch (error) {
      console.error(`❌ Failed to fetch models for ${entry.provider} key ${entry.id}:`, error);
      updateModelsForKey(entry.id, []);
    }
  }

  // Clear cache to force refresh
  clearModelCache();
  console.log('🎉 Model registry populated. Dynamic model discovery active.');
}

// Populate models for a specific provider
export async function populateModelsForProvider(provider: AIProvider): Promise<void> {
  const providerKeys = apiKeyRegistry.filter(entry => entry.provider === provider);

  for (const entry of providerKeys) {
    if (!entry.key) continue;

    try {
      const models = await fetchModelsForProvider(provider, entry.key);
      updateModelsForKey(entry.id, models);
    } catch (error) {
      console.error(`Failed to fetch models for ${provider} key ${entry.id}:`, error);
      updateModelsForKey(entry.id, []);
    }
  }

  clearModelCache(provider);
}

// Check if models need refreshing (older than 1 hour)
export function shouldRefreshModels(entry: { lastFetched?: Date }): boolean {
  if (!entry.lastFetched) return true;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return entry.lastFetched < oneHourAgo;
}

// Refresh models for keys that haven't been updated recently
export async function refreshStaleModels(): Promise<void> {
  const staleEntries = apiKeyRegistry.filter(shouldRefreshModels);

  if (staleEntries.length === 0) {
    console.log('📅 All model caches are fresh');
    return;
  }

  console.log(`🔄 Refreshing models for ${staleEntries.length} stale entries...`);

  for (const entry of staleEntries) {
    try {
      const models = await fetchModelsForProvider(entry.provider, entry.key);
      updateModelsForKey(entry.id, models);
    } catch (error) {
      console.error(`Failed to refresh models for ${entry.provider} key ${entry.id}:`, error);
    }
  }

  clearModelCache();
}
