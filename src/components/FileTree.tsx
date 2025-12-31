import React, { useState } from 'react';
import { Folder, FileCode, ChevronRight, ChevronDown, FileJson, FileText } from 'lucide-react';
import { FileNode, FileType } from '../types';

interface FileTreeProps {
  nodes: FileNode[];
  onSelectFile: (node: FileNode) => void;
  selectedFileId?: string;
  level?: number;
}

const FileIcon = ({ name, language }: { name: string; language?: string }) => {
  if (name.endsWith('.json')) return <FileJson className="w-4 h-4 text-yellow-400" />;
  if (name.endsWith('.md')) return <FileText className="w-4 h-4 text-blue-400" />;
  if (name.startsWith('.')) return <FileCode className="w-4 h-4 text-gray-400" />;
  return <FileCode className="w-4 h-4 text-brand-400" />;
};

const FileTreeNode: React.FC<{ node: FileNode; onSelect: (n: FileNode) => void; selectedId?: string; level: number }> = ({ node, onSelect, selectedId, level }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = node.id === selectedId;

  const handleClick = () => {
    if (node.type === FileType.FOLDER) {
      setIsOpen(!isOpen);
    } else {
      onSelect(node);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center py-1 px-2 cursor-pointer select-none hover:bg-dark-surface transition-colors ${isSelected ? 'bg-brand-900/30 text-brand-300 border-l-2 border-brand-500' : 'text-gray-400'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <span className="mr-1.5 opacity-70">
          {node.type === FileType.FOLDER && (
             isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          )}
        </span>
        <span className="mr-2">
          {node.type === FileType.FOLDER ? (
            <Folder className={`w-4 h-4 ${isOpen ? 'text-blue-400' : 'text-blue-500'}`} />
          ) : (
            <FileIcon name={node.name} language={node.language} />
          )}
        </span>
        <span className="text-sm font-mono truncate">{node.name}</span>
        {node.isNew && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-green-900 text-green-300 font-bold">NEW</span>}
      </div>
      
      {node.type === FileType.FOLDER && isOpen && node.children && (
        <FileTree nodes={node.children} onSelectFile={onSelect} selectedFileId={selectedId} level={level + 1} />
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ nodes, onSelectFile, selectedFileId, level = 0 }) => {
  return (
    <div className="flex flex-col">
      {nodes.map((node) => (
        <FileTreeNode 
          key={node.id} 
          node={node} 
          onSelect={onSelectFile} 
          selectedId={selectedFileId} 
          level={level} 
        />
      ))}
    </div>
  );
};