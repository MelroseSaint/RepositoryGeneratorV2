import React, { useState } from 'react';
import { Settings, Package, ShieldCheck, Cloud, Database, ArrowRight, Github, FileText, Heart, Users } from 'lucide-react';
import { RepoConfig } from '../../types';

interface StepConfigProps {
  config: RepoConfig;
  setConfig: (c: RepoConfig) => void;
  onNext: () => void;
  onBack: () => void;
}

const TABS = [
  { id: 'basics', label: 'Basics', icon: Settings },
  { id: 'build', label: 'Build & Pkg', icon: Package },
  { id: 'lint', label: 'Lint & Test', icon: ShieldCheck },
  { id: 'ci', label: 'CI/CD', icon: Cloud },
  { id: 'github', label: 'GitHub', icon: Github },
];

export const StepConfig: React.FC<StepConfigProps> = ({ config, setConfig, onNext, onBack }) => {
  const [activeTab, setActiveTab] = useState('basics');

  const handleChange = (field: keyof RepoConfig, value: any) => {
    setConfig({ ...config, [field]: value });
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">Configure Repository</h2>
        <p className="text-gray-400">Fine-tune your stack before generation.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                  ${isActive
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20'
                    : 'bg-dark-surface text-gray-400 hover:bg-dark-border hover:text-gray-200'
                  }`}
              >
                <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-dark-surface rounded-xl border border-dark-border p-8 overflow-y-auto">

          {activeTab === 'basics' && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Repository Name</label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                <textarea
                  value={config.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none h-24 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">License</label>
                  <select
                    value={config.license}
                    onChange={(e) => handleChange('license', e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-white outline-none"
                  >
                    <option value="MIT">MIT</option>
                    <option value="Apache-2.0">Apache 2.0</option>
                    <option value="GPLv3">GPL v3</option>
                    <option value="None">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Author</label>
                  <input
                    type="text"
                    value={config.author}
                    onChange={(e) => handleChange('author', e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-white outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'build' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Package Manager</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['npm', 'yarn', 'pnpm', 'bun'].map((pm) => (
                      <button
                        key={pm}
                        onClick={() => handleChange('packageManager', pm)}
                        className={`px-3 py-2 rounded-md text-sm border ${config.packageManager === pm ? 'border-brand-500 bg-brand-900/20 text-brand-300' : 'border-dark-border bg-dark-bg text-gray-400'}`}
                      >
                        {pm}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Bundler</label>
                  <select
                    value={config.bundler}
                    onChange={(e) => handleChange('bundler', e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 text-white outline-none"
                  >
                    <option value="vite">Vite (Recommended)</option>
                    <option value="webpack">Webpack</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-dark-bg rounded-lg border border-dark-border flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">TypeScript</h4>
                  <p className="text-xs text-gray-500">Convert JavaScript files to TypeScript automatically.</p>
                </div>
                <button
                  onClick={() => handleChange('useTypeScript', !config.useTypeScript)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${config.useTypeScript ? 'bg-brand-600' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${config.useTypeScript ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="p-4 bg-dark-bg rounded-lg border border-dark-border flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">Monorepo Structure</h4>
                  <p className="text-xs text-gray-500">Set up workspaces with Turborepo.</p>
                </div>
                <button
                  onClick={() => handleChange('useMonorepo', !config.useMonorepo)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${config.useMonorepo ? 'bg-brand-600' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${config.useMonorepo ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'lint' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 bg-dark-bg rounded-lg border border-dark-border flex items-center justify-between">
                <div className="flex items-center">
                  <ShieldCheck className="w-5 h-5 text-green-400 mr-3" />
                  <div>
                    <h4 className="text-white font-medium">Linting & Formatting</h4>
                    <p className="text-xs text-gray-500">ESLint + Prettier configuration.</p>
                  </div>
                </div>
                <input type="checkbox" checked={config.includeLinting} onChange={(e) => handleChange('includeLinting', e.target.checked)} className="accent-brand-500 w-5 h-5" />
              </div>
              <div className="p-4 bg-dark-bg rounded-lg border border-dark-border flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-5 h-5 mr-3 flex items-center justify-center font-bold text-blue-400 border border-blue-400 rounded text-xs">T</div>
                  <div>
                    <h4 className="text-white font-medium">Unit Tests</h4>
                    <p className="text-xs text-gray-500">Scaffold Jest/Vitest tests for detected components.</p>
                  </div>
                </div>
                <input type="checkbox" checked={config.includeTests} onChange={(e) => handleChange('includeTests', e.target.checked)} className="accent-brand-500 w-5 h-5" />
              </div>
            </div>
          )}

          {activeTab === 'ci' && (
            <div className="space-y-6 animate-in fade-in">
              <label className="block text-sm font-medium text-gray-400 mb-2">CI Provider</label>
              <div className="grid grid-cols-3 gap-4">
                {['github', 'gitlab', 'none'].map((ci) => (
                  <button
                    key={ci}
                    onClick={() => handleChange('ciProvider', ci)}
                    className={`p-4 rounded-lg border text-left transition-all ${config.ciProvider === ci ? 'border-brand-500 bg-brand-900/20' : 'border-dark-border bg-dark-bg hover:border-gray-500'}`}
                  >
                    <span className="block text-white font-semibold capitalize">{ci}</span>
                    <span className="text-xs text-gray-500">
                      {ci === 'github' ? 'Actions Workflow' : ci === 'gitlab' ? '.gitlab-ci.yml' : 'No CI config'}
                    </span>
                  </button>
                ))}
              </div>

              <div className="p-4 bg-dark-bg rounded-lg border border-dark-border flex items-center justify-between mt-4">
                <div className="flex items-center">
                  <Database className="w-5 h-5 text-blue-400 mr-3" />
                  <div>
                    <h4 className="text-white font-medium">Docker Containerization</h4>
                    <p className="text-xs text-gray-500">Generate Dockerfile and docker-compose.yml.</p>
                  </div>
                </div>
                <input type="checkbox" checked={config.includeDocker} onChange={(e) => handleChange('includeDocker', e.target.checked)} className="accent-brand-500 w-5 h-5" />
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-8 animate-in fade-in">
              {/* Workflows */}
              <div>
                <h4 className="text-white font-medium mb-4 flex items-center">
                  <Cloud className="w-4 h-4 mr-2 text-blue-400" />
                  Actions Workflows
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'ci', label: 'CI (Build & Test)' },
                    { id: 'release', label: 'Release & Publish' },
                    { id: 'dependabot', label: 'Dependabot' },
                    { id: 'codeql', label: 'CodeQL Analysis' },
                    { id: 'stale', label: 'Stale Issues' },
                  ].map((wf) => (
                    <label key={wf.id} className="flex items-center p-3 rounded-lg border border-dark-border bg-dark-bg hover:border-gray-500 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={config.githubWorkflows.includes(wf.id)}
                        onChange={(e) => {
                          const newWorkflows = e.target.checked
                            ? [...config.githubWorkflows, wf.id]
                            : config.githubWorkflows.filter(id => id !== wf.id);
                          handleChange('githubWorkflows', newWorkflows);
                        }}
                        className="accent-brand-500 w-4 h-4 mr-3"
                      />
                      <span className="text-sm text-gray-300">{wf.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Templates */}
              <div>
                <h4 className="text-white font-medium mb-4 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-yellow-400" />
                  Issue & PR Templates
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'bug_report', label: 'Bug Report Form' },
                    { id: 'feature_request', label: 'Feature Request Form' },
                    { id: 'pull_request', label: 'Pull Request Template' },
                  ].map((tpl) => (
                    <label key={tpl.id} className="flex items-center p-3 rounded-lg border border-dark-border bg-dark-bg hover:border-gray-500 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={config.githubTemplates.includes(tpl.id)}
                        onChange={(e) => {
                          const newTemplates = e.target.checked
                            ? [...config.githubTemplates, tpl.id]
                            : config.githubTemplates.filter(id => id !== tpl.id);
                          handleChange('githubTemplates', newTemplates);
                        }}
                        className="accent-brand-500 w-4 h-4 mr-3"
                      />
                      <span className="text-sm text-gray-300">{tpl.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Community */}
              <div>
                <h4 className="text-white font-medium mb-4 flex items-center">
                  <Heart className="w-4 h-4 mr-2 text-pink-400" />
                  Community Standards
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'contributing', label: 'CONTRIBUTING.md' },
                    { id: 'code_of_conduct', label: 'CODE_OF_CONDUCT.md' },
                    { id: 'security', label: 'SECURITY.md' },
                    { id: 'support', label: 'SUPPORT.md' },
                  ].map((com) => (
                    <label key={com.id} className="flex items-center p-3 rounded-lg border border-dark-border bg-dark-bg hover:border-gray-500 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={config.githubCommunity.includes(com.id)}
                        onChange={(e) => {
                          const newCommunity = e.target.checked
                            ? [...config.githubCommunity, com.id]
                            : config.githubCommunity.filter(id => id !== com.id);
                          handleChange('githubCommunity', newCommunity);
                        }}
                        className="accent-brand-500 w-4 h-4 mr-3"
                      />
                      <span className="text-sm text-gray-300">{com.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Other */}
              <div>
                <label className="flex items-center p-4 rounded-lg border border-dark-border bg-dark-bg hover:border-gray-500 cursor-pointer transition-colors">
                  <div className="flex items-center flex-1">
                    <Users className="w-5 h-5 text-purple-400 mr-3" />
                    <div>
                      <h4 className="text-white font-medium">CODEOWNERS</h4>
                      <p className="text-xs text-gray-500">Define who owns what code.</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.githubCodeowners}
                    onChange={(e) => handleChange('githubCodeowners', e.target.checked)}
                    className="accent-brand-500 w-5 h-5"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-between items-center">
        <button onClick={onBack} className="text-gray-400 hover:text-white font-medium px-4 py-2">Back</button>
        <button
          onClick={onNext}
          className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-brand-900/20 flex items-center transition-transform transform hover:-translate-y-0.5"
        >
          Preview Structure
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
};