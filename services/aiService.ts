import { GoogleGenerativeAI } from '@google/generative-ai';
import { DetectionResult, FileNode, FileType, RepoConfig } from '../types';

// Initialize Gemini
// Note: In a real prod app, you'd proxy this through a backend to hide the key.
// For this local tool/demo, using the env var directly is acceptable.

let runtimeApiKey = '';

// Try to load from localStorage on client side
if (typeof window !== 'undefined') {
    runtimeApiKey = localStorage.getItem('gemini_api_key') || '';
}

export const setApiKey = (key: string) => {
    runtimeApiKey = key;
    if (typeof window !== 'undefined') {
        localStorage.setItem('gemini_api_key', key);
    }
};

export const getApiKey = () => {
    // Prioritize runtime key (user input)
    if (runtimeApiKey) return runtimeApiKey;

    // Check environment variables safely
    // Vite 'define' replaces process.env.GEMINI_API_KEY string literal
    // We also check import.meta.env for standard Vite usage
    try {
        if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
            return process.env.GEMINI_API_KEY;
        }
    } catch (e) {
        // Ignore process access errors
    }

    try {
        // @ts-ignore - Vite specific
        if (import.meta.env?.VITE_GEMINI_API_KEY) {
            // @ts-ignore
            return import.meta.env.VITE_GEMINI_API_KEY;
        }
    } catch (e) {
        // Ignore import.meta access errors
    }

    return '';
};

const getModel = () => {
    const key = getApiKey();
    if (!key) return null;
    const genAI = new GoogleGenerativeAI(key);
    // Using gemini-flash-latest for stability and access to latest features
    return genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
};

const MOCK_DELAY = 1500;

/**
 * Detects the tech stack using Gemini if available, otherwise falls back to heuristics.
 */
export const detectStack = async (input: string): Promise<DetectionResult> => {
    const model = getModel();

    if (!model) {
        console.warn("No API Key found, using mock detection.");
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));
        return mockDetect(input);
    }

    try {
        const prompt = `
      Analyze the following code snippet and detect the technology stack.
      Return ONLY a JSON object with this structure:
      {
        "language": "string (e.g. TypeScript, Python)",
        "framework": "string (e.g. React, Flask, Next.js)",
        "confidence": number (0-100),
        "suggestedProjectType": "string (e.g. Frontend, Backend, Fullstack)",
        "detectedFiles": number (estimated count of files needed)
      }

      Code Snippet:
      ${input.slice(0, 2000)}
    `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr) as DetectionResult;

    } catch (error) {
        console.error("AI Detection failed:", error);
        return mockDetect(input);
    }
};

/**
 * Generates the file tree using Gemini to create intelligent content.
 */
export const generateFileTree = async (config: RepoConfig, rawInput: string): Promise<FileNode[]> => {
    const model = getModel();
    console.log('[AI Service] generateFileTree called. Model available:', !!model);

    // If no key, use the deterministic mock generator
    if (!model) {
        console.warn("[AI Service] No model/key found. Falling back to mock.");
        return mockGenerate(config, rawInput);
    }

    try {
        // We will generate the structure and key files in one go, or parallelize.
        // For speed, let's generate the file LIST first, then content? 
        // Or just ask for the critical files.

        // Strategy: Ask Gemini to generate the package.json and README content based on the config.
        // We will construct the rest of the standard boilerplate (tsconfig, etc) manually to ensure validity,
        // but inject the AI content where it matters.

        console.log('[AI Service] Starting AI generation...');
        console.log('[AI Service] Config:', {
            projectType: config.projectType,
            framework: config.framework,
            language: config.language,
            name: config.name
        });

        // Build list of requested files based on config
        const requestedFiles = [
            "package.json",
            "README.md",
            ".gitignore"
        ];

        if (config.ideConfig?.includes('vscode')) requestedFiles.push(".vscode/settings.json");
        if (config.ideConfig?.includes('editorconfig')) requestedFiles.push(".editorconfig");
        if (config.ideConfig?.includes('idea')) requestedFiles.push(".idea/workspace.xml"); // Simplified
        if (config.ideConfig?.includes('devcontainer')) requestedFiles.push(".devcontainer/devcontainer.json");

        // Add feature-specific files hints
        let featureContext = "";
        if (config.features?.length) {
            featureContext = `\nInclude configuration/scaffolding for these features: ${config.features.join(', ')}.`;
            if (config.features.includes('auth')) requestedFiles.push("src/lib/auth.ts");
            if (config.features.includes('db')) requestedFiles.push("prisma/schema.prisma");
            if (config.features.includes('docs')) {
                requestedFiles.push("CONTRIBUTING.md");
                requestedFiles.push("CHANGELOG.md");
                requestedFiles.push("docs/architecture.md");
                requestedFiles.push("docs/setup.md");
            }
        }

        // Simplified prompt to reduce complexity and avoid timeouts
        const prompt = `Generate a JSON object with configuration files for a ${config.projectType} project using ${config.framework} and ${config.language}.
${featureContext}

Project Name: ${config.name}
Description: ${config.description}

Return ONLY a JSON object (no markdown, no explanation) with these files:
{
  ${requestedFiles.map(f => `"${f}": "..."`).join(',\n  ')}
}

Keep it simple and concise.`;

        console.log('[AI Service] Sending prompt to Gemini...');
        console.log('[AI Service] Prompt length:', prompt.length);

        // Add timeout to prevent indefinite hanging
        const timeoutMs = 30000; // 30 seconds
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI generation timeout after 30s')), timeoutMs)
        );

        const result = await Promise.race([
            model.generateContent(prompt),
            timeoutPromise
        ]) as any;

        console.log('[AI Service] Received response from Gemini');

        const response = await result.response;
        const text = response.text();

        try {
            // Clean up markdown code blocks if present
            const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
            const files = JSON.parse(jsonStr);

            // Convert flat object to FileNode array
            const fileNodes: FileNode[] = [];
            for (const [path, content] of Object.entries(files)) {
                const parts = path.split('/');
                let currentLevel = fileNodes;

                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    const isFile = i === parts.length - 1;

                    if (isFile) {
                        currentLevel.push({
                            name: part,
                            type: FileType.FILE,
                            content: content as string,
                            id: path.replace(/\./g, '-').replace(/\//g, '-'),
                            language: part.split('.').pop()
                        });
                    } else {
                        let folder = currentLevel.find(n => n.name === part && n.type === FileType.FOLDER);
                        if (!folder) {
                            folder = {
                                name: part,
                                type: FileType.FOLDER,
                                children: [],
                                id: part
                            };
                            currentLevel.push(folder);
                        }
                        currentLevel = folder.children!;
                    }
                }
            }

            return fileNodes;
        } catch (e) {
            console.error("Failed to parse AI response:", e);
            console.log("Raw response:", text);
            // Fallback to mock if parsing fails
            return mockGenerate(config, rawInput);
        }
    } catch (error) {
        console.error("AI Generation failed:", error);
        return mockGenerate(config, rawInput);
    }
};

// --- Fallbacks / Mocks ---

const mockDetect = (input: string): DetectionResult => {
    const lower = input.toLowerCase();
    let result: DetectionResult = {
        language: 'JavaScript',
        framework: 'Node.js',
        confidence: 65,
        suggestedProjectType: 'Backend',
        detectedFiles: 1,
    };
    if (lower.includes('react') || lower.includes('jsx')) {
        result = { language: 'JavaScript', framework: 'React', confidence: 92, suggestedProjectType: 'Frontend', detectedFiles: 3 };
    }
    if (lower.includes('interface ') || lower.includes('type ') || lower.includes(': string')) {
        result.language = 'TypeScript';
    }
    return result;
};

const mockGenerate = (config: RepoConfig, rawInput: string): FileNode[] => {
    const root: FileNode[] = [];

    // Package.json
    root.push({
        id: 'pkg-json', name: 'package.json', type: FileType.FILE, language: 'json', isNew: true,
        content: JSON.stringify({
            name: config.name, version: "0.1.0", description: config.description,
            scripts: { "dev": "vite", "build": "vite build" },
            dependencies: { [config.framework.toLowerCase()]: "^latest" }
        }, null, 2)
    });

    // Readme
    root.push({
        id: 'readme', name: 'README.md', type: FileType.FILE, language: 'markdown', isNew: true,
        content: `# ${config.name}\n\n${config.description}\n\nGenerated by RepoGen (Offline Mode).`
    });

    // GitHub
    const gh = generateGithubNodes(config);
    if (gh) root.push(gh);

    // Source
    const ext = config.language === 'TypeScript' ? 'ts' : 'js';
    const reactExt = config.language === 'TypeScript' ? 'tsx' : 'jsx';
    root.push({
        id: 'src', name: 'src', type: FileType.FOLDER,
        children: [{
            id: 'entry', name: `index.${config.framework === 'React' ? reactExt : ext}`,
            type: FileType.FILE, language: config.language.toLowerCase(),
            content: `// Offline Mode Entry\n\n${rawInput}`
        }]
    });

    return root;
};

const generateGithubNodes = (config: RepoConfig): FileNode | null => {
    if (config.ciProvider !== 'github' &&
        (!config.githubWorkflows || config.githubWorkflows.length === 0) &&
        (!config.githubTemplates || config.githubTemplates.length === 0) &&
        (!config.githubCommunity || config.githubCommunity.length === 0) &&
        !config.githubCodeowners) {
        return null;
    }

    const githubChildren: FileNode[] = [];
    const workflowsChildren: FileNode[] = [];

    // Workflows
    if (config.ciProvider === 'github' || config.githubWorkflows?.includes('ci')) {
        workflowsChildren.push({
            id: 'ci-yml', name: 'ci.yml', type: FileType.FILE, language: 'yaml', isNew: true,
            content: 'name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - run: npm ci\n      - run: npm test'
        });
    }
    // ... (Add other workflows as needed, abbreviated for this file replacement)

    if (workflowsChildren.length > 0) {
        githubChildren.push({ id: 'workflows', name: 'workflows', type: FileType.FOLDER, children: workflowsChildren });
    }

    // Templates
    const issueTemplates: FileNode[] = [];
    if (config.githubTemplates?.includes('bug_report')) {
        issueTemplates.push({
            id: 'bug-report', name: 'bug_report.md', type: FileType.FILE, language: 'markdown', isNew: true,
            content: '---\nname: Bug report\nabout: Create a report to help us improve\n---\n'
        });
    }
    if (issueTemplates.length > 0) {
        githubChildren.push({ id: 'issue-templates', name: 'ISSUE_TEMPLATE', type: FileType.FOLDER, children: issueTemplates });
    }

    // Community
    if (config.githubCommunity?.includes('contributing')) {
        githubChildren.push({ id: 'contributing', name: 'CONTRIBUTING.md', type: FileType.FILE, language: 'markdown', isNew: true, content: '# Contributing' });
    }

    return { id: 'github-folder', name: '.github', type: FileType.FOLDER, children: githubChildren };
};

export const refactorCode = async (code: string, instruction: string, fileName: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        return `// AI Refactoring Unavailable (No API Key)\n// Instruction: ${instruction}\n\n${code}`;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `You are an expert code refactoring assistant.
Refactor the following code from file "${fileName}" according to these instructions: "${instruction}".

Rules:
1. Return ONLY the refactored code. No markdown formatting, no explanations.
2. If converting JS to TS, add appropriate types and interfaces.
3. Maintain the original logic unless asked to change it.
4. If the instruction is unclear, improve code quality and add comments.

Code:
${code}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown if present
        text = text.replace(/```(typescript|javascript|tsx|jsx|json)?\n?|\n?```/g, '').trim();

        return text;
    } catch (error) {
        console.error("Refactoring failed:", error);
        throw new Error("AI Refactoring failed. Please check your API key and try again.");
    }
};

