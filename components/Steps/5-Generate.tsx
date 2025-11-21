import React, { useEffect, useState } from 'react';
import { Check, Download, RefreshCw, Github, Copy, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { GenerationLog, RepoConfig, FileNode, FileType } from '../../types';
import { generateFileTree } from '../../services/aiService';

interface StepGenerateProps {
  config: RepoConfig;
  rawInput: string;
  onReset: () => void;
}

export const StepGenerate: React.FC<StepGenerateProps> = ({ config, rawInput, onReset }) => {
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  useEffect(() => {
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
        setComplete(true);
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
  }, []);

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

      // Regenerate the file tree to ensure we have the latest state
      const files = await generateFileTree(config, rawInput);

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
            <button className="w-full bg-[#24292f] hover:bg-[#2c3138] text-white py-4 rounded-xl font-bold text-lg border border-gray-700 flex items-center justify-center transition-all">
              <Github className="w-6 h-6 mr-2" />
              Push to GitHub
              <span className="ml-2 text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">Requires Token</span>
            </button>
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