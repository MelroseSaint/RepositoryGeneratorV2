import React, { useEffect, useState } from 'react';
import { FileNode, RepoConfig, FileType } from '../../types';
import { generateFileTree } from '../../services/aiService';
import { FileCode2, Folder, ChevronRight, ChevronDown, Wand2, FileType2, Loader2 } from 'lucide-react';
import { refactorCode } from '../../services/aiService';

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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'components']));
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [refactorPrompt, setRefactorPrompt] = useState('');
  const [showRefactorInput, setShowRefactorInput] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadTree = async () => {
      setLoading(true);
      const tree = await generateFileTree(config, rawInput);
      if (isMounted) {
        setFiles(tree);
        onFilesGenerated(tree);
        // Select first file by default
        const findFirstFile = (nodes: FileNode[]): FileNode | null => {
          for (const node of nodes) {
            if (node.type === FileType.FILE) return node;
            if (node.children) {
              const found = findFirstFile(node.children);
              if (found) return found;
            }
          }
          return null;
        };
        setSelectedFile(findFirstFile(tree));
        setLoading(false);
      }
    };
    loadTree();
    return () => { isMounted = false; };
  }, [config, rawInput, onFilesGenerated]);

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const handleRefactor = async (instruction: string) => {
    if (!selectedFile || !selectedFile.content) return;

    setIsRefactoring(true);
    try {
      const newContent = await refactorCode(selectedFile.content, instruction, selectedFile.name);

      // Update file content in place
      selectedFile.content = newContent;

      // If converting to TS, update extension
      if (instruction.includes('Convert to TypeScript') && (selectedFile.name.endsWith('.js') || selectedFile.name.endsWith('.jsx'))) {
        selectedFile.name = selectedFile.name.replace('.js', '.ts').replace('.jsx', '.tsx');
        selectedFile.language = 'typescript';
      }

      setShowRefactorInput(false);
      setRefactorPrompt('');
      // Force re-render
      setFiles([...files]);
    } catch (error) {
      console.error("Refactor failed:", error);
      alert("Refactoring failed. Please check console.");
    } finally {
      setIsRefactoring(false);
    }
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.id} style={{ paddingLeft: `${depth * 12}px` }}>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer rounded hover:bg-dark-bg/50 transition-colors ${selectedFile?.id === node.id ? 'bg-brand-900/20 text-brand-300' : 'text-gray-400'}`}
          onClick={() => {
            if (node.type === FileType.FOLDER) {
              toggleFolder(node.id);
            } else {
              setSelectedFile(node);
              setShowRefactorInput(false);
            }
          }}
        >
          {node.type === FileType.FOLDER && (
            <span className="mr-1">
              {expandedFolders.has(node.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
          )}
          {node.type === FileType.FOLDER ? (
            <Folder className="w-4 h-4 mr-2 text-blue-400" />
          ) : (
            <FileCode2 className="w-4 h-4 mr-2 text-gray-500" />
          )}
          <span className="text-sm truncate">{node.name}</span>
        </div>
        {node.type === FileType.FOLDER && expandedFolders.has(node.id) && node.children && (
          <div>{renderTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Preview & Refine</h2>
          <p className="text-gray-400 text-sm">Review generated files and make AI-powered adjustments.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onBack}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Back
          </button>
          <button
            onClick={onNext}
            disabled={loading || files.length === 0}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold shadow-lg shadow-brand-900/20 transition-all transform hover:-translate-y-0.5"
          >
            Generate Repository
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex border border-dark-border rounded-xl overflow-hidden bg-dark-surface h-[500px]">
        {/* Sidebar */}
        <div className="w-64 border-r border-dark-border bg-dark-bg/30 overflow-y-auto p-2">
          {loading ? (
            <div className="text-gray-500 text-sm animate-pulse p-4">Generating files...</div>
          ) : (
            renderTree(files)
          )}
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
          {selectedFile ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-dark-border bg-dark-bg/50">
                <span className="text-sm font-mono text-gray-300">{selectedFile.name}</span>
                <div className="flex space-x-2">
                  {/* Convert JS->TS Shortcut */}
                  {(selectedFile.name.endsWith('.js') || selectedFile.name.endsWith('.jsx')) && (
                    <button
                      onClick={() => handleRefactor('Convert this file to TypeScript. Use proper types and interfaces.')}
                      disabled={isRefactoring}
                      className="flex items-center px-2 py-1 text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded border border-blue-500/30 transition-colors"
                      title="Auto-convert to TypeScript"
                    >
                      {isRefactoring ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileType2 className="w-3 h-3 mr-1" />}
                      JS → TS
                    </button>
                  )}

                  <button
                    onClick={() => setShowRefactorInput(!showRefactorInput)}
                    className={`flex items-center px-2 py-1 text-xs rounded border transition-colors ${showRefactorInput ? 'bg-brand-500/20 text-brand-300 border-brand-500/50' : 'bg-dark-bg text-gray-400 border-dark-border hover:text-white'}`}
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    AI Refactor
                  </button>
                </div>
              </div>

              {/* AI Refactor Input */}
              {showRefactorInput && (
                <div className="p-3 bg-dark-bg border-b border-dark-border animate-in slide-in-from-top-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={refactorPrompt}
                      onChange={(e) => setRefactorPrompt(e.target.value)}
                      placeholder="e.g., 'Add error handling', 'Use arrow functions', 'Add comments'..."
                      className="flex-1 bg-dark-surface border border-dark-border rounded px-3 py-1 text-sm text-white focus:ring-1 focus:ring-brand-500 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && handleRefactor(refactorPrompt)}
                    />
                    <button
                      onClick={() => handleRefactor(refactorPrompt)}
                      disabled={!refactorPrompt.trim() || isRefactoring}
                      className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded disabled:opacity-50"
                    >
                      {isRefactoring ? 'Refactoring...' : 'Apply'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-auto p-4">
                <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap">
                  {selectedFile.content || '// Empty file'}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              {loading ? 'Generating files...' : 'Select a file to preview'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};