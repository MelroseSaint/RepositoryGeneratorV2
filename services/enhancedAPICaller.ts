import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider } from '../types';
import { selectModelWithValidation, updateKeyUsage } from './modelSelector';
import { performanceMonitor } from './performanceMonitor';

// Enhanced API call configuration
export interface APIConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  enableFallback: boolean;
}

export interface GenerationRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface GenerationResponse {
  content: string;
  model: string;
  provider: AIProvider;
  keyId: string;
  tokensUsed?: number;
  success: boolean;
  error?: string;
}

// Default configuration
const DEFAULT_CONFIG: APIConfig = {
  maxRetries: 2,
  retryDelay: 1000,
  timeout: 30000,
  enableFallback: true
};

// Enhanced API call wrapper with retries and safety
export class EnhancedAPICaller {
  private config: APIConfig;

  constructor(config: Partial<APIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Main generation method with automatic model selection and retries
  async generateContent(
    provider: AIProvider,
    requestedModel?: string,
    request: GenerationRequest = { prompt: '' }
  ): Promise<GenerationResponse> {
    const endMetric = performanceMonitor.start('generateContent');
    
    try {
      // Get the best available model selection
      const selection = selectModelWithValidation(provider, requestedModel);
      
      console.log(`🎯 Using model: ${selection.model} with key: ${selection.keyId} (${provider})`);
      
      // Attempt generation with retries
      const result = await this.attemptGeneration({
        ...selection,
        provider
      }, request);
      
      // Update usage tracking on success
      updateKeyUsage(selection.keyId, true);
      endMetric(true);
      
      return {
        ...result,
        provider,
        keyId: selection.keyId,
        success: true
      };
    } catch (error) {
      endMetric(false);
      console.error(`❌ Generation failed for ${provider}:`, error);
      
      return {
        content: '',
        model: requestedModel || 'unknown',
        provider,
        keyId: 'unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Attempt generation with retry logic
  private async attemptGeneration(
    selection: { apiKey: string; model: string; keyId: string; provider: AIProvider },
    request: GenerationRequest,
    attempt: number = 1
  ): Promise<Omit<GenerationResponse, 'provider' | 'keyId' | 'success'>> {
    try {
      switch (selection.provider) {
        
        case AIProvider.OPENAI:
          return await this.callOpenAI(selection.apiKey, selection.model, request);
        
        case AIProvider.ANTHROPIC:
          return await this.callAnthropic(selection.apiKey, selection.model, request);
        
        case AIProvider.GOOGLE:
        default:
          return await this.callGoogle(selection.apiKey, selection.model, request);
      }
    } catch (error) {
      console.warn(`⚠️ Attempt ${attempt} failed for model ${selection.model}:`, 
                   error instanceof Error ? error.message : error);
      
      // Update usage tracking on failure
      updateKeyUsage(selection.keyId, false);
      
      if (attempt <= this.config.maxRetries) {
        // Wait before retry
        await this.delay(this.config.retryDelay * attempt);
        
        // Try fallback model if enabled and this is the last attempt
        if (attempt === this.config.maxRetries && this.config.enableFallback) {
          console.log(`🔄 Attempting fallback model for ${selection.model}`);
          // Note: In a real implementation, you'd select a different model here
          // For now, we'll retry with the same model
        }
        
        return this.attemptGeneration(selection, request, attempt + 1);
      }
      
      throw error;
    }
  }

  // OpenAI API call
  private async callOpenAI(
    apiKey: string, 
    model: string, 
    request: GenerationRequest
  ): Promise<Omit<GenerationResponse, 'provider' | 'keyId' | 'success'>> {
    const client = new OpenAI({ apiKey });
    
    const messages: any[] = [{ role: 'user', content: request.prompt }];
    if (request.systemPrompt) {
      messages.unshift({ role: 'system', content: request.systemPrompt });
    }

    const completion = await client.chat.completions.create({
      model,
      messages,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
    });

    const content = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens;

    return {
      content,
      model,
      tokensUsed
    };
  }

  // Anthropic API call
  private async callAnthropic(
    apiKey: string, 
    model: string, 
    request: GenerationRequest
  ): Promise<Omit<GenerationResponse, 'provider' | 'keyId' | 'success'>> {
    const client = new Anthropic({ apiKey });
    
    const messages: any[] = [{ role: 'user', content: request.prompt }];
    
    const message = await client.messages.create({
      model,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature || 0.7,
      messages,
      system: request.systemPrompt
    });

    const content = message.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n');

    const tokensUsed = message.usage?.input_tokens + message.usage?.output_tokens;

    return {
      content,
      model,
      tokensUsed
    };
  }

  // Google Gemini API call
  private async callGoogle(
    apiKey: string, 
    model: string, 
    request: GenerationRequest
  ): Promise<Omit<GenerationResponse, 'provider' | 'keyId' | 'success'>> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });
    
    let prompt = request.prompt;
    if (request.systemPrompt) {
      prompt = `${request.systemPrompt}\n\n${request.prompt}`;
    }

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    return {
      content,
      model
    };
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check for a specific provider/model
  async healthCheck(provider: AIProvider, model?: string): Promise<boolean> {
    try {
      // Check if provider has any API keys configured
      const { getKeysForProvider } = await import('./modelRegistry');
      const providerKeys = getKeysForProvider(provider);
      
      if (providerKeys.length === 0) {
        console.log(`⚠️ No API keys configured for ${provider}, skipping health check`);
        return false;
      }
      
      const result = await this.generateContent(provider, model, {
        prompt: 'Hello, this is a health check.',
        maxTokens: 10
      });
      return result.success;
    } catch {
      return false;
    }
  }

  // Batch health check for all configured providers
  async healthCheckAll(): Promise<Record<AIProvider, boolean>> {
    const results: Record<AIProvider, boolean> = {
      [AIProvider.OPENAI]: false,
      [AIProvider.ANTHROPIC]: false,
      [AIProvider.GOOGLE]: false
    };

    const checks = Object.values(AIProvider).map(async (provider) => {
      try {
        results[provider] = await this.healthCheck(provider);
      } catch (error) {
        console.warn(`⚠️ Health check failed for ${provider}:`, error);
        results[provider] = false;
      }
    });

    await Promise.all(checks);
    return results;
  }
}

// Singleton instance for global use
export const apiCaller = new EnhancedAPICaller();

// Convenience functions for backward compatibility
export async function generateContent(
  provider: AIProvider,
  requestedModel?: string,
  request?: GenerationRequest
): Promise<GenerationResponse> {
  return apiCaller.generateContent(provider, requestedModel, request);
}

export async function healthCheckProvider(provider: AIProvider): Promise<boolean> {
  return apiCaller.healthCheck(provider);
}

export async function healthCheckAllProviders(): Promise<Record<AIProvider, boolean>> {
  return apiCaller.healthCheckAll();
}