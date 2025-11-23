import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Code2, Github, Loader2 } from 'lucide-react';
import { fetchRepoContents } from '../../services/githubService';

interface StepUploadProps {
  onNext: (input: string) => void;
}

export const StepUpload: React.FC<StepUploadProps> = ({ onNext }) => {
  const [textInput, setTextInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState<'file' | 'github'>('file');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      setTextInput(`// Simulated content from dropped file...\nconst app = 'loaded';`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setTextInput(`// Simulated content from uploaded file...\nimport React from 'react';`);
    }
  };

  const validateCode = (content: string): boolean => {
    // Check if content is too short
    if (content.trim().length < 10) {
      setError("Content is too short. Please paste actual code.");
      return false;
    }

    // Code indicators - look for common programming patterns
    const codeIndicators = [
      /function\s+\w+/i,           // function declarations
      /const\s+\w+\s*=/i,          // const declarations
      /let\s+\w+\s*=/i,            // let declarations
      /var\s+\w+\s*=/i,            // var declarations
      /class\s+\w+/i,              // class declarations
      /import\s+.*from/i,          // import statements
      /require\(['"]/i,            // require statements
      /export\s+(default|const|function|class)/i, // export statements
      /<\w+[^>]*>/,                // HTML/JSX tags
      /\{[\s\S]*\}/,               // code blocks
      /\w+\s*\([^)]*\)\s*\{/,      // function calls with blocks
      /if\s*\(/i,                  // if statements
      /for\s*\(/i,                 // for loops
      /while\s*\(/i,               // while loops
      /\/\/.+/,                    // single-line comments
      /\/\*[\s\S]*?\*\//,          // multi-line comments
      /package\.json/i,            // package.json reference
      /\.tsx?|\.jsx?|\.py|\.java|\.go|\.rs/i, // file extensions
    ];

    // Check if content matches any code indicators
    const hasCodeIndicators = codeIndicators.some(pattern => pattern.test(content));

    // Check for non-code patterns (common in spam/random text)
    const nonCodePatterns = [
      /^[^{}\[\]();]+$/,           // No code-like punctuation at all
      /^[\d\s]+$/,                 // Only numbers and spaces
      /^[a-zA-Z\s]+$/,             // Only letters and spaces (likely prose)
    ];

    const isLikelyNotCode = nonCodePatterns.some(pattern =>
      pattern.test(content) && content.length > 100
    );

    if (isLikelyNotCode && !hasCodeIndicators) {
      setError("This doesn't appear to be code. Please paste actual source code, configuration files, or a GitHub URL.");
      return false;
    }

    if (!hasCodeIndicators) {
      setError("Unable to detect code patterns. Please paste valid source code or configuration files.");
      return false;
    }

    return true;
  };

  const handleNext = async () => {
    setError(null); // Clear previous errors

    if (importMode === 'github' && textInput.includes('github.com')) {
      setIsLoading(true);
      try {
        // Extract URL from the comment if present, or use raw input
        const urlMatch = textInput.match(/https:\/\/github\.com\/[\w-]+\/[\w-]+/);
        const url = urlMatch ? urlMatch[0] : textInput;

        const content = await fetchRepoContents(url);
        onNext(content);
      } catch (err) {
        setError("Failed to fetch GitHub repository. Please check the URL and try again.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Validate code before proceeding
      if (!validateCode(textInput)) {
        return; // Error is already set by validateCode
      }
      onNext(textInput);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Import your Codebase</h2>
        <p className="text-gray-400">Paste your snippets, upload a zip, or import from GitHub.</p>
      </div>

      {/* Upload & Paste Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
        {/* Left: Import Options */}
        <div className="flex flex-col bg-dark-surface rounded-xl border border-dark-border overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-dark-border">
            <button
              onClick={() => { setImportMode('file'); setError(null); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${importMode === 'file' ? 'bg-dark-bg text-brand-400 border-b-2 border-brand-500' : 'text-gray-400 hover:text-white'}`}
            >
              Upload Files
            </button>
            <button
              onClick={() => { setImportMode('github'); setError(null); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${importMode === 'github' ? 'bg-dark-bg text-brand-400 border-b-2 border-brand-500' : 'text-gray-400 hover:text-white'}`}
            >
              GitHub Repo
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
            {error && (
              <div className="absolute top-4 left-4 right-4 bg-red-500/10 border border-red-500/50 text-red-400 text-xs p-2 rounded text-center z-10">
                {error}
              </div>
            )}

            {importMode === 'file' ? (
              <div
                className={`w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 transition-all cursor-pointer ${isDragging ? 'border-brand-500 bg-brand-900/20' : 'border-dark-border bg-dark-bg/50 hover:border-brand-500/50'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                <div className="w-12 h-12 bg-dark-surface rounded-full flex items-center justify-center mb-3 border border-dark-border">
                  <UploadCloud className="w-6 h-6 text-brand-400" />
                </div>
                <p className="text-sm text-gray-300 font-medium mb-1">Click or Drag Files</p>
                <p className="text-xs text-gray-500 text-center">Supports .zip, .tar, or folders</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in">
                <div className="w-12 h-12 bg-dark-surface rounded-full flex items-center justify-center mb-3 border border-dark-border">
                  <Github className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-medium text-white mb-4">Import Public Repository</h3>
                <input
                  type="text"
                  placeholder="https://github.com/username/repo"
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-brand-500 outline-none mb-2 placeholder-gray-600"
                  onChange={(e) => {
                    setTextInput(e.target.value);
                  }}
                />
                <p className="text-xs text-gray-500 text-center">Enter a valid GitHub URL to analyze</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Paste Area */}
        <div className="flex flex-col bg-dark-surface rounded-xl border border-dark-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border bg-dark-bg/50">
            <div className="flex items-center space-x-2 text-gray-400">
              <Code2 className="w-4 h-4" />
              <span className="text-sm font-medium">Paste Code</span>
            </div>
            <button onClick={() => setTextInput('')} className="text-xs text-gray-500 hover:text-red-400">
              Clear
            </button>
          </div>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={importMode === 'github' ? "Enter GitHub URL on the left..." : "// Paste your messy code here..."}
            className="flex-1 bg-transparent p-4 font-mono text-sm text-gray-300 focus:outline-none resize-none placeholder-gray-600"
            readOnly={importMode === 'github'}
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-8 flex justify-end">
        <button
          disabled={!textInput.trim() || isLoading}
          onClick={handleNext}
          className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-brand-900/20 flex items-center transition-all transform hover:-translate-y-0.5"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <FileText className="w-5 h-5 mr-2" />
          )}
          {isLoading ? 'Fetching Repo...' : 'Analyze & Detect'}
        </button>
      </div>

      {/* Demo Preview */}
      <div className="mt-12 max-w-4xl mx-auto">
        <div className="relative group rounded-xl overflow-hidden shadow-2xl border border-dark-border bg-dark-surface">
          <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/80 to-transparent z-10 pointer-events-none" />
          <img
            src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTBuNmZ5cmhpdzZ4MWxoM3ZldmMxczQ3dzhpdnVpaDc3M2U5YW5qaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OrbDKvEgYsscoV9XpD/giphy.gif"
            alt="App Demonstration"
            className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
          />
          <div className="absolute bottom-4 left-4 z-20">
            <p className="text-sm font-medium text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
              See it in action
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
