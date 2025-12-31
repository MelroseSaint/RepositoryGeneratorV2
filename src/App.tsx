import React, { useState, useEffect } from 'react';
import { AppStep, DetectionResult, FileNode, INITIAL_CONFIG, RepoConfig } from './types';
import { StepUpload } from './components/Steps/1-Upload';
import { StepDetection } from './components/Steps/2-Detection';
import { StepBlueprintSelection } from './components/Steps/2-BlueprintSelection';
import { StepConfig } from './components/Steps/3-Config';
import { StepPreview } from './components/Steps/4-Preview';
import { StepGenerate } from './components/Steps/5-Generate';
import { ApiKeyInput } from './components/ApiKeyInput';
import { Box, Terminal, AlertTriangle, User, LogOut, LogIn } from 'lucide-react';
import {
  auth,
  db,
  signInWithGoogle,
  signOutUser,
  onAuthStateChange,
  addUserData,
  getUserData,
  addGeneratedRepo
} from './firebase';
import { collection, query, orderBy, getDocs } from "firebase/firestore";

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [rawInput, setRawInput] = useState<string>('');
  const [config, setConfig] = useState<RepoConfig>(INITIAL_CONFIG);
  const [generatedFiles, setGeneratedFiles] = useState<FileNode[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userRepos, setUserRepos] = useState([]);

  // Step Handlers
  const handleUploadNext = (input: string) => {
    setRawInput(input);
    setStep(AppStep.DETECTION);
  };

  const handleDetectionNext = (result: DetectionResult) => {
    // Merge detection result into config default overrides
    setConfig(prev => ({
      ...prev,
      language: result.language,
      framework: result.framework,
      projectType: result.suggestedProjectType,
      useTypeScript: result.language === 'TypeScript'
    }));
    setStep(AppStep.BLUEPRINT_SELECTION);
  };

  const handleBlueprintSelectionNext = () => setStep(AppStep.CONFIG);

  const handleConfigNext = () => setStep(AppStep.PREVIEW);
  const handlePreviewNext = () => setStep(AppStep.GENERATE);
  const handleReset = () => {
    setStep(AppStep.UPLOAD);
    setRawInput('');
    setConfig(INITIAL_CONFIG);
    setGeneratedFiles([]);
  };

  // Back Handlers
  const goBack = () => setStep(Math.max(0, step - 1));

  // Authentication handlers
  const handleLogin = async () => {
    try {
      setLoadingAuth(true);
      const result = await signInWithGoogle();
      setUser(result.user);
      
      // Save user data to Firestore
      await addUserData(result.user.uid, {
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        lastLogin: new Date().toISOString()
      });
      
      // Load user repos
      const repos = await getUserRepos(result.user.uid);
      setUserRepos(repos);
      
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoadingAuth(true);
      await signOutUser();
      setUser(null);
      setUserRepos([]);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoadingAuth(false);
    }
  };

  const getUserRepos = async (userId) => {
    try {
      const reposCollection = collection(db, "users", userId, "repos");
      const reposQuery = query(reposCollection, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(reposQuery);
      
      const repos = [];
      querySnapshot.forEach((doc) => {
        repos.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return repos;
    } catch (error) {
      console.error("Error getting user repos:", error);
      return [];
    }
  };

  // Authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser) => {
      if (authUser) {
        setUser(authUser);
        // Load user repos when authenticated
        getUserRepos(authUser.uid).then(repos => setUserRepos(repos));
      } else {
        setUser(null);
        setUserRepos([]);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Save generated repo to Firestore when generation completes
  useEffect(() => {
    if (step === AppStep.GENERATE && user && generatedFiles.length > 0) {
      const saveRepoToFirestore = async () => {
        try {
          await addGeneratedRepo(user.uid, {
            name: config.name,
            description: config.description,
            blueprintId: config.blueprintId,
            createdAt: new Date().toISOString(),
            fileCount: generatedFiles.length,
            framework: config.framework,
            language: config.language
          });
          
          // Refresh user repos
          const updatedRepos = await getUserRepos(user.uid);
          setUserRepos(updatedRepos);
        } catch (error) {
          console.error("Error saving repo to Firestore:", error);
        }
      };
      
      saveRepoToFirestore();
    }
  }, [step, user, generatedFiles, config]);

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-white font-sans selection:bg-brand-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-dark-border bg-dark-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer group"
            title="Return to home"
          >
            <div className="bg-brand-600 p-2 rounded-lg shadow-lg shadow-brand-900/50 group-hover:shadow-brand-900/70 transition-shadow">
              <Box className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center">
                RepoGen
                <span className="ml-2 text-[10px] bg-brand-900/50 text-brand-300 border border-brand-700/50 px-2 py-0.5 rounded-full font-mono">V2 BETA</span>
              </h1>
            </div>
          </button>

          {/* Demo GIF - Platform Wide */}
          <div className="flex-1 flex justify-center mx-8">
            <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTBuNmZ5cmhpdzZ4MWxoM3ZldmMxczQ3dzhpdnVpaDc3M2U5YW5qaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OrbDKvEgYsscoV9XpD/giphy.gif" alt="RepoGen Demo" className="h-12 w-auto rounded-lg shadow-md" />
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {[AppStep.UPLOAD, AppStep.DETECTION, AppStep.BLUEPRINT_SELECTION, AppStep.CONFIG, AppStep.PREVIEW, AppStep.GENERATE].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${step >= s ? 'bg-brand-500' : 'bg-dark-border'} transition-colors`} />
                {s !== AppStep.GENERATE && <div className={`w-8 h-0.5 mx-1 ${step > s ? 'bg-brand-800' : 'bg-dark-border'} transition-colors`} />}
              </div>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <ApiKeyInput onKeyChange={setHasApiKey} />
            
            {/* Authentication UI */}
            {loadingAuth ? (
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            ) : user ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-1 bg-red-600/20 hover:bg-red-600/30 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span className="text-sm">Sign out</span>
                </button>
                <div className="flex items-center space-x-2">
                  {user.photoURL && (
                    <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border-2 border-brand-500" />
                  )}
                  <span className="text-sm font-medium truncate max-w-[120px]">{user.displayName || user.email}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-colors"
                title="Sign in with Google"
              >
                <LogIn className="w-4 h-4 text-blue-400" />
                <span className="text-sm">Sign in</span>
              </button>
            )}
            
            <a
              href="https://github.com/MelroseSaint/RepositoryGeneratorV2"
              target="_blank"
              rel="noreferrer noopener"
              className="text-gray-400 hover:text-white transition-colors"
              title="View on GitHub"
            >
              <Terminal className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* API Key Announcement Banner */}
      {!hasApiKey && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 py-3 px-4 animate-in slide-in-from-top-2">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center text-yellow-200 text-sm gap-2">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="font-semibold text-yellow-400">Enterprise API Notice:</span>
            </div>
            <span className="text-center md:text-left opacity-90">
              A valid Gemini API key is required for production-grade code generation via Gemini 2.0 Flash. Operating in deterministic demo mode.
              All AI interactions are governed by our strict <strong>API Validation Authority</strong> standards for security and reliability.
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        <div className="flex-1 relative">
          {step === AppStep.UPLOAD && <StepUpload onNext={handleUploadNext} />}
          {step === AppStep.DETECTION && <StepDetection rawInput={rawInput} onNext={handleDetectionNext} onBack={goBack} />}
          {step === AppStep.BLUEPRINT_SELECTION && <StepBlueprintSelection onNext={handleBlueprintSelectionNext} onBack={goBack} />}
          {step === AppStep.CONFIG && <StepConfig config={config} setConfig={setConfig} onNext={handleConfigNext} onBack={goBack} />}
          {step === AppStep.PREVIEW && <StepPreview config={config} rawInput={rawInput} onNext={handlePreviewNext} onBack={goBack} onFilesGenerated={setGeneratedFiles} />}
          {step === AppStep.GENERATE && <StepGenerate config={config} rawInput={rawInput} onReset={handleReset} onBack={goBack} existingFiles={generatedFiles} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border py-6 mt-auto bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4">
          {user && userRepos.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Your Generated Repos</h3>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {userRepos.map((repo) => (
                  <div key={repo.id} className="flex-shrink-0 bg-dark-border/50 rounded-lg p-3 min-w-[200px]">
                    <div className="text-xs text-gray-400 mb-1">{new Date(repo.createdAt).toLocaleDateString()}</div>
                    <div className="font-medium text-sm truncate">{repo.name}</div>
                    <div className="text-xs text-gray-500 truncate">{repo.description}</div>
                    <div className="text-xs text-brand-400 mt-1">{repo.framework} • {repo.language}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="text-center text-xs text-gray-600">
            <p>&copy; {new Date().getFullYear()} RepoGen Inc. {hasApiKey ? 'Powered by Google Gemini AI.' : 'Generated code is processed locally in demo mode.'} {user && <span className="text-brand-400">• Authenticated as {user.email}</span>}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;