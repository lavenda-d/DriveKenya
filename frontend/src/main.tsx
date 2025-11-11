import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import PWA service for Progressive Web App functionality
import { pwaService } from './services/pwaService.js'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Initialize PWA functionality after app renders
if (import.meta.env.PROD || import.meta.env.DEV) {
  // Register service worker and initialize PWA features
  pwaService.initialize()
    .then(() => {
      console.log('🚀 PWA: DriveKenya is now installable and supports offline mode!');
    })
    .catch((error) => {
      console.warn('⚠️ PWA: Failed to initialize PWA features:', error);
    });
}
