import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { RepoConfig, FileNode, FileType, AIProvider, AIConfig, AIModel } from '../types';
import { BlueprintEngine } from './blueprintEngine';
import { performanceMonitor } from './performanceMonitor';

const AI_CONFIG_STORAGE_KEY = 'repogen_ai_config';

// Legacy storage key for backward compatibility
const API_KEY_STORAGE_KEY = 'repogen_gemini_api_key';

// Default AI models for each provider
const DEFAULT_MODELS: Record<AIProvider, AIModel[]> = {
  [AIProvider.OPENAI]: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: AIProvider.OPENAI,
      contextWindow: 128000,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 4096
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: AIProvider.OPENAI,
      contextWindow: 128000,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 4096
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: AIProvider.OPENAI,
      contextWindow: 16385,
      supportsFunctionCalling: true,
      supportsVision: false,
      maxTokens: 4096
    }
  ],
  [AIProvider.ANTHROPIC]: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: AIProvider.ANTHROPIC,
      contextWindow: 200000,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 4096
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      provider: AIProvider.ANTHROPIC,
      contextWindow: 200000,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 4096
    }
  ],
  [AIProvider.GOOGLE]: [
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: AIProvider.GOOGLE,
      contextWindow: 1048576,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 8192
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: AIProvider.GOOGLE,
      contextWindow: 2097152,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 8192
    }
  ]
};

// Legacy functions for backward compatibility
export const getApiKey = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  }
  return null;
};

export const setApiKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  }
};

// New interface for API key entries in the registry
export interface APIKeyEntry {
  id: string; // Unique identifier
  key: string; // The actual API key (externalized)
  isPrimary: boolean; // Flag for primary/secondary
  lastUsed?: Date; // Timestamp of last successful use
  lastFailed?: Date; // Timestamp of last failure
}

// Updated AIConfig to include key registries per provider
export interface AIConfig {
  selectedProvider: AIProvider;
  providers: Record<AIProvider, {
    provider: AIProvider;
    keys: APIKeyEntry[]; // Registry of keys
    models: AIModel[];
  }>;
}

// New AI configuration management
export const getAIConfig = (): AIConfig => {
  if (typeof window === 'undefined') {
    return {
      selectedProvider: AIProvider.GOOGLE,
      providers: {
        [AIProvider.GOOGLE]: {
          provider: AIProvider.GOOGLE,
          keys: [],
          models: DEFAULT_MODELS[AIProvider.GOOGLE]
        },
        [AIProvider.OPENAI]: {
          provider: AIProvider.OPENAI,
          keys: [],
          models: DEFAULT_MODELS[AIProvider.OPENAI]
        },
        [AIProvider.ANTHROPIC]: {
          provider: AIProvider.ANTHROPIC,
          keys: [],
          models: DEFAULT_MODELS[AIProvider.ANTHROPIC]
        }
      }
    };
  }

  const stored = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
  if (stored) {
    try {
      const config = JSON.parse(stored) as AIConfig;
      // Ensure all providers have models and migrate old structure if needed
      Object.keys(config.providers).forEach(provider => {
        const p = provider as AIProvider;
        if (!config.providers[p].models || config.providers[p].models.length === 0) {
          config.providers[p].models = DEFAULT_MODELS[p];
        }
        // Migrate legacy apiKey to keys registry if present
        if ((config.providers[p] as any).apiKey && !config.providers[p].keys.length) {
          config.providers[p].keys = [{
            id: 'legacy-' + p,
            key: (config.providers[p] as any).apiKey,
            isPrimary: true,
            lastUsed: new Date()
          }];
          delete (config.providers[p] as any).apiKey; // Clean up old field
        }
      });
      return config;
    } catch {
      // Fall back to default if parsing fails
    }
  }

  // Check for legacy Gemini key and migrate
  const legacyKey = getApiKey();
  const defaultConfig: AIConfig = {
    selectedProvider: AIProvider.GOOGLE,
    providers: {
      [AIProvider.GOOGLE]: {
        provider: AIProvider.GOOGLE,
        keys: legacyKey ? [{ id: 'legacy-google', key: legacyKey, isPrimary: true, lastUsed: new Date() }] : [],
        models: DEFAULT_MODELS[AIProvider.GOOGLE]
      },
      [AIProvider.OPENAI]: {
        provider: AIProvider.OPENAI,
        keys: [],
        models: DEFAULT_MODELS[AIProvider.OPENAI]
      },
      [AIProvider.ANTHROPIC]: {
        provider: AIProvider.ANTHROPIC,
        keys: [],
        models: DEFAULT_MODELS[AIProvider.ANTHROPIC]
      }
    }
  };

  // Save the default config
  setAIConfig(defaultConfig);
  return defaultConfig;
};

export const setAIConfig = (config: AIConfig): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }
};

export const getSelectedProvider = (): AIProvider => {
  return getAIConfig().selectedProvider;
};

export const setSelectedProvider = (provider: AIProvider): void => {
  const config = getAIConfig();
  config.selectedProvider = provider;
  setAIConfig(config);
};

// New function to select a key based on logic: explicit ID, last-working, or round-robin
const selectKey = (keys: APIKeyEntry[], preferredId?: string): APIKeyEntry | null => {
  if (preferredId) {
    return keys.find(k => k.id === preferredId) || null;
  }
  // Default to last-working (most recent lastUsed)
  const sortedByLastUsed = keys.sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0));
  if (sortedByLastUsed[0]?.lastUsed) return sortedByLastUsed[0];
  // Fallback to primary, then any available
  return keys.find(k => k.isPrimary) || keys[0] || null;
};

// New function to handle retries and failover
const executeWithFailover = async <T>(
  keys: APIKeyEntry[],
  provider: AIProvider,
  models: AIModel[],
  operation: (key: string, modelId: string) => Promise<T>,
  preferredKeyId?: string
): Promise<T | null> => {
  const attemptedKeys: string[] = [];
  for (const keyEntry of keys) {
    if (preferredKeyId && keyEntry.id !== preferredKeyId) continue;
    attemptedKeys.push(keyEntry.id);
    try {
      const modelId = models[0]?.id || '';
      const result = await operation(keyEntry.key, modelId);
      // Update lastUsed on success
      keyEntry.lastUsed = new Date();
      console.log(`AI operation succeeded with key ID: ${keyEntry.id}, model: ${modelId}`);
      return result;
    } catch (error) {
      keyEntry.lastFailed = new Date();
      console.warn(`AI operation failed with key ID: ${keyEntry.id}, model: ${models[0]?.id || ''}, error: ${error.message}`);
    }
  }
  console.error(`All keys failed for provider ${provider}: ${attemptedKeys.join(', ')}`);
  return null;
};

export const getProviderApiKey = (provider: AIProvider): string => {
  const keys = getAIConfig().providers[provider].keys;
  return selectKey(keys)?.key || '';
};

export const setProviderApiKey = (provider: AIProvider, apiKey: string): void => {
  const config = getAIConfig();
  const existingPrimary = config.providers[provider].keys.find(k => k.isPrimary);
  if (existingPrimary) {
    existingPrimary.key = apiKey;
  } else {
    config.providers[provider].keys.push({
      id: 'primary-' + provider,
      key: apiKey,
      isPrimary: true,
      lastUsed: new Date()
    });
  }
  setAIConfig(config);
};

export const getAvailableModels = (provider: AIProvider): AIModel[] => {
  return getAIConfig().providers[provider].models;
};

export interface DetectionResult {
  language: string;
  framework: string;
  suggestedProjectType: string;
  confidence: number;
}

export const detectStack = async (codeSnippet: string, preferredKeyId?: string): Promise<DetectionResult> => {
  const aiConfig = getAIConfig();
  const provider = aiConfig.selectedProvider;
  const keys = aiConfig.providers[provider].keys;
  const models = aiConfig.providers[provider].models;

  if (!keys.length) {
    // Return mock data if no keys
    return {
      language: 'TypeScript',
      framework: 'React',
      suggestedProjectType: 'frontend',
      confidence: 85
    };
  }

  const endMetric = performanceMonitor.start('detectStack');
  try {
    const prompt = `Analyze this code snippet and determine:
1. Primary programming language
2. Framework/library being used
3. Suggested project type (frontend, backend, fullstack, mobile, desktop, cli, library, game, data)
4. Confidence level (0-100)

Code snippet:
${codeSnippet}

Return only a JSON object with keys: language, framework, suggestedProjectType, confidence`;

    const result = await executeWithFailover(
      keys,
      provider,
      models,
      async (key: string, modelId: string) => {
        let response: string;
        switch (provider) {
          case AIProvider.OPENAI: {
            const client = new OpenAI({ apiKey: key });
            const completion = await client.chat.completions.create({
              model: modelId,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 1000
            });
            response = completion.choices[0]?.message?.content || '';
            break;
          }
          case AIProvider.ANTHROPIC: {
            const client = new Anthropic({ apiKey: key });
            const message = await client.messages.create({
              model: modelId,
              max_tokens: 1000,
              messages: [{ role: 'user', content: prompt }]
            });
            response = message.content.filter(block => block.type === 'text').map(block => block.text).join('') || '';
            break;
          }
          case AIProvider.GOOGLE:
          default: {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContent(prompt);
            const geminiResponse = await result.response;
            response = geminiResponse.text();
            break;
          }
        }
        return response;
      },
      preferredKeyId
    );

    if (result) {
      try {
        const parsed = JSON.parse(result);
        endMetric(true);
        return {
          language: parsed.language || 'Unknown',
          framework: parsed.framework || 'Unknown',
          suggestedProjectType: parsed.suggestedProjectType || 'frontend',
          confidence: parsed.confidence || 50
        };
      } catch {
        endMetric(false);
        // Fallback if JSON parsing fails
        return {
          language: 'TypeScript',
          framework: 'React',
          suggestedProjectType: 'frontend',
          confidence: 70
        };
      }
    } else {
      endMetric(false);
      return {
        language: 'TypeScript',
        framework: 'React',
        suggestedProjectType: 'frontend',
        confidence: 60
      };
    }
  } catch (error) {
    endMetric(false);
    console.error('AI detection failed:', error);
    return {
      language: 'TypeScript',
      framework: 'React',
      suggestedProjectType: 'frontend',
      confidence: 60
    };
  }
};

export const generateFileTree = async (config: RepoConfig, rawInput: string, preferredKeyId?: string): Promise<FileNode[]> => {
  const blueprint = BlueprintEngine.getBlueprint(config.blueprintId);
  if (!blueprint) {
    console.error('Invalid blueprint:', config.blueprintId);
    return [];
  }

  const aiConfig = getAIConfig();
  const provider = aiConfig.selectedProvider;
  const keys = aiConfig.providers[provider].keys;
  const models = aiConfig.providers[provider].models;

  if (!keys.length) {
    // Return mock file tree if no keys
    return [
      {
        id: 'src',
        name: 'src',
        type: FileType.FOLDER,
        children: [
          {
            id: 'index',
            name: 'index.tsx',
            type: FileType.FILE,
            content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root')!);\nroot.render(<App />);`,
            language: 'typescript'
          },
          {
            id: 'app',
            name: 'App.tsx',
            type: FileType.FILE,
            content: `import React from 'react';\n\nfunction App() {\n  return (\n    <div className="App">\n      <h1>Hello World</h1>\n    </div>\n  );\n}\n\nexport default App;`,
            language: 'typescript'
          }
        ]
      },
      {
        id: 'package',
        name: 'package.json',
        type: FileType.FILE,
        content: `{\n  "name": "${config.name || 'my-app'}",\n  "version": "1.0.0",\n  "private": true\n}`,
        language: 'json'
      }
    ];
  }

  const endMetric = performanceMonitor.start('generateFileTree');
  try {
    const prompt = `Generate a complete file structure for a ${blueprint.techStack.language} ${blueprint.techStack.framework} ${blueprint.category} project.

Project details:
- Language: ${blueprint.techStack.language}
- Framework: ${blueprint.techStack.framework}
- Project Type: ${blueprint.category}
- Use TypeScript: ${blueprint.techStack.language === 'TypeScript' ? 'yes' : 'no'}
- Blueprint: ${config.blueprintId}

User input: ${rawInput}

Generate a JSON array of file objects with this structure:
[
  {
    "id": "unique_id",
    "name": "filename.ext",
    "type": "file" or "folder",
    "content": "file content as string (for files only)",
    "language": "typescript|javascript|python|etc",
    "children": [...] (for folders only)
  }
]

Include essential files like package.json, README.md, and basic source files. Make the content realistic and functional.`;

    const result = await executeWithFailover(
      keys,
      provider,
      models,
      async (key: string, modelId: string) => {
        let response: string;
        switch (provider) {
          case AIProvider.OPENAI: {
            const client = new OpenAI({ apiKey: key });
            const completion = await client.chat.completions.create({
              model: modelId,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 4000
            });
            response = completion.choices[0]?.message?.content || '';
            break;
          }
          case AIProvider.ANTHROPIC: {
            const client = new Anthropic({ apiKey: key });
            const message = await client.messages.create({
              model: modelId,
              max_tokens: 4000,
              messages: [{ role: 'user', content: prompt }]
            });
            response = message.content.filter(block => block.type === 'text').map(block => block.text).join('') || '';
            break;
          }
          case AIProvider.GOOGLE:
          default: {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContent(prompt);
            const geminiResponse = await result.response;
            response = geminiResponse.text();
            break;
          }
        }
        return response;
      },
      preferredKeyId
    );

    if (result) {
      try {
        const parsed = JSON.parse(result);
        endMetric(true);
        return parsed;
      } catch {
        endMetric(false);
        // Fallback to mock data
        return [
          {
            id: 'src',
            name: 'src',
            type: FileType.FOLDER,
            children: [
              {
                id: 'index',
                name: 'index.tsx',
                type: FileType.FILE,
                content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root')!);\nroot.render(<App />);`,
                language: 'typescript'
              }
            ]
          }
        ];
      }
    } else {
      endMetric(false);
      return [];
    }
  } catch (error) {
    endMetric(false);
    console.error('File tree generation failed:', error);
    return [];
  }
};

export const refactorCode = async (code: string, instruction: string, filename: string, preferredKeyId?: string): Promise<string> => {
  const aiConfig = getAIConfig();
  const provider = aiConfig.selectedProvider;
  const keys = aiConfig.providers[provider].keys;
  const models = aiConfig.providers[provider].models;

  if (!keys.length) {
    // Return original code if no keys
    return code;
  }

  const endMetric = performanceMonitor.start('refactorCode');
  try {
    const prompt = `Refactor the following code according to this instruction: "${instruction}"

File: ${filename}
Code:
${code}

Return only the refactored code, no explanations or markdown.`;

    const result = await executeWithFailover(
      keys,
      provider,
      models,
      async (key: string, modelId: string) => {
        let response: string;
        switch (provider) {
          case AIProvider.OPENAI: {
            const client = new OpenAI({ apiKey: key });
            const completion = await client.chat.completions.create({
              model: modelId,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 4000
            });
            response = completion.choices[0]?.message?.content || code;
            break;
          }
          case AIProvider.ANTHROPIC: {
            const client = new Anthropic({ apiKey: key });
            const message = await client.messages.create({
              model: modelId,
              max_tokens: 4000,
              messages: [{ role: 'user', content: prompt }]
            });
            response = message.content.filter(block => block.type === 'text').map(block => block.text).join('') || code;
            break;
          }
          case AIProvider.GOOGLE:
          default: {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContent(prompt);
            const geminiResponse = await result.response;
            response = geminiResponse.text();
            break;
          }
        }
        return response.trim();
      },
      preferredKeyId
    );

    endMetric(true);
    return result || code;
  } catch (error) {
    endMetric(false);
    console.error('Code refactoring failed:', error);
    return code;
  }
};
