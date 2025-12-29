import { AIProvider } from '../types';
import { addAPIKey, getPrimaryKey } from './modelRegistry';
import { populateAvailableModels } from './modelDiscovery';
import { healthCheckAllProviders } from './enhancedAPICaller';

// Environment variable configuration
interface EnvConfig {
  [key: string]: {
    provider: AIProvider;
    keyEnvVar: string;
    isPrimary?: boolean;
  };
}

// Environment variable mappings
const ENV_CONFIG: EnvConfig = {
  'GOOGLE_API_KEY_1': { provider: AIProvider.GOOGLE, keyEnvVar: 'GOOGLE_API_KEY_1', isPrimary: true },
  'GOOGLE_API_KEY_2': { provider: AIProvider.GOOGLE, keyEnvVar: 'GOOGLE_API_KEY_2' },
  'OPENAI_API_KEY_1': { provider: AIProvider.OPENAI, keyEnvVar: 'OPENAI_API_KEY_1', isPrimary: true },
  'OPENAI_API_KEY_2': { provider: AIProvider.OPENAI, keyEnvVar: 'OPENAI_API_KEY_2' },
  'ANTHROPIC_API_KEY_1': { provider: AIProvider.ANTHROPIC, keyEnvVar: 'ANTHROPIC_API_KEY_1', isPrimary: true },
  'ANTHROPIC_API_KEY_2': { provider: AIProvider.ANTHROPIC, keyEnvVar: 'ANTHROPIC_API_KEY_2' },
};

// Load API keys from environment variables
export function loadAPIKeysFromEnvironment(): void {
  console.log('🔍 Loading API keys from environment variables...');
  
  let keysLoaded = 0;
  
  Object.entries(ENV_CONFIG).forEach(([id, config]) => {
    const apiKey = process.env[config.keyEnvVar];
    
    if (apiKey && apiKey.trim() !== '') {
      console.log(`✅ Found ${config.provider} API key: ${id}`);
      
      addAPIKey({
        id,
        key: apiKey.trim(),
        provider: config.provider,
        isPrimary: config.isPrimary || false
      });
      
      keysLoaded++;
    } else {
      console.log(`⚠️ No API key found for ${config.keyEnvVar}`);
    }
  });
  
  console.log(`🎉 Loaded ${keysLoaded} API keys from environment`);
}

// Initialize the model registry with environment keys
export async function initializeModelRegistry(): Promise<void> {
  console.log('🚀 Initializing Model Registry...');
  
  try {
    // Step 1: Load API keys from environment
    loadAPIKeysFromEnvironment();
    
    // Step 2: Populate available models for all keys
    await populateAvailableModels();
    
    // Step 3: Perform health checks
    console.log('🏥 Performing health checks on all providers...');
    const healthResults = await healthCheckAllProviders();
    
    Object.entries(healthResults).forEach(([provider, isHealthy]) => {
      const status = isHealthy ? '✅ Healthy' : '❌ Unhealthy';
      console.log(`${status}: ${provider}`);
    });
    
    console.log('🎉 Model Registry initialization complete!');
    console.log('🔄 Multi-model support is now active.');
    
  } catch (error) {
    console.error('❌ Failed to initialize Model Registry:', error);
    throw error;
  }
}

// Get initialization status
export function getInitializationStatus(): {
  isInitialized: boolean;
  providersConfigured: AIProvider[];
  totalKeys: number;
  primaryKeys: string[];
} {
  const providers = new Set<AIProvider>();
  const primaryKeys: string[] = [];
  let totalKeys = 0;
  
  // This would need access to the registry
  // For now, return a basic status
  return {
    isInitialized: false, // Would be determined by actual initialization state
    providersConfigured: Array.from(providers),
    totalKeys,
    primaryKeys
  };
}

// Auto-refresh models (can be called periodically)
export async function refreshModels(): Promise<void> {
  console.log('🔄 Refreshing model registry...');
  
  try {
    await populateAvailableModels();
    console.log('✅ Model registry refreshed successfully');
  } catch (error) {
    console.error('❌ Failed to refresh model registry:', error);
  }
}

// Export a function that can be called at startup
export const startupHook = initializeModelRegistry;

// Also export individual functions for more granular control
export {
  loadAPIKeysFromEnvironment as loadEnvKeys,
  populateAvailableModels as populateModels,
  healthCheckAllProviders as checkHealth
};