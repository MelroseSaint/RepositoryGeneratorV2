export enum AppStep {
  UPLOAD = 0,
  DETECTION = 1,
  BLUEPRINT_SELECTION = 2,
  CONFIG = 3,
  PREVIEW = 4,
  GENERATE = 5
}

export enum FileType {
  FILE = 'file',
  FOLDER = 'folder'
}

export interface FileNode {
  id: string;
  name: string;
  type: FileType;
  content?: string; // Only for files
  language?: string;
  children?: FileNode[];
  isNew?: boolean; // For changelog visualization
  isProtected?: boolean; // V2: Marks critical files as protected in VS Code
}

export interface DetectionResult {
  language: string;
  framework: string;
  confidence: number;
  suggestedProjectType: string;
  detectedFiles: number;
}

// V2: Blueprint replaces flexible config
export interface Blueprint {
  id: string;
  name: string;
  description: string;
  category: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'desktop' | 'cli' | 'library' | 'game' | 'data';
  techStack: {
    language: string;
    framework: string;
    runtime?: string;
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
    bundler?: 'vite' | 'webpack' | 'none';
  };
  features: string[]; // Fixed features, no user choice
  ciProvider: 'github' | 'gitlab' | 'none';
  includeTests: boolean;
  includeDocker: boolean;
  includeLinting: boolean;
  githubWorkflows: string[];
  githubTemplates: string[];
  githubCommunity: string[];
  githubCodeowners: boolean;
  ideConfig: string[];
  version: string; // Versioned for immutability
  securityBaseline: string[]; // No hardcoded secrets, isolation, etc.
  failureMap: string[]; // Known weak points
  evolutionPath: string[]; // When to refactor/scale
}

// V2: Repository Contract - machine-readable, explicit, no defaults
export interface RepositoryContract {
  name: string;
  description: string;
  author: string;
  license: string;
  blueprintId: string;
  blueprintVersion: string;
  runtimeRequirements: {
    nodeVersion?: string;
    pythonVersion?: string;
    goVersion?: string;
    rustVersion?: string;
    os: string[];
    dependencies: { [key: string]: string }; // Pinned versions, no ranges
  };
  bootstrapCommand: string; // One-command rule
  healthCheckCommand: string;
  protectedFiles: string[]; // Files AI cannot modify
  complianceArtifacts: string[]; // Audit logs, etc.
  failureDiagnosis: {
    [errorCode: string]: {
      severity: 'low' | 'medium' | 'high' | 'critical';
      cause: string;
      remediation: string;
    };
  };
}

// V2: Validation Result from simulation
export interface ValidationResult {
  success: boolean;
  installSuccess: boolean;
  bootSuccess: boolean;
  dependencyCheck: boolean;
  contractValid: boolean;
  errors: string[];
  warnings: string[];
  report: string; // Human-readable failure diagnosis
}

// V2: Audit Log for governance
export interface AuditLog {
  timestamp: string;
  action: string;
  actor: 'user' | 'ai' | 'system';
  target: string; // File or component
  success: boolean;
  details: any;
  complianceCheck: boolean;
}

// V2: Failure Report for diagnosis
export interface FailureReport {
  timestamp: string;
  phase: 'validation' | 'generation' | 'install' | 'boot';
  errorCode: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  remediation: string;
  context: any;
}

// V2: RepoConfig now blueprint-based, minimal user input
export interface RepoConfig {
  name: string;
  description: string;
  author: string;
  license: string;
  blueprintId: string; // Selected blueprint
  contract: RepositoryContract; // Generated from blueprint
  auditLogs: AuditLog[]; // Track all actions
}

export const BLUEPRINTS: Blueprint[] = [
  {
    id: 'production-web-platform',
    name: 'Production Web Platform',
    description: 'Battle-tested React/Next.js stack for scalable web applications',
    category: 'frontend',
    techStack: {
      language: 'TypeScript',
      framework: 'Next.js',
      runtime: 'Node.js',
      packageManager: 'npm',
      bundler: 'none'
    },
    features: ['auth', 'db', 'api', 'ui', 'i18n', 'analytics', 'seo', 'pwa'],
    ciProvider: 'github',
    includeTests: true,
    includeDocker: true,
    includeLinting: true,
    githubWorkflows: ['ci', 'release', 'security'],
    githubTemplates: ['bug_report', 'feature_request', 'pull_request'],
    githubCommunity: ['contributing', 'code_of_conduct', 'security'],
    githubCodeowners: true,
    ideConfig: ['vscode', 'editorconfig'],
    version: '1.0.0',
    securityBaseline: ['no-hardcoded-secrets', 'isolation', 'least-privilege'],
    failureMap: ['dependency-conflicts', 'build-timeouts', 'runtime-memory'],
    evolutionPath: ['microservices-split', 'cdn-integration', 'serverless-migration']
  },
  {
    id: 'saas-backend',
    name: 'SaaS Backend',
    description: 'Scalable Node.js/Express API with database and authentication',
    category: 'backend',
    techStack: {
      language: 'TypeScript',
      framework: 'Express',
      runtime: 'Node.js',
      packageManager: 'npm',
      bundler: 'none'
    },
    features: ['auth', 'db', 'api'],
    ciProvider: 'github',
    includeTests: true,
    includeDocker: true,
    includeLinting: true,
    githubWorkflows: ['ci', 'release'],
    githubTemplates: ['bug_report', 'feature_request', 'pull_request'],
    githubCommunity: ['contributing', 'code_of_conduct'],
    githubCodeowners: true,
    ideConfig: ['vscode', 'editorconfig'],
    version: '1.0.0',
    securityBaseline: ['no-hardcoded-secrets', 'isolation', 'least-privilege'],
    failureMap: ['db-connection-failures', 'auth-bypasses', 'rate-limit-breaches'],
    evolutionPath: ['microservices-split', 'graphql-migration', 'serverless-functions']
  },
  {
    id: 'cli-commander',
    name: 'CLI Pro Tool',
    description: 'Professional CLI tool with automated distribution and feature-rich interface',
    category: 'cli',
    techStack: {
      language: 'TypeScript',
      framework: 'Commander',
      runtime: 'Node.js',
      packageManager: 'npm',
      bundler: 'none'
    },
    features: ['ui', 'docs'],
    ciProvider: 'github',
    includeTests: true,
    includeDocker: false,
    includeLinting: true,
    githubWorkflows: ['ci', 'release'],
    githubTemplates: ['bug_report', 'feature_request'],
    githubCommunity: ['contributing', 'security'],
    githubCodeowners: false,
    ideConfig: ['vscode'],
    version: '1.0.0',
    securityBaseline: ['no-unsafe-exec', 'input-sanitization'],
    failureMap: ['binary-size-bloat', 'cross-platform-path-issues'],
    evolutionPath: ['native-binary-compilation', 'plugin-system-architecture']
  },
  {
    id: 'ts-library-pro',
    name: 'TypeScript Library Pro',
    description: 'Modern TypeScript library with dual ESM/CJS support and automated publishing',
    category: 'library',
    techStack: {
      language: 'TypeScript',
      framework: 'NPM',
      runtime: 'Node.js',
      packageManager: 'npm',
      bundler: 'vite'
    },
    features: ['docs'],
    ciProvider: 'github',
    includeTests: true,
    includeDocker: false,
    includeLinting: true,
    githubWorkflows: ['ci', 'release', 'security'],
    githubTemplates: ['bug_report'],
    githubCommunity: ['contributing', 'code_of_conduct', 'security'],
    githubCodeowners: true,
    ideConfig: ['vscode', 'editorconfig'],
    version: '1.0.0',
    securityBaseline: ['supply-chain-security', 'audit-logging'],
    failureMap: ['esm-cjs-compatibility', 'tree-shaking-issues'],
    evolutionPath: ['monorepo-migration', 'platform-specific-optimizations']
  }
  // Add more blueprints as needed
];

export const PROJECT_TYPES = [
  'Frontend Web', 'Backend API', 'Fullstack App', 'Mobile App', 'Desktop App', 'CLI Tool', 'Library/Package', 'Game', 'Data Science'
];

export const FRAMEWORKS: Record<string, string[]> = {
  'Frontend Web': ['React', 'Vue', 'Angular', 'Svelte', 'Solid', 'Preact', 'Lit', 'Alpine', 'Qwik', 'Vanilla HTML/JS'],
  'Backend API': ['Node.js (Express)', 'Node.js (NestJS)', 'Node.js (Fastify)', 'Python (Django)', 'Python (Flask)', 'Python (FastAPI)', 'Go (Gin)', 'Go (Fiber)', 'Rust (Actix)', 'Rust (Axum)', 'Java (Spring Boot)', 'C# (.NET API)'],
  'Fullstack App': ['Next.js', 'Nuxt', 'Remix', 'SvelteKit', 'Astro', 'SolidStart', 'Laravel', 'Ruby on Rails', 'Phoenix', 'Django'],
  'Mobile App': ['React Native', 'Flutter', 'Expo', 'Ionic', 'NativeScript', 'Kotlin Multiplatform'],
  'Desktop App': ['Electron', 'Tauri', 'Flutter Desktop', '.NET MAUI'],
  'CLI Tool': ['Node.js (Commander)', 'Rust (Clap)', 'Go (Cobra)', 'Python (Typer)'],
  'Library/Package': ['TypeScript (NPM)', 'Python (PyPI)', 'Rust (Crate)', 'Go (Module)'],
  'Game': ['Unity (C#)', 'Godot (GDScript)', 'Bevy (Rust)', 'Phaser (JS)'],
  'Data Science': ['Jupyter Notebook', 'Streamlit', 'Dash', 'R Shiny']
};

export const IDE_CONFIGS = [
  { id: 'vscode', label: 'VS Code (.vscode)' },
  { id: 'editorconfig', label: 'EditorConfig (.editorconfig)' },
  { id: 'idea', label: 'IntelliJ / WebStorm (.idea)' },
  { id: 'sublime', label: 'Sublime Text' },
  { id: 'devcontainer', label: 'DevContainers' },
  { id: 'gitpod', label: 'Gitpod' }
];

export const FEATURES = [
  { id: 'auth', label: 'Authentication (Auth.js / Firebase)' },
  { id: 'db', label: 'Database Setup (Prisma / Mongoose)' },
  { id: 'api', label: 'API Client (Axios / TanStack Query)' },
  { id: 'ui', label: 'UI Components (Shadcn / Tailwind)' },
  { id: 'i18n', label: 'Internationalization (i18n)' },
  { id: 'analytics', label: 'Analytics Setup' },
  { id: 'seo', label: 'SEO Optimization' },
  { id: 'pwa', label: 'PWA Support' },
  { id: 'docs', label: 'Advanced Documentation (Docs, Changelog)' }
];

export const INITIAL_CONFIG: RepoConfig = {
  name: 'my-awesome-repo',
  description: 'Generated by RepoGen V2',
  author: 'Dev User',
  license: 'MIT',
  blueprintId: 'production-web-platform',
  contract: {} as RepositoryContract, // Will be populated
  auditLogs: []
};

export interface GenerationLog {
  timestamp: string;
  level: 'info' | 'warn' | 'success';
  message: string;
}
