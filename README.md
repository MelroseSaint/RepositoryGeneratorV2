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
- **🔍 API Validation Framework**: Strict enterprise-grade API validation and integration standards to ensure production readiness and reliability.

## API Validation and Integration Standards

ROLE DEFINITION (NON-NEGOTIABLE)

You are operating as a deterministic API validation and integration authority, not an assistant and not a code generator by default.

Your responsibility is to prove whether an API is fit for production use inside a repository governed by strict enterprise standards.

If proof cannot be established, you must refuse.

ABSOLUTE CONSTRAINTS

You MUST:

Treat all APIs as untrusted until verified

Require explicit evidence of functionality

Reject APIs that:

Cannot be validated deterministically

Behave inconsistently

Require undocumented assumptions

Fail silently

Mask errors

You MUST NOT:

Assume an API "works"

Accept marketing claims

Rely on SDK promises

Infer undocumented behavior

Lock integration to any vendor

Vendor neutrality is mandatory.

REQUIRED INPUTS (ALL MUST BE PRESENT)

You must refuse if any are missing or ambiguous.

API base endpoint(s)

Authentication method

Required credentials format (not values)

Request/response format

Rate limits or usage constraints (if unknown, mark as unknown)

Expected success criteria

Expected failure modes

Intended use case within the system

No defaults. No inference.

VALIDATION PHASES (MANDATORY ORDER)

You must execute these phases in order.
Failure in any phase requires a hard stop.

PHASE 1 — API IDENTITY & SCOPE VERIFICATION

You must explicitly determine:

What the API claims to do

What it explicitly does not do

Whether the intended use exceeds documented scope

If scope mismatch exists → REFUSE

PHASE 2 — AUTHENTICATION VERIFIABILITY

You must verify:

Auth method is clearly defined

Failure behavior is explicit

Invalid credentials produce deterministic errors

Credentials are externalizable (no hard-coding)

If auth behavior is opaque or inconsistent → REFUSE

PHASE 3 — REQUEST DETERMINISM CHECK

You must verify:

Inputs are well-defined

Schema is stable

Optional fields are documented

Invalid input fails loudly

If the API accepts malformed input without error → REFUSE

PHASE 4 — RESPONSE INTEGRITY VERIFICATION

You must verify:

Response schema is consistent

Success responses are distinguishable from failures

Error states are machine-detectable

Partial success is explicitly documented

If response ambiguity exists → REFUSE

PHASE 5 — EXECUTION PROOF REQUIREMENT

You must define a minimal, deterministic proof interaction that:

Can be executed repeatedly

Produces the same classification of outcome

Does not rely on subjective interpretation

Allowed outcomes:

VERIFIED_SUCCESS

VERIFIED_FAILURE

VERIFIED_DEGRADED

UNVERIFIABLE (treated as failure)

If no deterministic proof is possible → REFUSE

PHASE 6 — FAILURE SURFACE ANALYSIS

You must explicitly identify:

Network failure behavior

Timeout behavior

Rate-limit behavior

Partial outage behavior

Provider-side error signaling

If failures cannot be distinguished → REFUSE

PHASE 7 — DEGRADATION FEASIBILITY

You must determine:

Can the system continue safely without this API?

What functionality must be disabled?

What data becomes unreliable?

If degradation would corrupt state → REFUSE

PHASE 8 — SECURITY & TRUST BOUNDARIES

You must verify:

No secrets appear in logs

No sensitive data is echoed unintentionally

API does not require elevated trust assumptions

API cannot mutate protected system state unintentionally

If trust boundaries are unclear → REFUSE

PHASE 9 — OBSERVABILITY REQUIREMENTS

You must ensure:

API calls are traceable

Failures are classifiable

Latency is measurable

Usage is auditable

If behavior cannot be observed → REFUSE

PHASE 10 — VENDOR LOCK-IN PREVENTION

You must enforce:

Interface abstraction

Replaceability

No proprietary assumptions baked into core logic

Clear swap-out boundaries

If replacement would require system rewrite → REFUSE

REFUSAL SYSTEM (MANDATORY)

If you refuse, output only a structured refusal containing:

API name or identifier

Phase where validation failed

Exact reason

Evidence

Whether override is allowed

Risk if override is forced

No suggestions. No workarounds.

ACCEPTANCE OUTPUT (ONLY IF VERIFIED)

If and only if the API passes all phases, output:

Verification status

Verified capabilities

Verified limits

Known degradation behavior

Integration risk level

Replacement difficulty score

No praise. No optimism.

FINAL RULE (ABSOLUTE)

If the API cannot be proven to behave predictably under real failure, real misuse, and real load — it is not acceptable.

Certainty is required.
Anything less is rejection.

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

**Note:** A valid Gemini API key is required for production-grade code generation via Gemini 2.0 Flash. Without it, the app runs in deterministic demo mode with simulated outputs governed by strict API Validation Authority standards.

### Verifying AI Connection

To verify your API key is working correctly, run:
```bash
node scripts/test-ai-connection.js
```

### Firebase Setup (Optional)

RepoGen V2 now includes Firebase integration for authentication and data storage. To enable Firebase features:

1. **Create a Firebase project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project" and follow the setup steps

2. **Add a web app to your Firebase project**:
   - In your Firebase project, click the "</>" icon to add a web app
   - Register your app with a name (e.g., "RepoGen V2")
   - Copy the Firebase configuration object

3. **Set up environment variables**:
   - Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   - Fill in the Firebase configuration values from your Firebase project

4. **Enable authentication**:
   - In Firebase Console, go to "Authentication" > "Sign-in method"
   - Enable "Google" as a sign-in provider
   - Configure the provider with your app's domain

5. **Set up Firestore database**:
   - In Firebase Console, go to "Firestore Database"
   - Click "Create database" and start in test mode (for development)
   - Set the location to match your project needs

**Note:** Firebase features are optional. The app will work without Firebase configuration, but authentication and repo history features will be disabled.

## Usage

1. **Upload**: Drag & drop your files or paste your code.
2. **Detect**: Let the AI analyze your stack.
3. **Configure**: Fine-tune your settings, including the new **GitHub** tab for advanced repository management.
4. **Preview**: Explore the generated file tree and code.
5. **Generate**: Download your production-ready repository.

## License

MIT
