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

  // 3. GitHub Configuration
  const githubChildren: FileNode[] = [];
  const workflowsChildren: FileNode[] = [];

  // Workflows
  if (config.ciProvider === 'github' || config.githubWorkflows?.includes('ci')) {
    workflowsChildren.push({
      id: 'ci-yml', name: 'ci.yml', type: FileType.FILE, language: 'yaml', isNew: true,
      content: 'name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - run: npm ci\n      - run: npm test'
    });
  }
  if (config.githubWorkflows?.includes('release')) {
    workflowsChildren.push({
      id: 'release-yml', name: 'release.yml', type: FileType.FILE, language: 'yaml', isNew: true,
      content: 'name: Release\non:\n  push:\n    tags:\n      - "v*"\njobs:\n  release:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - name: Create Release\n        uses: softprops/action-gh-release@v1'
    });
  }
  if (config.githubWorkflows?.includes('codeql')) {
    workflowsChildren.push({
      id: 'codeql-yml', name: 'codeql.yml', type: FileType.FILE, language: 'yaml', isNew: true,
      content: 'name: "CodeQL"\non:\n  push:\n    branches: [ "main" ]\n  pull_request:\n    branches: [ "main" ]\njobs:\n  analyze:\n    name: Analyze\n    runs-on: ubuntu-latest\n    steps:\n    - name: Checkout repository\n      uses: actions/checkout@v3\n    - name: Initialize CodeQL\n      uses: github/codeql-action/init@v2\n    - name: Perform CodeQL Analysis\n      uses: github/codeql-action/analyze@v2'
    });
  }
  if (config.githubWorkflows?.includes('stale')) {
    workflowsChildren.push({
      id: 'stale-yml', name: 'stale.yml', type: FileType.FILE, language: 'yaml', isNew: true,
      content: 'name: "Close stale issues"\non:\n  schedule:\n  - cron: "30 1 * * *"\njobs:\n  stale:\n    runs-on: ubuntu-latest\n    steps:\n    - uses: actions/stale@v8\n      with:\n        stale-issue-message: "This issue is stale because it has been open 30 days with no activity."\n        days-before-stale: 30\n        days-before-close: 5'
    });
  }

  if (workflowsChildren.length > 0) {
    githubChildren.push({
      id: 'workflows', name: 'workflows', type: FileType.FOLDER, children: workflowsChildren
    });
  }

  // Dependabot (Config)
  if (config.githubWorkflows?.includes('dependabot')) {
    githubChildren.push({
      id: 'dependabot-yml', name: 'dependabot.yml', type: FileType.FILE, language: 'yaml', isNew: true,
      content: 'version: 2\nupdates:\n  - package-ecosystem: "npm"\n    directory: "/"\n    schedule:\n      interval: "weekly"'
    });
  }

  // Templates
  const issueTemplates: FileNode[] = [];
  if (config.githubTemplates?.includes('bug_report')) {
    issueTemplates.push({
      id: 'bug-report', name: 'bug_report.md', type: FileType.FILE, language: 'markdown', isNew: true,
      content: '---\nname: Bug report\nabout: Create a report to help us improve\ntitle: ""\nlabels: ""\nassignees: ""\n---\n\n**Describe the bug**\nA clear and concise description of what the bug is.'
    });
  }
  if (config.githubTemplates?.includes('feature_request')) {
    issueTemplates.push({
      id: 'feature-request', name: 'feature_request.md', type: FileType.FILE, language: 'markdown', isNew: true,
      content: '---\nname: Feature request\nabout: Suggest an idea for this project\ntitle: ""\nlabels: ""\nassignees: ""\n---\n\n**Is your feature request related to a problem? Please describe.**\nA clear and concise description of what the problem is.'
    });
  }
  if (issueTemplates.length > 0) {
    githubChildren.push({
      id: 'issue-templates', name: 'ISSUE_TEMPLATE', type: FileType.FOLDER, children: issueTemplates
    });
  }

  if (config.githubTemplates?.includes('pull_request')) {
    githubChildren.push({
      id: 'pr-template', name: 'pull_request_template.md', type: FileType.FILE, language: 'markdown', isNew: true,
      content: '## Description\n\nPlease include a summary of the change and which issue is fixed.\n\n## Type of change\n\n- [ ] Bug fix\n- [ ] New feature\n- [ ] Breaking change'
    });
  }

  // Community
  if (config.githubCommunity?.includes('contributing')) {
    githubChildren.push({
      id: 'contributing', name: 'CONTRIBUTING.md', type: FileType.FILE, language: 'markdown', isNew: true,
      content: '# Contributing to ' + config.name + '\n\nThank you for considering contributing! Please read our guidelines before submitting a PR.'
    });
  }
  if (config.githubCommunity?.includes('code_of_conduct')) {
    githubChildren.push({
      id: 'coc', name: 'CODE_OF_CONDUCT.md', type: FileType.FILE, language: 'markdown', isNew: true,
      content: '# Contributor Covenant Code of Conduct\n\n## Our Pledge\n\nWe pledge to make participation in our project a harassment-free experience for everyone.'
    });
  }
  if (config.githubCommunity?.includes('security')) {
    githubChildren.push({
      id: 'security', name: 'SECURITY.md', type: FileType.FILE, language: 'markdown', isNew: true,
      content: '# Security Policy\n\n## Supported Versions\n\n| Version | Supported |\n| ------- | ------------------ |\n| 1.0.x   | :white_check_mark: |\n\n## Reporting a Vulnerability\n\nPlease email security@example.com.'
    });
  }
  if (config.githubCommunity?.includes('support')) {
    githubChildren.push({
      id: 'support', name: 'SUPPORT.md', type: FileType.FILE, language: 'markdown', isNew: true,
      content: '# Support\n\nIf you need help, please check the discussions tab or open an issue.'
    });
  }

  // Codeowners
  if (config.githubCodeowners) {
    githubChildren.push({
      id: 'codeowners', name: 'CODEOWNERS', type: FileType.FILE, language: 'plaintext', isNew: true,
      content: '* @' + config.author.replace(/\s+/g, '')
    });
  }

  if (githubChildren.length > 0) {
    root.push({
      id: 'github-folder', name: '.github', type: FileType.FOLDER, children: githubChildren
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