import { DetectionResult, FileNode, FileType, RepoConfig } from '../types';

/**
 * Mocks the AI detection phase.
 * In a real app, this would call a backend or LLM.
 */
export const detectStack = async (input: string): Promise<DetectionResult> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

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
  if (lower.includes('django') || lower.includes('flask') || lower.includes('def ')) {
    result = { language: 'Python', framework: 'Flask', confidence: 88, suggestedProjectType: 'Backend', detectedFiles: 2 };
  }

  return result;
};

/**
 * Mocks the File Tree generation based on config and raw input.
 */
export const generateFileTree = (config: RepoConfig, rawInput: string): FileNode[] => {
  const root: FileNode[] = [];
  
  // 1. Add Config Files
  root.push({
    id: 'pkg-json',
    name: 'package.json',
    type: FileType.FILE,
    language: 'json',
    isNew: true,
    content: JSON.stringify({
      name: config.name,
      version: "0.1.0",
      description: config.description,
      scripts: {
        "dev": "vite",
        "build": "vite build",
        "lint": "eslint ."
      },
      dependencies: {
        [config.framework.toLowerCase()]: "^18.2.0"
      }
    }, null, 2)
  });

  root.push({
    id: 'readme',
    name: 'README.md',
    type: FileType.FILE,
    language: 'markdown',
    isNew: true,
    content: `# ${config.name}\n\n${config.description}\n\n## Getting Started\n\n\`\`\`bash\n${config.packageManager} install\n${config.packageManager} run dev\n\`\`\``
  });

  if (config.includeDocker) {
    root.push({ id: 'docker', name: 'Dockerfile', type: FileType.FILE, language: 'dockerfile', isNew: true, content: 'FROM node:18-alpine\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD ["npm", "start"]' });
  }

  if (config.ciProvider === 'github') {
    root.push({
      id: 'github-wf',
      name: '.github',
      type: FileType.FOLDER,
      children: [
        {
          id: 'workflows',
          name: 'workflows',
          type: FileType.FOLDER,
          children: [
            {
              id: 'ci-yml',
              name: 'ci.yml',
              type: FileType.FILE,
              language: 'yaml',
              isNew: true,
              content: 'name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - run: npm ci\n      - run: npm test'
            }
          ]
        }
      ]
    });
  }

  // 2. Add Source Code
  const srcChildren: FileNode[] = [];
  
  // In a real app, this splits the rawInput by detected filenames.
  // Here we simulate wrapping the user's raw input.
  const ext = config.language === 'TypeScript' ? 'ts' : 'js';
  const reactExt = config.language === 'TypeScript' ? 'tsx' : 'jsx';
  
  srcChildren.push({
    id: 'entry',
    name: `index.${config.framework === 'React' ? reactExt : ext}`,
    type: FileType.FILE,
    language: config.language.toLowerCase(),
    content: `// RepoGen: Auto-generated entry point\n\n${rawInput.slice(0, 200)}...\n\n// ... (rest of your code)`
  });

  if (config.includeTests) {
    srcChildren.push({
      id: 'test',
      name: `App.test.${ext}`,
      type: FileType.FILE,
      language: config.language.toLowerCase(),
      isNew: true,
      content: `test('renders correctly', () => {\n  expect(true).toBe(true);\n});`
    });
  }

  root.push({
    id: 'src-folder',
    name: 'src',
    type: FileType.FOLDER,
    children: srcChildren
  });

  return root;
};