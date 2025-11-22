import React, { useEffect, useState } from 'react';
import { FileNode, RepoConfig } from '../../types';
import { generateFileTree } from '../../services/aiService';
import { FileTree } from '../FileTree';
import { ArrowRight, Download } from 'lucide-react';

interface StepPreviewProps {
  config: RepoConfig;
  rawInput: string;
  onNext: () => void;
  onBack: () => void;
  onFilesGenerated: (files: FileNode[]) => void;
}

export const StepPreview: React.FC<StepPreviewProps> = ({ config, rawInput, onNext, onBack, onFilesGenerated }) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadTree = async () => {
      setLoading(true);
      // Generate the tree
      const tree = await generateFileTree(config, rawInput);
      if (isMounted) {
        setFiles(tree);
        onFilesGenerated(tree);
        // Select package.json or first file by default
        setSelectedFile(tree.find(f => f.name === 'package.json') || tree[0]);
        setLoading(false);
      }
    };
    loadTree();
    return () => { isMounted = false; };
  }, [config, rawInput]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white">Preview Repository</h2>
          <p className="text-gray-400">Review structure and generated configs before building.</p>
        </div>
        <div className="flex space-x-3">
          <div className="bg-dark-surface px-3 py-1 rounded border border-dark-border text-xs text-gray-400">
            <span className="text-green-400 font-bold">{files.length > 0 ? files.length : '...'}</span> files generated
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden border border-dark-border rounded-xl bg-dark-surface shadow-2xl min-h-0">
        {/* Left: File Tree */}
        <div className="w-72 bg-dark-bg border-r border-dark-border overflow-y-auto p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Project Structure</h3>
          {loading ? (
            <div className="text-gray-500 text-sm animate-pulse">Generating tree...</div>
          ) : (
            <FileTree nodes={files} onSelectFile={setSelectedFile} selectedFileId={selectedFile?.id} />
          )}
        </div>

        {/* Right: Code Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-10 border-b border-dark-border bg-dark-bg flex items-center px-4 justify-between">
            <span className="text-sm text-gray-300 font-mono">{selectedFile?.name}</span>
            {selectedFile?.isNew && <span className="text-[10px] bg-green-900 text-green-300 px-2 py-0.5 rounded">Generated</span>}
          </div>
          <div className="flex-1 overflow-auto bg-[#0d1117] p-4 relative group">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-600 animate-pulse">
                Generating content...
              </div>
            ) : selectedFile?.content ? (
              <pre className="font-mono text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                <code>{selectedFile.content}</code>
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600">
                Select a file to view content
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <button onClick={onBack} className="text-gray-400 hover:text-white font-medium px-4 py-2">Back to Config</button>
        <button
          onClick={onNext}
          disabled={loading || files.length === 0}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-green-900/20 flex items-center transition-transform transform hover:-translate-y-0.5"
        >
          <Download className="w-5 h-5 mr-2" />
          Generate & Download ZIP
        </button>
      </div>
    </div>
  );
};