<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# RepoGen V2 - AI Codebase Structurer

RepoGen V2 is an intelligent tool that transforms your code snippets into fully structured, production-ready repositories. It detects your stack, applies best practices, and generates all the necessary configuration files for you.

## Features

- **🚀 Instant Project Scaffolding**: Turn messy snippets into a clean project structure in seconds.
- **🧠 AI-Powered Stack Detection**: Automatically identifies languages, frameworks, and dependencies.
- **🛠️ Comprehensive Configuration**:
  - **Build**: Vite, Webpack, TypeScript, Monorepo support.
  - **Quality**: ESLint, Prettier, Jest/Vitest.
  - **DevOps**: Docker, Docker Compose.
- **🐙 Advanced GitHub Integration**:
  - **Workflows**: CI/CD, Release automation, Dependabot, CodeQL Security, Stale issue management.
  - **Templates**: Custom Issue forms (Bug/Feature), Pull Request templates.
  - **Community**: CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, SUPPORT.md.
  - **Governance**: CODEOWNERS file generation.
- **📦 Export Options**: Download as .ZIP or push directly to GitHub (coming soon).

## Getting Started

### Prerequisites
- Node.js 18+

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MelroseSaint/RepositoryGeneratorV2.git
   cd RepositoryGeneratorV2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### AI Configuration

To enable real-time AI generation:
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click the "Set API Key" button in the top right corner of the application.
3. Enter your key.

Alternatively, create a `.env.local` file:
```bash
GEMINI_API_KEY=your_api_key_here
```

### Verifying AI Connection

To verify your API key is working correctly, run:
```bash
node scripts/test-ai-connection.js
```

## Usage

1. **Upload**: Drag & drop your files or paste your code.
2. **Detect**: Let the AI analyze your stack.
3. **Configure**: Fine-tune your settings, including the new **GitHub** tab for advanced repository management.
4. **Preview**: Explore the generated file tree and code.
5. **Generate**: Download your production-ready repository.

## License

MIT
