import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  role: string;
  org_id?: string | null;
  territory_id?: string | null;
  completed_onboarding?: boolean;
  full_name?: string | null;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  profile: Profile | null;
  session: Session | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({ 
  user: null, 
  loading: true, 
  profile: null, 
  session: null,
  logout: async () => {}
});

// Session timeout: 30 minutes (in milliseconds)
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before timeout

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Activity tracking
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);

  // Manual logout function
  const logout = useCallback(async () => {
    console.log('[Auth] Manual logout initiated');
    try {
      await supabase.auth.signOut();
      // Clear activity timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    } catch (error) {
      console.error('[Auth] Error during logout:', error);
    }
  }, []);

  // Auto logout due to inactivity
  const autoLogout = useCallback(async () => {
    console.log('[Auth] Auto logout due to inactivity');
    try {
      await supabase.auth.signOut();
      // Show notification to user
      if (typeof window !== 'undefined') {
        alert('Your session has expired due to inactivity. Please log in again.');
      }
    } catch (error) {
      console.error('[Auth] Error during auto logout:', error);
    }
  }, []);

  // Show warning before auto logout
  const showTimeoutWarning = useCallback(() => {
    console.log('[Auth] Showing timeout warning');
    if (typeof window !== 'undefined') {
      const shouldContinue = confirm(
        'Your session will expire in 5 minutes due to inactivity. Click OK to continue your session or Cancel to log out now.'
      );
      
      if (shouldContinue) {
        // Reset activity timer
        resetActivityTimers();
      } else {
        // User chose to log out
        logout();
      }
    }
  }, [logout]);

  // Update last activity time and reset timers
  const resetActivityTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    
    // Only set timers if user is logged in
    if (user) {
      // Set warning timer (25 minutes)
      warningRef.current = setTimeout(showTimeoutWarning, SESSION_TIMEOUT - WARNING_TIME);
      
      // Set logout timer (30 minutes)
      timeoutRef.current = setTimeout(autoLogout, SESSION_TIMEOUT);
    }
  }, [user, showTimeoutWarning, autoLogout]);

  // Activity event listeners
  useEffect(() => {
    if (!user) return;

    const activityEvents = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    const handleActivity = () => {
      resetActivityTimers();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial activity setup
    resetActivityTimers();

    // Cleanup function
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [user]); // REMOVED resetActivityTimers from dependencies to prevent loop

  useEffect(() => {
    // The onAuthStateChange listener is the single source of truth.
    // It handles the initial session check AND any subsequent changes.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log(`[Auth] onAuthStateChange event fired: ${_event}`);
        
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // If there's a user, fetch their profile with timeout protection
          await fetchProfile(currentUser.id);
        } else {
          // If there's no session/user, clear the profile and timers.
          setProfile(null);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          if (warningRef.current) clearTimeout(warningRef.current);
        }
        
        // The first time this runs, the user is no longer loading.
        console.log('[DEBUG] Setting loading to false');
        setLoading(false);
      }
    );

    return () => {
      // Cleanup the listener when the component unmounts.
      authListener.subscription.unsubscribe();
    };
  }, []); // REMOVED updateLastActivity from dependencies

  async function fetchProfile(uid: string) {
    console.log(`[Auth] Fetching profile for user: ${uid}`);
    try {
      // The profile might not exist immediately after signup due to trigger delays.
      // We will attempt to fetch it, but gracefully handle if it's not there yet.
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('id, role, org_id, territory_id, completed_onboarding, full_name')
        .eq('id', uid)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[Auth] Error fetching profile:', error);
        setProfile(null);
      } else {
        const profileData = data as unknown as Profile | null;
        console.log('[Auth] Profile fetch result:', profileData);
        setProfile(profileData);
      }
    } catch (error: any) {
      console.error('[Auth] Critical error in fetchProfile:', error);
      setProfile(null);
    }
  }
  
  const value = { session, user, profile, loading, logout };

  console.log('[DEBUG] AuthContext value updated:', value);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);