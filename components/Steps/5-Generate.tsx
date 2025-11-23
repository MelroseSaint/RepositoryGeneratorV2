import React, { useEffect, useState } from 'react';
import { Check, Download, RefreshCw, Github, Copy, Loader2, AlertTriangle } from 'lucide-react';
import JSZip from 'jszip';
import { GenerationLog, RepoConfig, FileNode, FileType } from '../../types';
import { generateFileTree } from '../../services/aiService';
import { createRepository, pushToGithub } from '../../services/githubService';

interface StepGenerateProps {
  config: RepoConfig;
  rawInput: string;
  onReset: () => void;
  existingFiles?: FileNode[];
}

export const StepGenerate: React.FC<StepGenerateProps> = ({ config, rawInput, onReset, existingFiles }) => {
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [pushResult, setPushResult] = useState<{ success: boolean; url?: string; error?: string } | null>(null);

  // Store generated files so we don't regenerate them for push
  const [finalFiles, setFinalFiles] = useState<FileNode[]>([]);

  useEffect(() => {
    // If we already have files, we don't need to fake the generation process
    if (existingFiles && existingFiles.length > 0) {
      setFinalFiles(existingFiles);
      setLogs([{
        timestamp: new Date().toISOString().split('T')[1].split('.')[0],
        level: 'success',
        message: "Files prepared from preview."
      }]);
      setProgress(100);
      setComplete(true);
      return;
    }

    const steps = [
      "Initializing workspace...",
      "Parsing input files...",
      "Applying heuristics...",
      "Generating package.json...",
      "Configuring TypeScript...",
      "Writing CI workflows...",
      "Compressing archive..."
    ];

    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep >= steps.length) {
        clearInterval(interval);
        // Generate files at the end if not provided
        generateFileTree(config, rawInput).then(files => {
          setFinalFiles(files);
          setComplete(true);
        });
        return;
      }

      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString().split('T')[1].split('.')[0],
        level: 'info',
        message: steps[currentStep]
      }]);

      setProgress(Math.round(((currentStep + 1) / steps.length) * 100));
      currentStep++;
    }, 600);

    return () => clearInterval(interval);
  }, [existingFiles, config, rawInput]);

  const addFilesToZip = (zip: JSZip, nodes: FileNode[]) => {
    nodes.forEach(node => {
      if (node.type === FileType.FOLDER) {
        const folder = zip.folder(node.name);
        if (folder && node.children) {
          addFilesToZip(folder, node.children);
        }
      } else {
        // Ensure we don't write null/undefined content
        zip.file(node.name, node.content || '');
      }
    });
  };

  const handleDownload = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Use finalFiles which should be populated by now
      const files = finalFiles.length > 0 ? finalFiles : await generateFileTree(config, rawInput);
      if (finalFiles.length === 0) setFinalFiles(files);

      // Add files to the zip structure
      addFilesToZip(zip, files);

      // Generate the binary blob
      const blob = await zip.generateAsync({ type: "blob" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const element = document.createElement("a");
      element.href = url;
      element.download = `${config.name || 'repo-gen-output'}.zip`;
      document.body.appendChild(element);
      element.click();

      // Cleanup
      document.body.removeChild(element);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // Log success
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString().split('T')[1].split('.')[0],
        level: 'success',
        message: "ZIP archive generated and downloaded."
      }]);

    } catch (error) {
      console.error("Failed to zip files", error);
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString().split('T')[1].split('.')[0],
        level: 'warn',
        message: "Failed to generate ZIP file."
      }]);
    } finally {
      setIsZipping(false);
    }
  };

  const handlePushToGithub = async () => {
    if (!githubToken) {
      setShowTokenInput(true);
      return;
    }

    setIsPushing(true);
    setPushResult(null);

    try {
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString().split('T')[1].split('.')[0],
        level: 'info',
        message: "Creating GitHub repository..."
      }]);

      // 1. Create Repo
      const repoData = await createRepository(githubToken, config.name, config.description, true); // Default to private

      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString().split('T')[1].split('.')[0],
        level: 'success',
        message: `Repository created: ${repoData.html_url}`
      }]);

      // 2. Push Files
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString().split('T')[1].split('.')[0],
        level: 'info',
        message: "Pushing files..."
      }]);

      const files = finalFiles.length > 0 ? finalFiles : await generateFileTree(config, rawInput);
      await pushToGithub(githubToken, repoData.owner.login, repoData.name, files);

      setPushResult({ success: true, url: repoData.html_url });
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString().split('T')[1].split('.')[0],
        level: 'success',
        message: "Successfully pushed to GitHub!"
      }]);

    } catch (error: any) {
      console.error("GitHub Push Error:", error);
      setPushResult({ success: false, error: error.message || "Failed to push to GitHub" });
      setLogs(prev => [...prev, {
        timestamp: new Date().toISOString().split('T')[1].split('.')[0],
        level: 'warn',
        message: `GitHub Error: ${error.message}`
      }]);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full animate-in zoom-in-95 duration-500">

      {!complete ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-8 relative">
            <svg className="w-full h-full -rotate-90">
              <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-dark-surface" />
              <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-brand-500 transition-all duration-500" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * progress) / 100} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">{progress}%</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Generating Repository</h2>
          <p className="text-gray-400 mb-8">Please wait while we structure your code.</p>

          <div className="bg-black/30 rounded-lg p-4 text-left font-mono text-xs text-gray-400 h-48 overflow-y-auto border border-dark-border">
            {logs.map((log, i) => (
              <div key={i} className="mb-1">
                <span className="text-gray-600 mr-2">[{log.timestamp}]</span>
                <span className={`
                           ${log.level === 'success' ? 'text-green-400' :
                    log.level === 'warn' ? 'text-red-400' : 'text-brand-400'}
                         `}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 animate-in slide-in-from-bottom-8">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Ready to Ship!</h2>
          <p className="text-gray-400 mb-8">Your repository has been generated and is ready for download.</p>

          <div className="grid grid-cols-1 gap-4 mb-8">
            <button
              onClick={handleDownload}
              disabled={isZipping}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-70 disabled:cursor-wait text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-brand-900/20 flex items-center justify-center transition-all hover:scale-[1.02]"
            >
              {isZipping ? <Loader2 className="w-6 h-6 mr-2 animate-spin" /> : <Download className="w-6 h-6 mr-2" />}
              {isZipping ? 'Zipping...' : 'Download .ZIP'}
            </button>

            {!showTokenInput && !pushResult?.success && (
              <button
                onClick={() => setShowTokenInput(true)}
                className="w-full bg-[#24292f] hover:bg-[#2c3138] text-white py-4 rounded-xl font-bold text-lg border border-gray-700 flex items-center justify-center transition-all"
              >
                <Github className="w-6 h-6 mr-2" />
                Push to GitHub
              </button>
            )}

            {showTokenInput && !pushResult?.success && (
              <div className="bg-dark-surface border border-dark-border rounded-xl p-4 animate-in fade-in">
                <h3 className="text-white font-medium mb-2 flex items-center">
                  <Github className="w-4 h-4 mr-2" />
                  GitHub Authentication
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Enter a Personal Access Token with 'repo' scope to create and push to a new repository.
                </p>
                <input
                  type="password"
                  placeholder="ghp_..."
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-sm text-white mb-3 focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowTokenInput(false)}
                    className="flex-1 py-2 text-sm text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePushToGithub}
                    disabled={!githubToken || isPushing}
                    className="flex-1 bg-[#24292f] hover:bg-[#2c3138] text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center"
                  >
                    {isPushing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Push Repo'}
                  </button>
                </div>
              </div>
            )}

            {pushResult?.success && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 animate-in fade-in">
                <h3 className="text-green-400 font-bold mb-2 flex items-center justify-center">
                  <Check className="w-5 h-5 mr-2" />
                  Pushed Successfully!
                </h3>
                <a
                  href={pushResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white underline hover:text-brand-400 break-all text-sm"
                >
                  {pushResult.url}
                </a>
              </div>
            )}

            {pushResult?.error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-in fade-in">
                <h3 className="text-red-400 font-bold mb-2 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Push Failed
                </h3>
                <p className="text-red-300 text-sm">{pushResult.error}</p>
                <button
                  onClick={() => setPushResult(null)}
                  className="text-xs text-red-400 mt-2 hover:underline"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          <div className="bg-dark-surface border border-dark-border rounded-lg p-4 text-left mb-8">
            <p className="text-sm text-gray-400 mb-2">Next Steps:</p>
            <div className="bg-black/50 p-3 rounded font-mono text-sm text-gray-300 flex justify-between items-center group cursor-pointer">
              <code>unzip {config.name}.zip && cd {config.name} && npm install</code>
              <Copy className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100" />
            </div>
          </div>

          <button onClick={onReset} className="text-gray-500 hover:text-white flex items-center justify-center mx-auto text-sm font-medium">
            <RefreshCw className="w-4 h-4 mr-2" />
            Start New Project
          </button>
        </div>
      )}
    </div>
  );
};