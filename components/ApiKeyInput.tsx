import React, { useState, useEffect } from 'react';
import { Key, Check, X } from 'lucide-react';
import { getApiKey, setApiKey } from '../services/aiService';

interface ApiKeyInputProps {
    onKeyChange?: (hasKey: boolean) => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onKeyChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [key, setKey] = useState('');
    const [hasKey, setHasKey] = useState(false);

    useEffect(() => {
        const currentKey = getApiKey();
        if (currentKey) {
            setHasKey(true);
            setKey(currentKey);
            onKeyChange?.(true);
        } else {
            onKeyChange?.(false);
        }
    }, [onKeyChange]);

    const handleSave = () => {
        if (key.trim()) {
            setApiKey(key.trim());
            setHasKey(true);
            setIsOpen(false);
            onKeyChange?.(true);
        }
    };

    const handleClear = () => {
        setApiKey('');
        setKey('');
        setHasKey(false);
        onKeyChange?.(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${hasKey
                    ? 'bg-green-900/30 text-green-400 border border-green-800/50 hover:bg-green-900/50'
                    : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50 hover:bg-yellow-900/50'
                    }`}
            >
                <Key className="w-4 h-4" />
                <span className="hidden sm:inline">{hasKey ? 'AI Active' : 'Set API Key'}</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#1e2329] border border-gray-700 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
                    <h3 className="text-sm font-medium text-white mb-2">Gemini API Key</h3>
                    <p className="text-xs text-gray-400 mb-3">
                        Enter your Google Gemini API key to enable real-time AI generation.
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 ml-1 underline">
                            Get a key
                        </a>
                    </p>

                    <div className="flex space-x-2">
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="flex-1 bg-black/30 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleSave}
                            disabled={!key.trim()}
                            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                        {hasKey && (
                            <button
                                onClick={handleClear}
                                className="bg-red-900/50 hover:bg-red-800/50 text-red-400 p-2 rounded-lg transition-colors border border-red-800/50"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
