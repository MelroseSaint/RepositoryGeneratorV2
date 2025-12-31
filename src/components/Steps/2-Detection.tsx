import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, Edit2, Loader2, ArrowRight } from 'lucide-react';
import { DetectionResult } from '../../types';
import { detectStack } from '../../services/aiService';

interface StepDetectionProps {
  rawInput: string;
  onNext: (result: DetectionResult) => void;
  onBack: () => void;
}

export const StepDetection: React.FC<StepDetectionProps> = ({ rawInput, onNext, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    detectStack(rawInput)
      .then(res => {
        if (isMounted) {
          setResult(res);
          setLoading(false);
          setError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          setLoading(false);
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(errorMessage);
        }
      });
    return () => { isMounted = false; };
  }, [rawInput]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] animate-in fade-in">
        <div className="relative">
          <div className="absolute inset-0 bg-brand-500 blur-xl opacity-20 rounded-full"></div>
          <Loader2 className="w-16 h-16 text-brand-400 animate-spin relative z-10" />
        </div>
        <h3 className="mt-8 text-xl font-medium text-white">Analyzing Code Structure...</h3>
        <p className="text-gray-500 mt-2">Detecting languages, frameworks, and dependencies</p>
      </div>
    );
  }

  if (error) {
    const getErrorTitle = () => {
      if (error.includes('timeout')) return 'AI Service Timeout';
      if (error.includes('Invalid API key')) return 'Invalid API Key';
      if (error.includes('quota')) return 'Quota Exceeded';
      if (error.includes('model not found')) return 'AI Model Not Found';
      return 'AI Service Error';
    };

    const getErrorSuggestions = () => {
      if (error.includes('timeout')) {
        return [
          'Check your internet connection',
          'Try again with a more stable connection',
          'The AI service may be experiencing high load'
        ];
      }
      if (error.includes('Invalid API key')) {
        return [
          'Check your API key in the settings',
          'Make sure the key is valid and active',
          'Verify you have selected the correct provider'
        ];
      }
      if (error.includes('quota')) {
        return [
          'Wait a few minutes and try again',
          'Switch to a different AI provider in settings',
          'Check your API key quota limits at the provider\'s dashboard'
        ];
      }
      if (error.includes('model not found')) {
        return [
          'Check the selected model configuration',
          'Try selecting a different AI model',
          'Verify your provider supports the selected model'
        ];
      }
      return [
        'Wait a moment and try again',
        'Check your internet connection',
        'Try using a different AI provider'
      ];
    };

    const suggestions = getErrorSuggestions();

    return (
      <div className="max-w-3xl mx-auto animate-in slide-in-from-right-8 duration-500">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white">{getErrorTitle()}</h2>
          <p className="text-gray-400 mt-2">We encountered an issue with the AI service.</p>
        </div>

        <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-8 shadow-2xl">
          <div className="flex items-start space-x-4">
            <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">{getErrorTitle()}</h3>
              <p className="text-gray-300 mb-4">{error}</p>
              <div className="bg-dark-bg border border-dark-border rounded-lg p-4 mt-4">
                <h4 className="text-sm font-medium text-white mb-2">Suggested Actions:</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white font-medium px-4 py-2"
          >
            Go Back
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-brand-900/20 flex items-center transition-transform transform hover:-translate-y-0.5"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in slide-in-from-right-8 duration-500">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white">Detection Complete</h2>
        <p className="text-gray-400 mt-2">We found the following stack in your snippet.</p>
      </div>

      <div className="bg-dark-surface border border-dark-border rounded-xl p-8 shadow-2xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Primary Language</h3>
            <div className="flex items-center space-x-3">
              <span className="text-4xl font-bold text-white">{result?.language}</span>
              <span className="px-2 py-1 rounded bg-brand-900/50 text-brand-300 text-xs font-mono border border-brand-700/50">
                {(result?.confidence || 0)}% Match
              </span>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-dark-bg rounded-lg transition-colors">
            <Edit2 className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-dark-bg p-4 rounded-lg border border-dark-border">
            <span className="text-xs text-gray-500 block mb-1">Framework</span>
            <span className="text-lg font-semibold text-white">{result?.framework}</span>
          </div>
          <div className="bg-dark-bg p-4 rounded-lg border border-dark-border">
            <span className="text-xs text-gray-500 block mb-1">Project Type</span>
            <span className="text-lg font-semibold text-white">{result?.suggestedProjectType}</span>
          </div>
        </div>

        <div className="border-t border-dark-border pt-6">
          <h4 className="text-sm font-medium text-white mb-4 flex items-center">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            Automated Fixes Available
          </h4>
          <ul className="space-y-3">
            <li className="flex items-start text-sm text-gray-400">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
              Scaffold missing package.json and lockfile
            </li>
            <li className="flex items-start text-sm text-gray-400">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
              Generate .gitignore based on {result?.language} standards
            </li>
            <li className="flex items-start text-sm text-gray-400">
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
              Structure source files into /src directory
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white font-medium px-4 py-2"
        >
          Try Again
        </button>
        <button
          onClick={() => result && onNext(result)}
          className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-brand-900/20 flex items-center transition-transform transform hover:-translate-y-0.5"
        >
          Configure Repo
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
};