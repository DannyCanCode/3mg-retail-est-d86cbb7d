import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import * as Sentry from '@sentry/react'
import { initLogger } from './utils/logger.ts'
import { initPostHog } from './lib/posthog.ts'
import { initLogRocket } from './lib/logrocket.ts'
import { warmCache } from '@/lib/cache'

// --- DEBUGGING ---
// Log the full URL as soon as the app loads to capture the redirect hash.
console.log('[DEBUG] App loading with URL:', window.location.href);
// --- END DEBUGGING ---

// Initialize Sentry, Logger, PostHog, LogRocket, and Cache
initLogger()
initPostHog()
initLogRocket()
warmCache() // 🚀 PERFORMANCE: Pre-load frequently accessed data
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,
  // @ts-ignore
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
})

// Render the application
const container = document.getElementById('root')
if (container) {
  console.log('[DEBUG] container found, mounting React root');
  const root = createRoot(container)
  console.log('[DEBUG] Calling root.render');
  root.render(
    <React.StrictMode>
      <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>
        <App />
      </Sentry.ErrorBoundary>
    </React.StrictMode>
  )
}
