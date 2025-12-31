import React, { useState } from 'react';
import { Blueprint, BLUEPRINTS } from '../../types';
import { ArrowRight, ArrowLeft, CheckCircle, Info } from 'lucide-react';

interface StepBlueprintSelectionProps {
  onNext: (blueprintId: string) => void;
  onBack: () => void;
}

export const StepBlueprintSelection: React.FC<StepBlueprintSelectionProps> = ({ onNext, onBack }) => {
  const [selectedBlueprint, setSelectedBlueprint] = useState<string>('');

  const handleNext = () => {
    if (selectedBlueprint) {
      onNext(selectedBlueprint);
    }
  };

  const getCategoryColor = (category: Blueprint['category']) => {
    const colors = {
      frontend: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      backend: 'bg-green-500/20 text-green-300 border-green-500/30',
      fullstack: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      mobile: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      desktop: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      cli: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      library: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      game: 'bg-red-500/20 text-red-300 border-red-500/30',
      data: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    };
    return colors[category] || colors.frontend;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Select Your Blueprint</h1>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto">
          Choose from our battle-tested, immutable blueprints. Each blueprint represents a proven architecture
          with fixed dependencies, security baselines, and evolution paths.
        </p>
      </div>

      {/* Blueprint Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {BLUEPRINTS.map((blueprint) => (
          <div
            key={blueprint.id}
            className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
              selectedBlueprint === blueprint.id
                ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/20'
                : 'border-dark-border bg-dark-card hover:border-gray-600 hover:bg-dark-card/80'
            }`}
            onClick={() => setSelectedBlueprint(blueprint.id)}
          >
            {/* Selection Indicator */}
            {selectedBlueprint === blueprint.id && (
              <div className="absolute top-4 right-4">
                <CheckCircle className="w-6 h-6 text-brand-500" />
              </div>
            )}

            {/* Category Badge */}
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(blueprint.category)} mb-4`}>
              {blueprint.category.toUpperCase()}
            </div>

            {/* Blueprint Info */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold">{blueprint.name}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{blueprint.description}</p>

              {/* Tech Stack */}
              <div className="space-y-2">
                <div className="text-xs text-gray-400 uppercase tracking-wide">Tech Stack</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-dark-bg rounded text-xs font-mono">{blueprint.techStack.language}</span>
                  <span className="px-2 py-1 bg-dark-bg rounded text-xs font-mono">{blueprint.techStack.framework}</span>
                  <span className="px-2 py-1 bg-dark-bg rounded text-xs font-mono">{blueprint.techStack.runtime}</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <div className="text-xs text-gray-400 uppercase tracking-wide">Features</div>
                <div className="flex flex-wrap gap-1">
                  {blueprint.features.slice(0, 4).map((feature) => (
                    <span key={feature} className="px-2 py-1 bg-dark-bg/50 rounded text-xs">
                      {feature}
                    </span>
                  ))}
                  {blueprint.features.length > 4 && (
                    <span className="px-2 py-1 bg-dark-bg/50 rounded text-xs">
                      +{blueprint.features.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Version & Security */}
              <div className="flex items-center justify-between pt-2 border-t border-dark-border">
                <span className="text-xs text-gray-400">v{blueprint.version}</span>
                <div className="flex items-center space-x-1 text-xs text-green-400">
                  <Info className="w-3 h-3" />
                  <span>Security Baseline</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-8 border-t border-dark-border">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-6 py-3 rounded-lg border border-dark-border hover:border-gray-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={handleNext}
          disabled={!selectedBlueprint}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all ${
            selectedBlueprint
              ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-900/50'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
