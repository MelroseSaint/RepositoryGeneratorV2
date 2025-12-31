// Example usage of the Enhanced Model Registry System
// This file demonstrates how to integrate the system into your application

import { ModelRegistry } from '../src/services/modelRegistrySystem';
import { AIProvider } from '../src/types';
import { ErrorCategory } from '../src/services/errorHandler';

// 1. Initialize the system at startup
async function initializeApplication() {
  try {
    console.log('🚀 Starting application with Enhanced Model Registry...');
    
    // Initialize the model registry (loads env vars, fetches models, performs health checks)
    await ModelRegistry.initialize();
    
    // Get system status
    const status = await ModelRegistry.getStatus();
    console.log('📊 System Status:', status);
    
    console.log('✅ Application initialized successfully!');
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  }
}

// 2. Example: Generate content with automatic model selection
async function exampleGeneration() {
  try {
    const result = await ModelRegistry.generate(
      AIProvider.GOOGLE,  // Preferred provider
      'gemini-pro-latest',  // Preferred model (optional)
      {
        prompt: 'Explain the benefits of multi-model AI systems.',
        maxTokens: 1000,
        temperature: 0.7
      }
    );
    
    if (result.success) {
      console.log('🎯 Generated content using:', result.model);
      console.log('📝 Content:', result.content);
    } else {
      console.error('❌ Generation failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Generation error:', error);
  }
}

// 3. Example: Get available models for UI
function exampleGetModels() {
  // Get all available models across all providers
  const allModels = ModelRegistry.listModels();
  console.log('🔍 All available models:', allModels);
  
  // Get models for a specific provider
  const googleModels = ModelRegistry.getModels(AIProvider.GOOGLE);
  console.log('🤖 Google models:', googleModels);
}

// 4. Example: Admin operations
async function exampleAdminOperations() {
  // Get detailed system status
  const status = await ModelRegistry.getStatus();
  console.log('📈 System health:', status.systemHealth);
  
  // Get model status for each provider
  const modelStatus = ModelRegistry.getModelStatus();
  modelStatus.forEach(providerStatus => {
    console.log(`🔧 ${providerStatus.provider}:`, {
      totalKeys: providerStatus.totalKeys,
      availableModels: providerStatus.availableModels.length,
      healthyKeys: providerStatus.healthyKeys.length
    });
  });
  
  // Refresh models if needed
  if (modelStatus.some(ps => ps.needsRefresh)) {
    console.log('🔄 Refreshing stale models...');
    await ModelRegistry.refreshModels();
  }
}

// 5. Example: Safe execution with error handling
async function exampleSafeExecution() {
  // Use safe execution wrapper
const result = await ModelRegistry.safe(async () => {
      return await ModelRegistry.generate(AIProvider.OPENAI, 'gpt-4', {
        prompt: 'What is the future of AI?',
        maxTokens: 500
      });
    }, ErrorCategory.API_CALL, { operation: 'example_generation' });
  
  if (result) {
    console.log('✅ Safe execution succeeded');
  } else {
    console.log('⚠️ Safe execution failed, but application continues');
  }
}

// 6. Example: Retry with exponential backoff
async function exampleRetry() {
  try {
    const result = await ModelRegistry.retry(async () => {
      return await ModelRegistry.generate(AIProvider.ANTHROPIC, 'claude-3-5-sonnet-20241022', {
        prompt: 'Explain quantum computing in simple terms.',
        maxTokens: 800
      });
    }, ErrorCategory.API_CALL, { operation: 'retry_example' }, 3, 1000);
    
    console.log('🎯 Retry operation succeeded');
  } catch (error) {
    console.error('❌ Retry operation failed after all attempts:', error);
  }
}

// 7. Example: Environment variable setup
function exampleEnvironmentSetup() {
  console.log('🌍 Environment variables detected:');
  
  const envVars = [
    'GOOGLE_API_KEY',
    'GOOGLE_API_KEY_1',
    'GOOGLE_API_KEY_2',
    'OPENAI_API_KEY',
    'OPENAI_API_KEY_1',
    'OPENAI_API_KEY_2',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_API_KEY_1',
    'ANTHROPIC_API_KEY_2'
  ];
  
  envVars.forEach(envVar => {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: ***${process.env[envVar]!.slice(-4)}`);
    } else {
      console.log(`❌ ${envVar}: Not set`);
    }
  });
}

// Main execution function
async function main() {
  console.log('=' .repeat(60));
  console.log('🎯 Enhanced Model Registry System - Demo');
  console.log('=' .repeat(60));
  
  // Show environment setup
  exampleEnvironmentSetup();
  
  // Initialize the system
  await initializeApplication();
  
  // Show available models
  exampleGetModels();
  
  // Show admin status
  await exampleAdminOperations();
  
  // Try generation (will work if API keys are configured)
  await exampleGeneration();
  
  // Try safe execution
  await exampleSafeExecution();
  
  // Try retry operation
  await exampleRetry();
  
  console.log('=' .repeat(60));
  console.log('🎉 Demo completed successfully!');
  console.log('=' .repeat(60));
}

// Export functions for use in other parts of the application
export {
  initializeApplication,
  exampleGeneration,
  exampleGetModels,
  exampleAdminOperations,
  exampleSafeExecution,
  exampleRetry,
  exampleEnvironmentSetup
};

// Run demo if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}