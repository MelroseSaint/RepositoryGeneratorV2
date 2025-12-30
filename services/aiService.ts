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

// New AI configuration management
export const getAIConfig = (): AIConfig => {
  if (typeof window === 'undefined') {
    return {
      selectedProvider: AIProvider.GOOGLE,
      providers: {
        [AIProvider.GOOGLE]: {
          provider: AIProvider.GOOGLE,
          apiKey: '',
          models: DEFAULT_MODELS[AIProvider.GOOGLE]
        },
        [AIProvider.OPENAI]: {
          provider: AIProvider.OPENAI,
          apiKey: '',
          models: DEFAULT_MODELS[AIProvider.OPENAI]
        },
        [AIProvider.ANTHROPIC]: {
          provider: AIProvider.ANTHROPIC,
          apiKey: '',
          models: DEFAULT_MODELS[AIProvider.ANTHROPIC]
        }
      }
    };
  }

  const stored = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
  if (stored) {
    try {
      const config = JSON.parse(stored) as AIConfig;
      // Ensure all providers have models
      Object.keys(config.providers).forEach(provider => {
        const p = provider as AIProvider;
        if (!config.providers[p].models || config.providers[p].models.length === 0) {
          config.providers[p].models = DEFAULT_MODELS[p];
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
    selectedProvider: legacyKey ? AIProvider.GOOGLE : AIProvider.GOOGLE,
    providers: {
      [AIProvider.GOOGLE]: {
        provider: AIProvider.GOOGLE,
        apiKey: legacyKey || '',
        models: DEFAULT_MODELS[AIProvider.GOOGLE]
      },
      [AIProvider.OPENAI]: {
        provider: AIProvider.OPENAI,
        apiKey: '',
        models: DEFAULT_MODELS[AIProvider.OPENAI]
      },
      [AIProvider.ANTHROPIC]: {
        provider: AIProvider.ANTHROPIC,
        apiKey: '',
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

export const getProviderApiKey = (provider: AIProvider): string => {
  return getAIConfig().providers[provider].apiKey;
};

export const setProviderApiKey = (provider: AIProvider, apiKey: string): void => {
  const config = getAIConfig();
  config.providers[provider].apiKey = apiKey;
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

export const detectStack = async (codeSnippet: string): Promise<DetectionResult> => {
  const aiConfig = getAIConfig();
  const provider = aiConfig.selectedProvider;
  const apiKey = getProviderApiKey(provider);

  if (!apiKey) {
    // Return mock data if no API key
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

    let response: string;

    switch (provider) {
      case AIProvider.OPENAI: {
        const client = new OpenAI({ apiKey });
        const completion = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000
        });
        response = completion.choices[0]?.message?.content || '';
        break;
      }

      case AIProvider.ANTHROPIC: {
        const client = new Anthropic({ apiKey });
        const message = await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        });
        response = message.content[0]?.type === 'text' ? message.content[0].text : '';
        break;
      }

case AIProvider.GOOGLE:
      default: {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const geminiResponse = await result.response;
        response = geminiResponse.text();
        break;
      }
    }

    try {
      const parsed = JSON.parse(response);
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

export const generateFileTree = async (config: RepoConfig, rawInput: string): Promise<FileNode[]> => {
  const blueprint = BlueprintEngine.getBlueprint(config.blueprintId);
  if (!blueprint) {
    console.error('Invalid blueprint:', config.blueprintId);
    return [];
  }

  const aiConfig = getAIConfig();
  const provider = aiConfig.selectedProvider;
  const apiKey = getProviderApiKey(provider);

  if (!apiKey) {
    // Return mock file tree if no API key
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
- Use TypeScript: ${blueprint.techStack.language === 'TypeScript'}
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

    let response: string;

    switch (provider) {
      case AIProvider.OPENAI: {
        const client = new OpenAI({ apiKey });
        const completion = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000
        });
        response = completion.choices[0]?.message?.content || '';
        break;
      }

      case AIProvider.ANTHROPIC: {
        const client = new Anthropic({ apiKey });
        const message = await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        });
        response = message.content[0]?.type === 'text' ? message.content[0].text : '';
        break;
      }

      case AIProvider.GOOGLE:
      default: {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const geminiResponse = await result.response;
        response = geminiResponse.text();
        break;
      }
    }

    try {
      const parsed = JSON.parse(response);
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
  } catch (error) {
    endMetric(false);
    console.error('File tree generation failed:', error);
    return [];
  }
};

export const refactorCode = async (code: string, instruction: string, filename: string): Promise<string> => {
  const aiConfig = getAIConfig();
  const provider = aiConfig.selectedProvider;
  const apiKey = getProviderApiKey(provider);

  if (!apiKey) {
    // Return original code if no API key
    return code;
  }

  const endMetric = performanceMonitor.start('refactorCode');
  try {
    const prompt = `Refactor the following code according to this instruction: "${instruction}"

File: ${filename}
Code:
${code}

Return only the refactored code, no explanations or markdown.`;

    let response: string;

    switch (provider) {
      case AIProvider.OPENAI: {
        const client = new OpenAI({ apiKey });
        const completion = await client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000
        });
        response = completion.choices[0]?.message?.content || code;
        break;
      }

      case AIProvider.ANTHROPIC: {
        const client = new Anthropic({ apiKey });
        const message = await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        });
        response = message.content[0]?.type === 'text' ? message.content[0].text : code;
        break;
      }

      case AIProvider.GOOGLE:
      default: {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const geminiResponse = await result.response;
        response = geminiResponse.text();
        break;
      }
    }

    endMetric(true);
    return response.trim();
  } catch (error) {
    endMetric(false);
    console.error('Code refactoring failed:', error);
    return code;
  }
};
