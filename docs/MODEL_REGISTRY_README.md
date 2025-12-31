# Enhanced Model Registry System

A comprehensive, production-ready multi-model AI system that provides centralized API key management, dynamic model discovery, intelligent model selection, and robust error handling.

## 🚀 Features

### ✅ Core Functionality
- **Centralized API Key Registry** - Manage multiple API keys per provider
- **Dynamic Model Discovery** - Automatically fetch available models from APIs
- **Intelligent Model Selection** - Smart fallback and load balancing
- **Multi-Provider Support** - Google Gemini, OpenAI, Anthropic Claude
- **Environment Variable Integration** - Automatic loading from `.env` files

### 🛡️ Safety & Reliability
- **Retry Logic with Exponential Backoff** - Automatic recovery from failures
- **Health Monitoring** - Continuous API endpoint health checks
- **Comprehensive Error Handling** - Detailed logging and error reporting
- **Usage Tracking** - Monitor API key performance and usage patterns
- **Validation Engine** - Prevent invalid API calls before they happen

### 📊 Management & Monitoring
- **Admin API** - Complete system status and management interface
- **Real-time Statistics** - Track usage, performance, and errors
- **Export/Import** - Backup and restore registry configurations
- **Logging System** - Multi-level logging with categorization

## 📁 File Structure

```
services/
├── modelRegistry.ts          # Core registry and API key management
├── modelDiscovery.ts         # Dynamic model fetching from APIs
├── modelSelector.ts          # Intelligent model selection logic
├── enhancedAPICaller.ts      # Retry-safe API calling wrapper
├── startupHook.ts            # System initialization and env loading
├── adminAPI.ts               # Admin interface and status reporting
├── errorHandler.ts           # Comprehensive error handling & logging
├── modelRegistrySystem.ts    # Main export file (unified interface)
examples/
└── modelRegistryDemo.ts      # Complete usage examples
```

## 🔧 Quick Start

### 1. Environment Setup

Create a `.env` file with your API keys:

```bash
# Google Gemini API Keys
GOOGLE_API_KEY_1=your_google_api_key_here
GOOGLE_API_KEY_2=your_secondary_google_key

# OpenAI API Keys
OPENAI_API_KEY_1=your_openai_api_key_here
OPENAI_API_KEY_2=your_secondary_openai_key

# Anthropic API Keys
ANTHROPIC_API_KEY_1=your_anthropic_api_key_here
ANTHROPIC_API_KEY_2=your_secondary_anthropic_key
```

### 2. Initialize the System

```typescript
import { ModelRegistry } from './services/modelRegistrySystem';

// Initialize at application startup
await ModelRegistry.initialize();
```

### 3. Generate Content

```typescript
import { AIProvider } from './types';

// Simple generation with automatic model selection
const result = await ModelRegistry.generate(
  AIProvider.GOOGLE,  // Preferred provider
  'gemini-1.5-pro',   // Preferred model (optional)
  {
    prompt: 'Explain quantum computing',
    maxTokens: 1000,
    temperature: 0.7
  }
);

if (result.success) {
  console.log('Generated:', result.content);
  console.log('Used model:', result.model);
  console.log('API key ID:', result.keyId);
} else {
  console.error('Generation failed:', result.error);
}
```

## 📖 Detailed Usage

### Registry Management

```typescript
import { ModelRegistry } from './services/modelRegistrySystem';

// Add API key programmatically
ModelRegistry.addKey({
  id: 'my-google-key',
  key: 'your_api_key_here',
  provider: AIProvider.GOOGLE,
  isPrimary: true
});

// Load keys from environment variables
ModelRegistry.loadEnvKeys();

// Get available models for a provider
const models = ModelRegistry.getModels(AIProvider.GOOGLE);

// Get registry statistics
const stats = ModelRegistry.getStats();
console.log('Total keys:', stats.totalKeys);
console.log('Keys by provider:', stats.keysByProvider);
```

### Model Discovery

```typescript
// Populate models for all configured keys
await ModelRegistry.populateModels();

// Refresh stale models (older than 1 hour)
await ModelRegistry.refreshModels();

// Get detailed model status
const modelStatus = ModelRegistry.getModelStatus();
modelStatus.forEach(status => {
  console.log(`${status.provider}: ${status.availableModels.length} models`);
});
```

### Safe Operations

```typescript
import { ErrorCategory } from './services/errorHandler';

// Safe execution with fallback
const result = await ModelRegistry.safe(
  async () => {
    return await ModelRegistry.generate(AIProvider.OPENAI, 'gpt-4', {
      prompt: 'Generate content',
      maxTokens: 500
    });
  },
  ErrorCategory.API_CALL,
  { operation: 'content_generation' },
  'fallback_content' // Fallback value if operation fails
);

// Retry with exponential backoff
const result = await ModelRegistry.retry(
  async () => {
    return await ModelRegistry.generate(AIProvider.ANTHROPIC, 'claude-3-5-sonnet-20241022', {
      prompt: 'Complex task',
      maxTokens: 2000
    });
  },
  ErrorCategory.API_CALL,
  { operation: 'complex_generation' },
  3,    // max retries
  1000  // base delay in ms
);
```

### Admin Operations

```typescript
// Get comprehensive system status
const systemStatus = await ModelRegistry.getStatus();
console.log('System health:', systemStatus.systemHealth);
console.log('Total models:', systemStatus.totalModels);

// Health check all providers
const healthResults = await ModelRegistry.healthCheck();
console.log('Provider health:', healthResults);

// List all available models
const allModels = ModelRegistry.listModels();
allModels.forEach(provider => {
  console.log(`${provider.provider}: ${provider.models.join(', ')}`);
});
```

### Error Handling & Logging

```typescript
import { logger, ErrorCategory } from './services/errorHandler';

// Manual logging
logger.info(ErrorCategory.SYSTEM, 'Application started');
logger.error(ErrorCategory.API_CALL, 'API call failed', { provider: 'google', model: 'gemini-pro' });

// Error reporting
const errorId = logger.reportError(
  ErrorCategory.MODEL_SELECTION,
  new Error('No models available'),
  { provider: 'openai' },
  'high'
);

// Get error statistics
const stats = logger.getErrorStats();
console.log('Total errors:', stats.total);
console.log('Unresolved errors:', stats.unresolved);

// Get recent logs
const recentLogs = logger.getLogs(LogLevel.ERROR, ErrorCategory.API_CALL, 50);
```

## 🔍 Advanced Configuration

### Custom API Configuration

```typescript
import { EnhancedAPICaller } from './services/enhancedAPICaller';

const customCaller = new EnhancedAPICaller({
  maxRetries: 5,
  retryDelay: 2000,
  timeout: 60000,
  enableFallback: true
});
```

### Model Selection Strategy

The system uses an intelligent selection strategy:

1. **Primary Keys First** - Keys marked as `isPrimary` get priority
2. **Recent Success** - Keys with recent successful usage are preferred
3. **Load Balancing** - Distribute requests across healthy keys
4. **Automatic Fallback** - Switch to backup models/providers on failure

### Environment Variable Priority

```
1. Explicit keys (GOOGLE_API_KEY_1, OPENAI_API_KEY_1, etc.)
2. Generic keys (GOOGLE_API_KEY, OPENAI_API_KEY, etc.)
3. Programmatic keys (added via addAPIKey())
```

## 📊 Monitoring & Analytics

### Real-time Statistics

```typescript
const stats = ModelRegistry.getStats();
/*
{
  totalKeys: 5,
  keysByProvider: {
    google: 2,
    openai: 2,
    anthropic: 1
  },
  primaryKeys: 3,
  keysWithModels: 5
}
*/
```

### Health Monitoring

```typescript
const health = await ModelRegistry.healthCheck();
/*
{
  google: true,
  openai: false,
  anthropic: true
}
*/
```

### Error Analytics

```typescript
const errorStats = logger.getErrorStats();
/*
{
  total: 12,
  unresolved: 3,
  byCategory: {
    api_call: 8,
    model_selection: 2,
    network: 2
  },
  bySeverity: {
    medium: 10,
    high: 2
  },
  byProvider: {
    google: 5,
    openai: 7
  }
}
*/
```

## 🛠️ Integration Examples

### Express.js API Endpoint

```typescript
app.post('/api/generate', async (req, res) => {
  try {
    const { provider, model, prompt } = req.body;
    
    const result = await ModelRegistry.generate(
      provider,
      model,
      { prompt }
    );
    
    if (result.success) {
      res.json({
        content: result.content,
        model: result.model,
        provider: result.provider
      });
    } else {
      res.status(500).json({
        error: result.error,
        message: 'Generation failed'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### React Hook

```typescript
function useModelGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generate = async (provider: AIProvider, prompt: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await ModelRegistry.generate(provider, undefined, { prompt });
      
      if (result.success) {
        return result.content;
      } else {
        setError(result.error || 'Generation failed');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  return { generate, loading, error };
}
```

## 🔒 Security Considerations

- **API Key Protection** - Keys are never logged or exported
- **Input Validation** - All inputs are validated before API calls
- **Rate Limiting** - Built-in retry logic prevents API abuse
- **Error Sanitization** - Sensitive information is stripped from error messages

## 🚀 Production Deployment

### Environment Variables

```bash
# Required
NODE_ENV=production

# Optional - Fine-tune behavior
MODEL_REGISTRY_MAX_RETRIES=3
MODEL_REGISTRY_RETRY_DELAY=1000
MODEL_REGISTRY_TIMEOUT=30000
MODEL_REGISTRY_ENABLE_FALLBACK=true
```

### Monitoring Setup

```typescript
// Set up monitoring in production
if (process.env.NODE_ENV === 'production') {
  // Initialize error reporting
  logger.reportError = (category, error, context, severity) => {
    // Send to your error tracking service (Sentry, etc.)
    errorTracker.captureException(error, { context, severity });
  };
  
  // Initialize metrics
  setInterval(async () => {
    const stats = await ModelRegistry.getStatus();
    metricsCollector.record('model_registry_status', stats);
  }, 60000); // Every minute
}
```

## 📝 API Reference

### ModelRegistry

The main interface for all operations:

```typescript
interface ModelRegistryAPI {
  // Registry Management
  addKey: (entry: APIKeyEntry) => void;
  getModels: (provider: AIProvider) => string[];
  loadEnvKeys: () => void;
  getStats: () => RegistryStats;
  
  // Model Discovery
  populateModels: () => Promise<void>;
  refreshModels: () => Promise<void>;
  
  // Model Selection
  selectModel: (provider: AIProvider, model?: string) => ModelSelection;
  
  // API Operations
  generate: (provider: AIProvider, model?: string, request?: GenerationRequest) => Promise<GenerationResponse>;
  healthCheck: () => Promise<Record<AIProvider, boolean>>;
  
  // System Management
  initialize: () => Promise<void>;
  getStatus: () => Promise<SystemStatus>;
  getModelStatus: () => ModelStatus[];
  listModels: () => Array<{ provider: AIProvider; models: string[] }>;
  
  // Error Handling
  log: Logger;
  safe: <T>(operation: () => Promise<T>, category: ErrorCategory, context?: any, fallback?: T) => Promise<T | undefined>;
  retry: <T>(operation: () => Promise<T>, category: ErrorCategory, context?: any, maxRetries?: number, baseDelay?: number) => Promise<T>;
}
```

## 🤝 Contributing

This system is designed to be extensible. To add a new AI provider:

1. Add the provider to `AIProvider` enum in `types.ts`
2. Add default models in `aiService.ts`
3. Implement fetch function in `modelDiscovery.ts`
4. Add API call logic in `enhancedAPICaller.ts`
5. Update environment variable mappings in `startupHook.ts`

## 📄 License

This implementation follows the same license as the main project.

---

**🎉 Congratulations!** You now have a production-ready, multi-model AI system that provides:

- ✅ **Platform-wide multi-model support**
- ✅ **Safe retries and error handling** 
- ✅ **Dynamic model discovery**
- ✅ **Intelligent fallback mechanisms**
- ✅ **Comprehensive monitoring and logging**
- ✅ **Environment variable integration**
- ✅ **Admin interface for management**

The system guarantees that you'll never request an invalid or unsupported model, and provides robust fallback mechanisms to ensure your application never breaks due to AI provider issues.