import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AIProvider } from '../types';

// Safe wrapper for AI API calls with error handling and retries
export interface GenerateContentOptions {
  provider: AIProvider;
  apiKey: string;
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateContentResult {
  success: boolean;
  content: string;
  error?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

// Generate content using the specified AI provider
export async function generateContent(options: GenerateContentOptions): Promise<GenerateContentResult> {
  const { provider, apiKey, model, prompt, maxTokens = 4000, temperature = 0.7 } = options;

  try {
    let response: string;
    let usage: any;

    switch (provider) {
      case AIProvider.OPENAI: {
        const client = new OpenAI({ apiKey });
        const completion = await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature
        });
        response = completion.choices[0]?.message?.content || '';
        usage = {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens
        };
        break;
      }

      case AIProvider.ANTHROPIC: {
        const client = new Anthropic({ apiKey });
        const message = await client.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }]
        });
        response = message.content[0]?.type === 'text' ? message.content[0].text : '';
        usage = message.usage ? {
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens
        } : undefined;
        break;
      }

      case AIProvider.GOOGLE:
      default: {
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model });
        const result = await geminiModel.generateContent(prompt);
        const geminiResponse = await result.response;
        response = geminiResponse.text();
        // Google doesn't provide token usage in the same way
        break;
      }
    }

    return {
      success: true,
      content: response,
      usage
    };
  } catch (error) {
    console.error(`AI generation failed for ${provider} with model ${model}:`, error);
    return {
      success: false,
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Retry wrapper with exponential backoff
export async function generateContentWithRetry(
  options: GenerateContentOptions,
  maxRetries: number = 3
): Promise<GenerateContentResult> {
  let lastResult: GenerateContentResult;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    lastResult = await generateContent(options);

    if (lastResult.success) {
      return lastResult;
    }

    if (attempt < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s...
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return lastResult!;
}
