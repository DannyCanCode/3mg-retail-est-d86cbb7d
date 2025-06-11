import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase } from '@/integrations/supabase/client'

// NEW – bootstrap auth session then mount React
(async () => {
  // Handle email-magic or OAuth redirect hash
  if (window.location.hash.includes("access_token")) {
    try {
      const { error } = await supabase.auth.recoverSession(
        window.location.hash
      );
      if (error) console.error("Auth session recovery error:", error.message);
      // Clean the URL so tokens aren't exposed
      window.history.replaceState({}, "", "/");
    } catch (err) {
      console.error("Auth recovery exception", err);
    }
  }

  // Always listen for auth state changes (optional for debugging)
  supabase.auth.onAuthStateChange((_event, session) => {
    console.log("[Auth] Session", session);
  });

  // Mount the app
  createRoot(document.getElementById("root")!).render(<App />);
})();
