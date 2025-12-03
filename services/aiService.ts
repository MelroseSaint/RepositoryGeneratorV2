import { GoogleGenerativeAI } from '@google/generative-ai';
import { DetectionResult, FileNode, FileType, RepoConfig } from '../types';

// --- API Key Management ---

let runtimeApiKey = '';

// On client-side, try loading from localStorage to persist user's key
if (typeof window !== 'undefined') {
    runtimeApiKey = localStorage.getItem('gemini_api_key') || '';
}

/**
 * Sets the API key for the current session and stores it in localStorage.
 * @param key The Google Gemini API key.
 */
export const setApiKey = (key: string) => {
    runtimeApiKey = key;
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('gemini_api_key', key);
        } catch (e) {
            console.warn("Could not save API key to localStorage:", e);
        }
    }
};

/**
 * Retrieves the API key, prioritizing user input, then environment variables.
 * @returns The API key or an empty string if not found.
 */
export const getApiKey = (): string => {
    // 1. Prioritize runtime key (user input via UI)
    if (runtimeApiKey) return runtimeApiKey;

    // 2. Check for Vite environment variable (import.meta.env)
    // @ts-ignore - Vite specific env var
    if (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
        // @ts-ignore
        return import.meta.env.VITE_GEMINI_API_KEY;
    }

    // 3. Check for Node.js environment variable (process.env)
    // This is useful for scripts like test-ai-connection.js
    try {
        if (typeof process !== 'undefined' && process.env.GEMINI_API_KEY) {
            return process.env.GEMINI_API_KEY;
        }
    } catch (e) {
        // process is not defined in browser, ignore error.
    }

    return '';
};

/**
 * Initializes and returns a Gemini model instance if an API key is available.
 */
const getModel = () => {
    const key = getApiKey();
    if (!key) return null;
    try {
        const genAI = new GoogleGenerativeAI(key);
        // Using gemini-1.5-flash for speed and cost-effectiveness
        return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    } catch (error) {
        console.error("Error initializing GoogleGenerativeAI:", error);
        return null;
    }
};

// --- Helper Functions ---

/**
 * Parses a JSON string from the AI's response, cleaning up markdown.
 * @param text The raw text response from the AI.
 * @returns A parsed JSON object.
 */
const parseJsonResponse = <T>(text: string): T => {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("Failed to parse AI JSON response:", e);
        console.log("Raw response that failed parsing:", text);
        throw new Error("Invalid JSON response from AI.");
    }
};

/**
 * A utility to add a timeout to a promise.
 * @param promise The promise to race against the timeout.
 * @param ms The timeout duration in milliseconds.
 * @returns The result of the promise or throws a timeout error.
 */
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`Operation timed out after ${ms}ms`));
        }, ms);

        promise.then(
            (res) => {
                clearTimeout(timeoutId);
                resolve(res);
            },
            (err) => {
                clearTimeout(timeoutId);
                reject(err);
            }
        );
    });
};

// --- Core AI Services ---

const MOCK_DELAY = 1000;

/**
 * Detects the tech stack using Gemini if available, otherwise falls back to mock.
 */
export const detectStack = async (input: string): Promise<DetectionResult> => {
    const model = getModel();
    if (!model) {
        console.warn("No API Key found, using mock detection.");
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        return mockDetect(input);
    }

    const prompt = `
      Analyze this code and identify the tech stack.
      Respond with ONLY a valid JSON object matching this schema:
      {
        "language": "string",
        "framework": "string",
        "confidence": "number (0-100)",
        "suggestedProjectType": "string ('Frontend', 'Backend', 'Fullstack')",
        "detectedFiles": "number (estimated files needed)"
      }
      Code:
      ${input.slice(0, 2500)}
    `;

    try {
        const result = await withTimeout(model.generateContent(prompt), 15000);
        const text = result.response.text();
        return parseJsonResponse<DetectionResult>(text);
    } catch (error) {
        console.error("AI Detection failed:", error);
        return mockDetect(input); // Fallback on error
    }
};

/**
 * Generates the file tree using Gemini with a fallback to mock generation.
 */
export const generateFileTree = async (config: RepoConfig, rawInput: string): Promise<FileNode[]> => {
    const model = getModel();
    if (!model) {
        console.warn("No model/key found, falling back to mock file generation.");
        return mockGenerate(config, rawInput);
    }

    const requestedFiles = [
        "package.json", "README.md", ".gitignore",
        config.useTypeScript ? "tsconfig.json" : null,
        config.linter === 'eslint' ? ".eslintrc.json" : null,
        config.formatter === 'prettier' ? ".prettierrc" : null,
        config.includeDocker ? "Dockerfile" : null,
    ].filter(Boolean) as string[];

    const prompt = `
      Generate a repository structure as a JSON object where keys are file paths and values are their string content.
      Base it on this configuration:
      - Project Name: ${config.name}
      - Description: ${config.description}
      - Language: ${config.language}
      - Framework: ${config.framework}
      - Type: ${config.projectType}
      - Source Code: Use the provided snippet as the main entry point (e.g., src/index.ts or App.tsx).

      Return ONLY a valid JSON object. Example: { "README.md": "# Title", "src/index.js": "console.log(\\"hello\\")" }

      Files to generate: ${requestedFiles.join(', ')}

      Initial source code snippet to include:
      ${rawInput.slice(0, 1000)}
    `;

    try {
        const result = await withTimeout(model.generateContent(prompt), 30000);
        const text = result.response.text();
        const files = parseJsonResponse<Record<string, string>>(text);
        return convertFlatObjectToTree(files);
    } catch (error) {
        console.error("AI File Tree Generation failed:", error);
        return mockGenerate(config, rawInput); // Fallback on error
    }
};

/**
 * Refactors a code snippet based on user instructions.
 */
export const refactorCode = async (code: string, instruction: string, fileName: string): Promise<string> => {
    const model = getModel();
    if (!model) {
        return `// AI Refactoring Unavailable (No API Key)\n// Instruction: ${instruction}\n\n${code}`;
    }

    const prompt = `
      You are an expert code refactoring assistant.
      Refactor the following code from file "${fileName}" based on this instruction: "${instruction}".

      Rules:
      1. Return ONLY the refactored, complete code. Do not add explanations, markdown, or comments unless requested.
      2. Maintain the original logic unless asked to change it.
      3. If the instruction is vague (e.g., "fix this"), improve code quality, add types, and add clarifying comments.

      Original Code:
      ${code}
    `;

    try {
        const result = await withTimeout(model.generateContent(prompt), 20000);
        const text = result.response.text();
        // Basic cleanup for markdown that might slip through
        return text.replace(/```[a-z]*\n?|\n?```/g, '').trim();
    } catch (error) {
        console.error("Refactoring failed:", error);
        throw new Error("AI refactoring failed. Check your API key or the model may be overloaded.");
    }
};


// --- Mocks & Utilities ---

const mockDetect = (input: string): DetectionResult => {
    const lower = input.toLowerCase();
    if (lower.includes('react')) return { language: 'TypeScript', framework: 'React', confidence: 90, suggestedProjectType: 'Frontend', detectedFiles: 5 };
    if (lower.includes('express')) return { language: 'JavaScript', framework: 'Express', confidence: 85, suggestedProjectType: 'Backend', detectedFiles: 4 };
    return { language: 'JavaScript', framework: 'Node.js', confidence: 60, suggestedProjectType: 'Backend', detectedFiles: 1 };
};

const mockGenerate = (config: RepoConfig, rawInput: string): FileNode[] => {
    const ext = config.language === 'TypeScript' ? (config.projectType === 'Frontend' ? 'tsx' : 'ts') : 'js';
    return [
        { id: 'pkg', name: 'package.json', type: FileType.FILE, content: JSON.stringify({ name: config.name, version: '0.1.0' }, null, 2) },
        { id: 'readme', name: 'README.md', type: FileType.FILE, content: `# ${config.name}\n\n${config.description}` },
        {
            id: 'src', name: 'src', type: FileType.FOLDER, children: [
                { id: 'index', name: `index.${ext}`, type: FileType.FILE, content: rawInput }
            ]
        }
    ];
};

const convertFlatObjectToTree = (files: Record<string, string>): FileNode[] => {
    const root: FileNode[] = [];
    const idMap = new Map<string, FileNode>();

    for (const [path, content] of Object.entries(files)) {
        const parts = path.split('/');
        let currentLevel = root;
        let currentPath = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPath = i === 0 ? part : `${currentPath}/${part}`;
            const isFile = i === parts.length - 1;

            let node = idMap.get(currentPath);

            if (!node) {
                if (isFile) {
                    node = {
                        name: part,
                        type: FileType.FILE,
                        content: content as string,
                        id: currentPath,
                    };
                    currentLevel.push(node);
                } else {
                    node = {
                        name: part,
                        type: FileType.FOLDER,
                        children: [],
                        id: currentPath,
                    };
                    currentLevel.push(node);
                    currentLevel = node.children!;
                }
                idMap.set(currentPath, node);
            } else if (node.type === FileType.FOLDER) {
                currentLevel = node.children!;
            }
        }
    }
    return root;
};
