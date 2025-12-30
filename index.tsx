import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ModelRegistry } from './services/modelRegistrySystem';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register Service Worker
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js')
//       .then(registration => {
//         console.log('SW registered: ', registration);
//       })
//       .catch(registrationError => {
//         console.log('SW registration failed: ', registrationError);
//       });
//   });
// }

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Note: Model registry system is available but not initialized by default
// The existing aiService.ts works correctly with current SDK versions
// Model registry can be enabled later for advanced features
// 
// To enable model registry initialization:
// Uncomment the following code:
// (async () => {
//   try {
//     await ModelRegistry.initialize();
//     console.log('🎉 Model Registry system initialized successfully');
//   } catch (error) {
//     console.error('❌ Failed to initialize Model Registry:', error);
//   }
// })();
