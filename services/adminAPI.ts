import { AIProvider } from '../types';
import { apiKeyRegistry, getAvailableModels, getKeysForProvider } from './modelRegistry';
import { healthCheckAllProviders } from './enhancedAPICaller';
import { refreshStaleModels, shouldRefreshModels } from './modelDiscovery';

// Admin interface for model management
export interface ModelStatus {
  provider: AIProvider;
  totalKeys: number;
  primaryKeys: string[];
  availableModels: string[];
  healthyKeys: string[];
  unhealthyKeys: string[];
  lastUpdated?: Date;
  needsRefresh: boolean;
}

export interface SystemStatus {
  isInitialized: boolean;
  totalProviders: number;
  totalKeys: number;
  totalModels: number;
  providers: ModelStatus[];
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  lastHealthCheck?: Date;
}

// Get comprehensive model status for admin UI
export function getModelStatus(): ModelStatus[] {
  const status: ModelStatus[] = [];
  
  Object.values(AIProvider).forEach(provider => {
    const providerKeys = getKeysForProvider(provider);
    const availableModels = getAvailableModels(provider);
    
    // Determine which keys are healthy/unhealthy based on recent usage
    const healthyKeys = providerKeys
      .filter(key => key.lastUsed && !key.lastFailed)
      .map(key => key.id);
    
    const unhealthyKeys = providerKeys
      .filter(key => key.lastFailed && (!key.lastUsed || key.lastFailed > key.lastUsed))
      .map(key => key.id);
    
    const primaryKeys = providerKeys
      .filter(key => key.isPrimary)
      .map(key => key.id);
    
    // Check if any key needs refresh
    const needsRefresh = providerKeys.some(shouldRefreshModels);
    
    status.push({
      provider,
      totalKeys: providerKeys.length,
      primaryKeys,
      availableModels,
      healthyKeys,
      unhealthyKeys,
      lastUpdated: providerKeys.length > 0 
        ? Math.max(...providerKeys.map(k => k.lastFetched?.getTime() || 0))
          ? new Date(Math.max(...providerKeys.map(k => k.lastFetched?.getTime() || 0)))
          : undefined
        : undefined,
      needsRefresh
    });
  });
  
  return status;
}

// Get overall system status
export async function getSystemStatus(): Promise<SystemStatus> {
  const modelStatus = getModelStatus();
  const healthResults = await healthCheckAllProviders();
  
  const totalKeys = apiKeyRegistry.length;
  const totalModels = modelStatus.reduce((sum, status) => sum + status.availableModels.length, 0);
  const totalProviders = modelStatus.filter(status => status.totalKeys > 0).length;
  
  // Determine overall system health
  const healthyProviders = Object.entries(healthResults).filter(([, isHealthy]) => isHealthy).length;
  let systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  
  if (healthyProviders === totalProviders && totalProviders > 0) {
    systemHealth = 'healthy';
  } else if (healthyProviders > 0) {
    systemHealth = 'degraded';
  } else {
    systemHealth = 'unhealthy';
  }
  
  return {
    isInitialized: totalKeys > 0,
    totalProviders,
    totalKeys,
    totalModels,
    providers: modelStatus,
    systemHealth,
    lastHealthCheck: new Date()
  };
}

// List all available models across all providers
export function listAllAvailableModels(): Array<{ provider: AIProvider; models: string[] }> {
  return Object.values(AIProvider)
    .map(provider => ({
      provider,
      models: getAvailableModels(provider)
    }))
    .filter(entry => entry.models.length > 0);
}

// Get models for a specific provider
export function getProviderModels(provider: AIProvider): string[] {
  return getAvailableModels(provider);
}

// Refresh models for a specific provider
export async function refreshProviderModels(provider: AIProvider): Promise<void> {
  console.log(`🔄 Refreshing models for ${provider}...`);
  
  try {
    const { refreshStaleModels } = await import('./modelDiscovery');
    await refreshStaleModels();
    console.log(`✅ Models refreshed for ${provider}`);
  } catch (error) {
    console.error(`❌ Failed to refresh models for ${provider}:`, error);
    throw error;
  }
}

// Admin actions
export interface AdminAction {
  type: 'refresh_models' | 'health_check' | 'clear_cache' | 'remove_key';
  provider?: AIProvider;
  keyId?: string;
}

// Execute admin action
export async function executeAdminAction(action: AdminAction): Promise<{ success: boolean; message: string }> {
  try {
    switch (action.type) {
      case 'refresh_models':
        if (action.provider) {
          await refreshProviderModels(action.provider);
          return { success: true, message: `Models refreshed for ${action.provider}` };
        } else {
          const { refreshStaleModels } = await import('./modelDiscovery');
          await refreshStaleModels();
          return { success: true, message: 'All models refreshed' };
        }
      
      case 'health_check':
        const healthResults = await healthCheckAllProviders();
        const healthyCount = Object.values(healthResults).filter(Boolean).length;
        return { 
          success: true, 
          message: `Health check complete: ${healthyCount}/${Object.keys(healthResults).length} providers healthy` 
        };
      
      case 'clear_cache':
        const { clearModelCache } = await import('./modelRegistry');
        clearModelCache();
        return { success: true, message: 'Model cache cleared' };
      
      case 'remove_key':
        if (action.keyId) {
          const { removeAPIKey } = await import('./modelRegistry');
          removeAPIKey(action.keyId);
          return { success: true, message: `API key ${action.keyId} removed` };
        } else {
          return { success: false, message: 'Key ID required for remove_key action' };
        }
      
      default:
        return { success: false, message: `Unknown action type: ${action.type}` };
    }
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

// Export functions for use in API routes or UI components
export const adminAPI = {
  getModelStatus,
  getSystemStatus,
  listAllAvailableModels,
  getProviderModels,
  refreshProviderModels,
  executeAdminAction
};

// Convenience functions for direct use
export const listAvailableModels = listAllAvailableModels;
export const getModels = getProviderModels;