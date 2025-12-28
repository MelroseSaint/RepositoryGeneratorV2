import { GoogleGenerativeAI } from '@google/generative-ai';
import { RepoConfig, FileNode, FileType } from '../types';

const API_KEY_STORAGE_KEY = 'repogen_gemini_api_key';

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

export interface DetectionResult {
  language: string;
  framework: string;
  suggestedProjectType: string;
  confidence: number;
}

export const detectStack = async (codeSnippet: string): Promise<DetectionResult> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    // Return mock data if no API key
    return {
      language: 'TypeScript',
      framework: 'React',
      suggestedProjectType: 'frontend',
      confidence: 85
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Analyze this code snippet and determine:
1. Primary programming language
2. Framework/library being used
3. Suggested project type (frontend, backend, fullstack, mobile, desktop, cli, library, game, data)
4. Confidence level (0-100)

Code snippet:
${codeSnippet}

Return only a JSON object with keys: language, framework, suggestedProjectType, confidence`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const parsed = JSON.parse(text);
      return {
        language: parsed.language || 'Unknown',
        framework: parsed.framework || 'Unknown',
        suggestedProjectType: parsed.suggestedProjectType || 'frontend',
        confidence: parsed.confidence || 50
      };
    } catch {
      // Fallback if JSON parsing fails
      return {
        language: 'TypeScript',
        framework: 'React',
        suggestedProjectType: 'frontend',
        confidence: 70
      };
    }
  } catch (error) {
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
  const apiKey = getApiKey();
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

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Generate a complete file structure for a ${config.language} ${config.framework} ${config.projectType} project.

Project details:
- Language: ${config.language}
- Framework: ${config.framework}
- Project Type: ${config.projectType}
- Use TypeScript: ${config.useTypeScript}
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch {
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
    console.error('File tree generation failed:', error);
    return [];
  }
};

export const refactorCode = async (code: string, instruction: string, filename: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    // Return original code if no API key
    return code;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Refactor the following code according to this instruction: "${instruction}"

File: ${filename}
Code:
${code}

Return only the refactored code, no explanations or markdown.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text.trim();
  } catch (error) {
    console.error('Code refactoring failed:', error);
    return code;
  }
};
