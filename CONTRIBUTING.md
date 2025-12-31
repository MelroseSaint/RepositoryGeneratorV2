# Contributing to RepoGen V2

Thank you for your interest in contributing to RepoGen V2! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to maintain a welcoming and inclusive environment for all contributors.

## Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Commit your changes: `git commit -m 'Add some amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## Development Setup

1. Clone your fork:
   ```bash
   git clone https://github.com/your-username/RepositoryGeneratorV2.git
   cd RepositoryGeneratorV2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Run tests:
   ```bash
   npm test
   ```

5. Build the project:
   ```bash
   npm run build
   ```

## Coding Standards

### TypeScript
- All code must pass TypeScript type checking: `npx tsc --noEmit`
- No `@ts-ignore` or `@ts-expect-error` comments
- Use strict type checking (already configured in tsconfig.json)

### Testing
- Write tests for new functionality
- All tests must pass before submitting a PR
- Use Vitest for unit tests

### Code Style
- Follow existing code conventions in the project
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused

## Project Structure

```
src/
├── components/       # React components
├── services/        # AI and business logic services
├── types.ts         # TypeScript type definitions
├── firebase.js      # Firebase integration
└── App.tsx          # Main application component
tests/               # Test files
examples/            # Example usage and demos
config/              # Configuration files
```

## Commit Message Guidelines

Follow conventional commits format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:
```
feat: add support for multiple AI providers
```

## Pull Request Process

1. Ensure your code passes all tests
2. Update documentation if needed
3. Add tests for new features
4. Ensure your PR description clearly describes the changes
5. Wait for code review and address feedback

## Issue Reporting

When reporting bugs, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (Node version, OS, browser)
- Screenshots if applicable

## Feature Requests

For feature requests:
- Describe the feature and its use case
- Explain why it would be beneficial
- Provide examples if possible

## Questions

Feel free to open an issue for questions about the project or its implementation.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
