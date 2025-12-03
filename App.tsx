import React, { useState } from 'react';
import { AppStep, DetectionResult, FileNode, INITIAL_CONFIG, RepoConfig } from './types';
import { StepUpload } from './components/Steps/1-Upload';
import { StepDetection } from './components/Steps/2-Detection';
import { StepConfig } from './components/Steps/3-Config';
import { StepPreview } from './components/Steps/4-Preview';
import { StepGenerate } from './components/Steps/5-Generate';
import { ApiKeyInput } from './components/ApiKeyInput';
import { Box, Terminal, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [rawInput, setRawInput] = useState<string>('');
  const [config, setConfig] = useState<RepoConfig>(INITIAL_CONFIG);
  const [generatedFiles, setGeneratedFiles] = useState<FileNode[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Step Handlers
  const handleUploadNext = (input: string) => {
    setRawInput(input);
    setStep(AppStep.DETECTION);
  };

  const handleDetectionNext = (result: DetectionResult) => {
    // Merge detection result into config default overrides
    setConfig(prev => ({
      ...prev,
      language: result.language,
      framework: result.framework,
      projectType: result.suggestedProjectType,
      useTypeScript: result.language === 'TypeScript'
    }));
    setStep(AppStep.CONFIG);
  };

  const handleConfigNext = () => setStep(AppStep.PREVIEW);
  const handlePreviewNext = () => setStep(AppStep.GENERATE);
  const handleReset = () => {
    setStep(AppStep.UPLOAD);
    setRawInput('');
    setConfig(INITIAL_CONFIG);
    setGeneratedFiles([]);
  };

  // Back Handlers
  const goBack = () => setStep(Math.max(0, step - 1));

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-white font-sans selection:bg-brand-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer group"
            title="Return to home"
          >
            <div className="bg-brand-600 p-2 rounded-lg shadow-lg shadow-brand-900/50 group-hover:shadow-brand-900/70 transition-shadow">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center">
                RepoGen
                <span className="ml-2 text-[10px] bg-brand-900/50 text-brand-300 border border-brand-700/50 px-2 py-0.5 rounded-full font-mono">V2 BETA</span>
              </h1>
            </div>
          </button>

          {/* Demo GIF - Platform Wide */}
          <div className="flex-1 flex justify-center mx-8">
            <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTBuNmZ5cmhpdzZ4MWxoM3ZldmMxczQ3dzhpdnVpaDc3M2U5YW5qaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OrbDKvEgYsscoV9XpD/giphy.gif" alt="RepoGen Demo" className="h-12 w-auto rounded-lg shadow-md" />
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {[AppStep.UPLOAD, AppStep.DETECTION, AppStep.CONFIG, AppStep.PREVIEW, AppStep.GENERATE].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${step >= s ? 'bg-brand-500' : 'bg-dark-border'} transition-colors`} />
                {s !== AppStep.GENERATE && <div className={`w-8 h-0.5 mx-1 ${step > s ? 'bg-brand-800' : 'bg-dark-border'} transition-colors`} />}
              </div>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <ApiKeyInput onKeyChange={setHasApiKey} />
            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
              <Terminal className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* API Key Announcement Banner */}
      {!hasApiKey && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 py-2 px-4 animate-in slide-in-from-top-2">
          <div className="max-w-7xl mx-auto flex items-center justify-center text-yellow-200 text-sm">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span>
              <strong>Note:</strong> A Gemini API key is required for real-time code generation. Without it, the app runs in demo mode with simulated outputs.
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        <div className="flex-1 relative">
          {step === AppStep.UPLOAD && <StepUpload onNext={handleUploadNext} />}
          {step === AppStep.DETECTION && <StepDetection rawInput={rawInput} onNext={handleDetectionNext} onBack={goBack} />}
          {step === AppStep.CONFIG && <StepConfig config={config} setConfig={setConfig} onNext={handleConfigNext} onBack={goBack} />}
          {step === AppStep.PREVIEW && <StepPreview config={config} rawInput={rawInput} onNext={handlePreviewNext} onBack={goBack} onFilesGenerated={setGeneratedFiles} />}
          {step === AppStep.GENERATE && <StepGenerate config={config} rawInput={rawInput} onReset={handleReset} onBack={goBack} existingFiles={generatedFiles} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border py-6 mt-auto bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-600">
          <p>&copy; {new Date().getFullYear()} RepoGen Inc. {hasApiKey ? 'Powered by Google Gemini AI.' : 'Generated code is processed locally in demo mode.'}</p>
        </div>
      </footer>
    </div>
  );
};

export default App;