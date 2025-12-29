// Enhanced Model Registry System - Complete Implementation
// This file provides a centralized, multi-model support system with comprehensive error handling

// Core Registry Components
export * from './modelRegistry';
export * from './modelDiscovery';
export * from './modelSelector';

// Enhanced API Calling
export * from './enhancedAPICaller';

// System Management
export * from './startupHook';
export * from './adminAPI';

// Error Handling & Logging
export * from './errorHandler';

// Re-export commonly used functions for convenience
import { 
  addAPIKey, 
  getAvailableModels, 
  loadFromEnvironment,
  getRegistryStats 
} from './modelRegistry';

import { 
  populateAvailableModels, 
  refreshStaleModels 
} from './modelDiscovery';

import { 
  selectModelWithValidation 
} from './modelSelector';

import { 
  generateContent, 
  healthCheckAllProviders 
} from './enhancedAPICaller';

import { 
  initializeModelRegistry 
} from './startupHook';

import { 
  getModelStatus, 
  getSystemStatus,
  listAllAvailableModels 
} from './adminAPI';

import { 
  logger, 
  safeExecute, 
  withRetry 
} from './errorHandler';

// Main API - Simplified interface for common operations
export const ModelRegistry = {
  // Registry Management
  addKey: addAPIKey,
  getModels: getAvailableModels,
  loadEnvKeys: loadFromEnvironment,
  getStats: getRegistryStats,
  
  // Model Discovery
  populateModels: populateAvailableModels,
  refreshModels: refreshStaleModels,
  
  // Model Selection
  selectModel: selectModelWithValidation,
  
  // API Operations
  generate: generateContent,
  healthCheck: healthCheckAllProviders,
  
  // System Management
  initialize: initializeModelRegistry,
  getStatus: getSystemStatus,
  getModelStatus: getModelStatus,
  listModels: listAllAvailableModels,
  
  // Error Handling
  log: logger,
  safe: safeExecute,
  retry: withRetry
};

// Default export for easy importing
export default ModelRegistry;