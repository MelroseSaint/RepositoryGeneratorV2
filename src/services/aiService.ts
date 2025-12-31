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
      id: 'gemini-flash-latest',
      name: 'Gemini Flash',
      provider: AIProvider.GOOGLE,
      contextWindow: 1048576,
      supportsFunctionCalling: true,
      supportsVision: true,
      maxTokens: 8192
    },
    {
      id: 'gemini-pro-latest',
      name: 'Gemini Pro',
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

// Helper function to add timeout to promises
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

export const detectStack = async (codeSnippet: string): Promise<DetectionResult> => {
  const aiConfig = getAIConfig();
  const provider = aiConfig.selectedProvider;
  const apiKey = getProviderApiKey(provider);

  if (!apiKey) {
    console.log('[detectStack] No API key configured, using fallback detection');
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
        const completion = await withTimeout(
          client.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000
          }),
          30000,
          'OpenAI API call'
        );
        response = completion.choices[0]?.message?.content || '';
        break;
      }

      case AIProvider.ANTHROPIC: {
        const client = new Anthropic({ apiKey });
        const message = await withTimeout(
          client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
          }),
          30000,
          'Anthropic API call'
        );
        response = message.content[0]?.type === 'text' ? message.content[0].text : '';
        break;
      }

      case AIProvider.GOOGLE:
      default: {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const result = await withTimeout(
          model.generateContent(prompt),
          30000,
          'Google Gemini API call'
        );
        const googleResponse = await result.response;
        response = googleResponse.text();
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
      console.warn('[detectStack] JSON parsing failed, using fallback');
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
    console.error('[detectStack] AI detection failed:', error);
    
    // Check if it's a quota/rate limit error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      console.warn('⚠️ AI quota or rate limit exceeded. Using fallback detection.');
      throw new Error('AI quota exceeded. Please try again later or switch to a different AI provider with available quota.');
    }
    
    if (errorMessage.includes('timed out')) {
      console.warn('⚠️ AI API call timed out. Using fallback detection.');
      throw new Error('AI service timeout. Please check your network connection or try again.');
    }

    if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('API key')) {
      console.warn('⚠️ Invalid API key. Using fallback detection.');
      throw new Error('Invalid API key. Please check your AI provider API key in settings.');
    }

    if (errorMessage.includes('404')) {
      console.warn('⚠️ Model not found. Using fallback detection.');
      throw new Error('AI model not found. Please check the selected model configuration.');
    }
    
    console.warn('[detectStack] Unknown error, using fallback detection');
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
    console.error('[generateFileTree] Invalid blueprint:', config.blueprintId);
    return [];
  }

  const aiConfig = getAIConfig();
  const provider = aiConfig.selectedProvider;
  const apiKey = getProviderApiKey(provider);

  if (!apiKey) {
    console.log('[generateFileTree] No API key configured, using fallback file tree');
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
        id: 'tests',
        name: 'tests',
        type: FileType.FOLDER,
        children: [
          {
            id: 'app-test',
            name: 'App.test.tsx',
            type: FileType.FILE,
            content: `import { describe, it, expect } from 'vitest';\n\ndescribe('App', () => {\n  it('should render correctly', () => {\n    expect(true).toBe(true);\n  });\n});`,
            language: 'typescript'
          }
        ]
      },
      {
        id: 'docs',
        name: 'docs',
        type: FileType.FOLDER,
        children: [
          {
            id: 'arch',
            name: 'ARCHITECTURE.md',
            type: FileType.FILE,
            content: '# Architecture\nThis project follows the standard RepoGen V2 structure.',
            language: 'markdown'
          }
        ]
      },
      {
        id: 'package',
        name: 'package.json',
        type: FileType.FILE,
        content: `{\n  "name": "${config.name || 'my-app'}",\n  "version": "1.0.0",\n  "private": true\n}`,
        language: 'json'
      },
      {
        id: 'readme',
        name: 'README.md',
        type: FileType.FILE,
        content: `# ${config.name || 'My App'}\nGenerated by RepoGen V2`,
        language: 'markdown'
      },
      {
        id: 'license',
        name: 'LICENSE',
        type: FileType.FILE,
        content: 'MIT License...',
        language: 'text'
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

    The project MUST follow this standard structure:
    - /src: All source code
    - /tests: Test files
    - /docs: Documentation (architecture, guides)
    - /config: Configuration files (YAML, JSON, INI)
    - /public or /assets: Static assets
    - /scripts: Helper or build scripts
    - /bin: Executables or binaries
    - /ci: CI/CD scripts
    - .github/workflows: GitHub Actions (ci.yml, cd.yml)
    
    Include essential root files:
    - .gitignore (include node_modules, logs, .env, dist, build, etc.)
    - README.md (instructions to clone, install, run, and test)
    - LICENSE (MIT by default)
    - .env.example (placeholder for env vars)
    - Dependency files (package.json, requirements.txt, etc.)
    - Dockerfile and docker-compose.yml
    - Linter/formatter configs (.eslintrc, .prettierrc, etc.)
    - CHANGELOG.md and CONTRIBUTING.md

    Make the content realistic, functional, and adhering to enterprise standards.`;

    let response: string;

    switch (provider) {
      case AIProvider.OPENAI: {
        const client = new OpenAI({ apiKey });
        const completion = await withTimeout(
          client.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 4000
          }),
          60000,
          'OpenAI API call'
        );
        response = completion.choices[0]?.message?.content || '';
        break;
      }

      case AIProvider.ANTHROPIC: {
        const client = new Anthropic({ apiKey });
        const message = await withTimeout(
          client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            messages: [{ role: 'user', content: prompt }]
          }),
          60000,
          'Anthropic API call'
        );
        response = message.content[0]?.type === 'text' ? message.content[0].text : '';
        break;
      }

      case AIProvider.GOOGLE:
      default: {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const result = await withTimeout(
          model.generateContent(prompt),
          60000,
          'Google Gemini API call'
        );
        const geminiResponse = await result.response;
        response = geminiResponse.text();
        break;
      }
    }

    try {
      const parsed = JSON.parse(response);
      endMetric(true);
      return parsed;
    } catch (parseError) {
      console.warn('[generateFileTree] JSON parsing failed, using fallback:', parseError);
      endMetric(false);
      // Fallback to mock data with new structure
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
        },
        {
          id: 'tests',
          name: 'tests',
          type: FileType.FOLDER,
          children: []
        },
        {
          id: 'docs',
          name: 'docs',
          type: FileType.FOLDER,
          children: []
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
  } catch (error) {
    endMetric(false);
    console.error('[generateFileTree] File tree generation failed:', error);
    
    // Check if it's a quota/rate limit error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      console.warn('⚠️ AI quota or rate limit exceeded for file tree generation.');
      throw new Error('AI quota exceeded. Please try again later or switch to a different AI provider with available quota.');
    }
    
    if (errorMessage.includes('timed out')) {
      console.warn('⚠️ AI API call timed out. Using fallback file tree.');
      throw new Error('AI service timeout. Please check your network connection or try again.');
    }

    if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('API key')) {
      console.warn('⚠️ Invalid API key. Using fallback file tree.');
      throw new Error('Invalid API key. Please check your AI provider API key in settings.');
    }

    if (errorMessage.includes('404')) {
      console.warn('⚠️ Model not found. Using fallback file tree.');
      throw new Error('AI model not found. Please check the selected model configuration.');
    }

    console.warn('[generateFileTree] Unknown error, returning empty file tree');
    return [];
  }
};

export const refactorCode = async (code: string, instruction: string, filename: string): Promise<string> => {
  const aiConfig = getAIConfig();
  const provider = aiConfig.selectedProvider;
  const apiKey = getProviderApiKey(provider);

  if (!apiKey) {
    console.log('[refactorCode] No API key configured, returning original code');
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
        const completion = await withTimeout(
          client.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 4000
          }),
          60000,
          'OpenAI API call'
        );
        response = completion.choices[0]?.message?.content || code;
        break;
      }

      case AIProvider.ANTHROPIC: {
        const client = new Anthropic({ apiKey });
        const message = await withTimeout(
          client.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            messages: [{ role: 'user', content: prompt }]
          }),
          60000,
          'Anthropic API call'
        );
        response = message.content[0]?.type === 'text' ? message.content[0].text : code;
        break;
      }

      case AIProvider.GOOGLE:
      default: {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const result = await withTimeout(
          model.generateContent(prompt),
          60000,
          'Google Gemini API call'
        );
        const geminiResponse = await result.response;
        response = geminiResponse.text();
        break;
      }
    }

    endMetric(true);
    return response.trim();
  } catch (error) {
    endMetric(false);
    console.error('[refactorCode] Code refactoring failed:', error);
    
    // Check if it's a quota/rate limit error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      console.warn('⚠️ AI quota or rate limit exceeded for code refactoring.');
      throw new Error('AI quota exceeded. Please try again later or switch to a different AI provider with available quota.');
    }
    
    if (errorMessage.includes('timed out')) {
      console.warn('⚠️ AI API call timed out. Returning original code.');
      throw new Error('AI service timeout. Please check your network connection or try again.');
    }

    if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('API key')) {
      console.warn('⚠️ Invalid API key. Returning original code.');
      throw new Error('Invalid API key. Please check your AI provider API key in settings.');
    }

    if (errorMessage.includes('404')) {
      console.warn('⚠️ Model not found. Returning original code.');
      throw new Error('AI model not found. Please check the selected model configuration.');
    }

    console.warn('[refactorCode] Unknown error, returning original code');
    return code;
  }
};
