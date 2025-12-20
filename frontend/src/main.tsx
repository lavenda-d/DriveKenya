import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './i18n'
import App from './App.tsx'
import './index.css'

// Import PWA service for Progressive Web App functionality
import { pwaService } from './services/pwaService.js'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "your-google-client-id.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)

// Initialize PWA functionality after app renders
if (import.meta.env.PROD || import.meta.env.DEV) {
  // PWA service automatically initializes on import
  console.log('🚀 PWA: DriveKenya is now installable and supports offline mode!');
  console.log('🔧 PWA: Service worker registration handled automatically');
}
