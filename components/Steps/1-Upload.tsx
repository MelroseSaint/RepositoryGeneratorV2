import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Code2 } from 'lucide-react';

interface StepUploadProps {
  onNext: (input: string) => void;
}

export const StepUpload: React.FC<StepUploadProps> = ({ onNext }) => {
  const [textInput, setTextInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
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

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Import your Codebase</h2>
        <p className="text-gray-400">Paste your snippets or upload a zip to get started.</p>
      </div>

      {/* Upload & Paste Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
        {/* Left: Drag & Drop */}
        <div
          className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-all cursor-pointer ${isDragging ? 'border-brand-500 bg-brand-900/20' : 'border-dark-border bg-dark-surface hover:border-brand-500/50'
            }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <div className="w-16 h-16 bg-dark-bg rounded-full flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8 text-brand-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Upload Files</h3>
          <p className="text-sm text-gray-500 text-center mb-4">Drag &amp; drop a .zip, folder, or single file here</p>
          <button className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm font-medium hover:text-brand-300 transition-colors">
            Browse Files
          </button>
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
            placeholder="// Paste your messy code here..."
            className="flex-1 bg-transparent p-4 font-mono text-sm text-gray-300 focus:outline-none resize-none placeholder-gray-600"
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-8 flex justify-end">
        <button
          disabled={!textInput.trim()}
          onClick={() => onNext(textInput)}
```
        import React, {useState, useRef} from 'react';
        import {UploadCloud, FileText, Code2} from 'lucide-react';

        interface StepUploadProps {
          onNext: (input: string) => void;
}

        export const StepUpload: React.FC<StepUploadProps> = ({onNext}) => {
  const [textInput, setTextInput] = useState('');
          const [isDragging, setIsDragging] = useState(false);
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

              return (
              <div className="flex flex-col h-full max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Import your Codebase</h2>
                  <p className="text-gray-400">Paste your snippets or upload a zip to get started.</p>
                </div>

                {/* Upload & Paste Area */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px]">
                  {/* Left: Drag & Drop */}
                  <div
                    className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-all cursor-pointer ${isDragging ? 'border-brand-500 bg-brand-900/20' : 'border-dark-border bg-dark-surface hover:border-brand-500/50'
                      }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    <div className="w-16 h-16 bg-dark-bg rounded-full flex items-center justify-center mb-4">
                      <UploadCloud className="w-8 h-8 text-brand-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-1">Upload Files</h3>
                    <p className="text-sm text-gray-500 text-center mb-4">Drag &amp; drop a .zip, folder, or single file here</p>
                    <button className="px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm font-medium hover:text-brand-300 transition-colors">
                      Browse Files
                    </button>
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
                      placeholder="// Paste your messy code here..."
                      className="flex-1 bg-transparent p-4 font-mono text-sm text-gray-300 focus:outline-none resize-none placeholder-gray-600"
                    />
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-8 flex justify-end">
                  <button
                    disabled={!textInput.trim()}
                    onClick={() => onNext(textInput)}
                    className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-brand-900/20 flex items-center transition-all transform hover:-translate-y-0.5"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Analyze &amp; Detect
                  </button>
                </div>
                {/* Demo Preview */}
                <div className="mt-12 max-w-4xl mx-auto">
                  <div className="relative group rounded-xl overflow-hidden shadow-2xl border border-dark-border bg-dark-surface">
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/80 to-transparent z-10 pointer-events-none" />
                    <img
                      src="/demo.gif"
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
              ```