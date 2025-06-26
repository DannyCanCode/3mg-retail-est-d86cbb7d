import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from "react";
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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  mounted: boolean;
  profileError: string | null;
  profileFetchAttempts: number;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// PERFORMANCE OPTIMIZATION: Simple sessionStorage for current tab only (won't interfere with estimate creation)
const SESSION_CACHE_KEY = 'auth_fast_load';

const getSessionCache = () => {
  try {
    const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const setSessionCache = (user: User | null, profile: Profile | null, session?: Session | null) => {
  try {
    if (user && profile) {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ 
        user, 
        profile, 
        session: session || null,
        timestamp: Date.now() 
      }));
    } else {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch {
    // Ignore errors
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileFetchAttempts, setProfileFetchAttempts] = useState(0);
  const [cacheLoaded, setCacheLoaded] = useState(false); // Track if we loaded from cache

  // PERFORMANCE OPTIMIZATION: Load from sessionStorage for instant UI (current tab only)
  useEffect(() => {
    const cached = getSessionCache();
    if (cached?.user && cached?.profile && (Date.now() - cached.timestamp < 60000)) { // 1 minute cache
      if (import.meta.env.DEV) {
        console.log('[AuthContext] Fast loading from session cache - SKIPPING auth initialization');
      }
      setUser(cached.user);
      setProfile(cached.profile);
      setSession(cached.session || { user: cached.user } as Session); // Use cached session or create minimal one
      setLoading(false);
      setMounted(true);
      setCacheLoaded(true); // Mark that we loaded from cache
    }
  }, []);

  // Fetch user profile data with retry logic
  const fetchProfile = useCallback(async (userId: string, attempt: number = 1): Promise<Profile | null> => {
    try {
      if (import.meta.env.DEV) {
        console.log(`[AuthContext] Fetching profile for user: ${userId} (attempt ${attempt})`);
      }
      
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (import.meta.env.DEV) {
          console.error('[AuthContext] Profile fetch error:', error);
        }
        
        // If profile doesn't exist, create a default one
        if (error.code === 'PGRST116') {
          if (import.meta.env.DEV) {
            console.log('[AuthContext] Profile not found, creating default profile');
          }
          
          // CRITICAL FIX: Check if this is a known admin email before creating fallback
          const { data: { user } } = await supabase.auth.getUser();
          const userEmail = user?.email?.toLowerCase() || '';
          
          // Known admin emails - these should have admin privileges
          const adminEmails = [
            'daniel.pedraza@3mgroofing.com',
            'connor@3mgroofing.com',
            'jay.moroff@3mgroofing.com',
            'jhagan@3mgroofing.com',
            'tyler.powell@3mgroofing.com'
          ];
          
          // Known manager emails with their territory assignments
          const managerConfig = {
            'nickolas.nell@3mgroofing.com': '86eeec95-ba2d-4785-abae-520dd07ff5a0' // Stuart territory
          };
          
          let defaultRole = 'rep';
          let shouldCompleteOnboarding = false;
          let territoryId = null;
          
          if (adminEmails.includes(userEmail)) {
            defaultRole = 'admin';
            shouldCompleteOnboarding = true;
            territoryId = null;
          } else if (managerConfig[userEmail]) {
            defaultRole = 'manager';
            shouldCompleteOnboarding = true;
            territoryId = managerConfig[userEmail];
          } else if (userEmail.endsWith('@3mgroofing.com')) {
            defaultRole = 'rep';
            shouldCompleteOnboarding = false;
            territoryId = null;
          }
          
          const defaultProfile: Profile = {
            id: userId,
            role: defaultRole,
            completed_onboarding: shouldCompleteOnboarding,
            full_name: null,
            org_id: null,
            territory_id: territoryId
          };
          
          setProfileError(null);
          return defaultProfile;
        }
        
        setProfileError(error.message);
        return null;
      }

      if (import.meta.env.DEV) {
        console.log('[AuthContext] Profile fetched successfully:', data);
      }
      setProfileError(null);
      return data as unknown as Profile;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AuthContext] Profile fetch exception:', error);
      }
      setProfileError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }, []);

  // Fetch profile with timeout and retry
  const fetchProfileWithTimeout = useCallback(async (userId: string) => {
    const maxAttempts = 2; // Reduced from 3 to 2 attempts
    const timeout = 1000; // Reduced from 3000ms to 1000ms for faster tab switching
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      setProfileFetchAttempts(attempt);
      
      try {
        // Race between profile fetch and timeout
        const profilePromise = fetchProfile(userId, attempt);
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), timeout)
        );
        
        const result = await Promise.race([profilePromise, timeoutPromise]);
        
        if (result) {
          return result;
        }
        
        // If no result but no timeout, try again (unless last attempt)
        if (attempt < maxAttempts) {
          if (import.meta.env.DEV) {
            console.log(`[AuthContext] Profile fetch attempt ${attempt} failed, retrying...`);
          }
          await new Promise(resolve => setTimeout(resolve, 200 * attempt)); // Faster retry delay
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(`[AuthContext] Profile fetch attempt ${attempt} failed:`, error);
        }
        
        if (attempt === maxAttempts) {
          // CRITICAL FIX: Use email-based role detection for emergency fallback
          if (import.meta.env.DEV) {
            console.log('[AuthContext] All profile fetch attempts failed, using email-based fallback profile to prevent white screen');
          }
          
          try {
            const { data: { user } } = await supabase.auth.getUser();
            const userEmail = user?.email?.toLowerCase() || '';
            
            // Known admin emails
            const adminEmails = [
              'daniel.pedraza@3mgroofing.com',
              'connor@3mgroofing.com',
              'jay.moroff@3mgroofing.com',
              'jhagan@3mgroofing.com',
              'tyler.powell@3mgroofing.com'
            ];
            
            // Known manager emails with their territory assignments
            const managerConfig = {
              'nickolas.nell@3mgroofing.com': '86eeec95-ba2d-4785-abae-520dd07ff5a0' // Stuart territory
            };
            
            let defaultRole = 'rep';
            let shouldCompleteOnboarding = false;
            let territoryId = null;
            
            if (adminEmails.includes(userEmail)) {
              defaultRole = 'admin';
              shouldCompleteOnboarding = true;
              territoryId = null;
            } else if (managerConfig[userEmail]) {
              defaultRole = 'manager';
              shouldCompleteOnboarding = true;
              territoryId = managerConfig[userEmail];
            } else if (userEmail.endsWith('@3mgroofing.com')) {
              defaultRole = 'rep';
              shouldCompleteOnboarding = false;
              territoryId = null;
            }
            
            return {
              id: userId,
              role: defaultRole,
              completed_onboarding: shouldCompleteOnboarding,
              full_name: null,
              org_id: null,
              territory_id: territoryId
            } as Profile;
          } catch (getUserError) {
            if (import.meta.env.DEV) {
              console.error('[AuthContext] Failed to get user for email detection:', getUserError);
            }
            // Last resort fallback
            return {
              id: userId,
              role: 'rep',
              completed_onboarding: false,
              full_name: null,
              org_id: null,
              territory_id: null
            } as Profile;
          }
        }
      }
    }
    
    // CRITICAL FIX: This should never be reached, but if it is, provide email-based fallback
    if (import.meta.env.DEV) {
      console.error('[AuthContext] Unexpected end of fetchProfileWithTimeout, providing emergency fallback');
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email?.toLowerCase() || '';
      
      // Same email detection logic
      const adminEmails = [
        'daniel.pedraza@3mgroofing.com',
        'connor@3mgroofing.com',
        'jay.moroff@3mgroofing.com',
        'jhagan@3mgroofing.com',
        'tyler.powell@3mgroofing.com'
      ];
      
      const managerEmails = [
        'nickolas.nell@3mgroofing.com'
      ];
      
      let defaultRole = 'rep';
      let shouldCompleteOnboarding = false;
      
      if (adminEmails.includes(userEmail)) {
        defaultRole = 'admin';
        shouldCompleteOnboarding = true;
      } else if (managerEmails.includes(userEmail)) {
        defaultRole = 'manager'; 
        shouldCompleteOnboarding = true;
      } else if (userEmail.endsWith('@3mgroofing.com')) {
        defaultRole = 'rep';
        shouldCompleteOnboarding = false;
      }
      
      return {
        id: userId,
        role: defaultRole,
        completed_onboarding: shouldCompleteOnboarding,
        full_name: null,
        org_id: null,
        territory_id: null
      } as Profile;
    } catch (getUserError) {
      // Absolute last resort
      return {
        id: userId,
        role: 'rep',
        completed_onboarding: false,
        full_name: null,
        org_id: null,
        territory_id: null
      } as Profile;
    }
  }, [fetchProfile]);

  // PERFORMANCE OPTIMIZATION: Reduce auth initialization timeout from 8s to 3s for faster loading
  // Initialize auth state
  useEffect(() => {
    // CRITICAL OPTIMIZATION: Skip auth initialization if we loaded from cache
    if (cacheLoaded) {
      if (import.meta.env.DEV) {
        console.log('[AuthContext] Skipping auth initialization - using cached data');
      }
      return;
    }

    let isMounted = true;
    let initializationTimeout: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      try {
        if (import.meta.env.DEV) {
          console.log('[AuthContext] Initializing auth state...');
        }
        
        // CRITICAL FIX: Reduced timeout from 8s to 3s for faster tab switching
        initializationTimeout = setTimeout(() => {
          if (isMounted) {
            if (import.meta.env.DEV) {
              console.warn('[AuthContext] Auth initialization timeout (3s), forcing completion');
            }
            setLoading(false);
            setMounted(true);
          }
        }, 3000); // Reduced from 8000ms to 3000ms
        
        // Get initial session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 2000) // 2s timeout
        );
        
        try {
          const result = await Promise.race([sessionPromise, timeoutPromise]);
          
          if (result && 'data' in result) {
            const { data: { session }, error } = result;
            
            if (error) {
              if (import.meta.env.DEV) {
                console.error('[AuthContext] Session error:', error);
              }
              setLoading(false);
              setMounted(true);
              return;
            }
            
            if (session) {
              setSession(session);
              setUser(session.user);
              
              // Fast profile fetch with shorter timeout for immediate UI
              const profileData = await fetchProfileWithTimeout(session.user.id);
              if (profileData && isMounted) {
                setProfile(profileData);
                // PERFORMANCE OPTIMIZATION: Cache successful auth state for faster future loads
                setSessionCache(session.user, profileData, session);
              }
            }
          }
        } catch (timeoutError) {
          if (import.meta.env.DEV) {
            console.warn('[AuthContext] Session fetch timeout, continuing without session');
          }
        }
        
        setLoading(false);
        setMounted(true);
        clearTimeout(initializationTimeout);
        
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[AuthContext] Auth initialization error:', error);
        }
        setLoading(false);
        setMounted(true);
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        if (import.meta.env.DEV) {
          console.log('[AuthContext] Auth state changed:', event, !!session);
        }

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setProfile(null);
          setSession(null);
          setLoading(false);
          setProfileFetchAttempts(0);
          setProfileError(null);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session.user);
          setLoading(true);
          
          // CRITICAL FIX: Add timeout protection for profile fetching during auth state changes
          try {
            const profileData = await Promise.race([
              fetchProfileWithTimeout(session.user.id),
              new Promise<Profile>((_, reject) => 
                setTimeout(() => reject(new Error('Profile fetch timeout during auth change')), 1000)
              )
            ]);
            
            if (isMounted) {
              setProfile(profileData);
              setLoading(false);
              // PERFORMANCE OPTIMIZATION: Cache successful auth state for faster future loads
              setSessionCache(session.user, profileData, session);
            }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.error('[AuthContext] Profile fetch timeout during auth state change:', error);
            }
            
            // Provide fallback profile even on timeout
            if (isMounted) {
              // CRITICAL FIX: Use email-based role detection for fallback
              try {
                const userEmail = session.user.email?.toLowerCase() || '';
                
                const adminEmails = [
                  'daniel.pedraza@3mgroofing.com',
                  'connor@3mgroofing.com',
                  'jay.moroff@3mgroofing.com',
                  'jhagan@3mgroofing.com',
                  'tyler.powell@3mgroofing.com'
                ];
                
                const managerConfig = {
                  'nickolas.nell@3mgroofing.com': '86eeec95-ba2d-4785-abae-520dd07ff5a0' // Stuart territory
                };
                
                let defaultRole = 'rep';
                let shouldCompleteOnboarding = false;
                let territoryId = null;
                
                if (adminEmails.includes(userEmail)) {
                  defaultRole = 'admin';
                  shouldCompleteOnboarding = true;
                  territoryId = null;
                } else if (managerConfig[userEmail]) {
                  defaultRole = 'manager';
                  shouldCompleteOnboarding = true;
                  territoryId = managerConfig[userEmail];
                } else if (userEmail.endsWith('@3mgroofing.com')) {
                  defaultRole = 'rep';
                  shouldCompleteOnboarding = false;
                  territoryId = null;
                }
                
                setProfile({
                  id: session.user.id,
                  role: defaultRole,
                  completed_onboarding: shouldCompleteOnboarding,
                  full_name: null,
                  org_id: null,
                  territory_id: territoryId
                });
              } catch (emailError) {
                // Last resort fallback
                setProfile({
                  id: session.user.id,
                  role: 'rep',
                  completed_onboarding: false,
                  full_name: null,
                  org_id: null,
                  territory_id: null
                });
              }
              setLoading(false);
            }
          }
        }
      }
    );

    return () => {
      isMounted = false;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
      subscription.unsubscribe();
    };
  }, [fetchProfileWithTimeout, cacheLoaded]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('[AuthContext] Logging out...');
      }
      
      // Clear cached data immediately
      sessionStorage.removeItem('supabase-session-cache');
      
      // Clear state immediately
      setUser(null);
      setProfile(null);
      setSession(null);
      setProfileFetchAttempts(0);
      setProfileError(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (import.meta.env.DEV) {
          console.error('[AuthContext] Logout error:', error);
        }
      }
      
      // Force navigation to login page
      window.location.href = '/login';
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AuthContext] Logout exception:', error);
      }
      
      // Even if logout fails, force navigation to login
      window.location.href = '/login';
    }
  }, []);

  const value = {
    user,
    session,
    profile,
    loading,
    mounted,
    profileError,
    profileFetchAttempts,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};