import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { trackUserLogin } from "@/lib/posthog";
import { identifyUser as identifyLogRocketUser } from "@/lib/logrocket";

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
const LOGOUT_FLAG_KEY = 'auth_logout_flag';

const getSessionCache = () => {
  try {
    // CRITICAL FIX: Check logout flag first - if user logged out, don't load cache
    const logoutFlag = sessionStorage.getItem(LOGOUT_FLAG_KEY);
    if (logoutFlag) {
      // Clear the logout flag and return null to prevent cache loading
      sessionStorage.removeItem(LOGOUT_FLAG_KEY);
      sessionStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    
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

  // PERFORMANCE OPTIMIZATION: Load from sessionStorage for instant UI, but always validate against actual session
  useEffect(() => {
    const loadCacheAndValidate = async () => {
      const cached = getSessionCache();
      if (cached?.user && cached?.profile && (Date.now() - cached.timestamp < 60000)) { // 1 minute cache
        if (import.meta.env.DEV) {
          console.log('[AuthContext] Loading from session cache, but validating against Supabase...');
        }
        
        // Load cached data for instant UI
        setUser(cached.user);
        setProfile(cached.profile);
        setSession(cached.session || { user: cached.user } as Session);
        setLoading(false);
        setMounted(true);
        
        // CRITICAL FIX: Always validate cached session against actual Supabase session
        try {
          if (import.meta.env.DEV) {
            console.log('[AuthContext] Validating cached session against Supabase...');
          }
          
          const { data: { session: actualSession }, error } = await supabase.auth.getSession();
          
          if (import.meta.env.DEV) {
            console.log('[AuthContext] Supabase session check result:', { 
              hasActualSession: !!actualSession, 
              error: error?.message,
              sessionUserId: actualSession?.user?.id,
              cachedUserId: cached.user?.id 
            });
          }
          
          if (error || !actualSession) {
            // No actual session - user was logged out, clear cached data
            if (import.meta.env.DEV) {
              console.log('[AuthContext] ❌ Cache validation FAILED - no actual session, clearing cached data');
            }
            setUser(null);
            setProfile(null);
            setSession(null);
            sessionStorage.removeItem(SESSION_CACHE_KEY);
            setCacheLoaded(false);
            return;
          }
          
          // Verify the session matches the cached user
          if (actualSession.user.id !== cached.user?.id) {
            if (import.meta.env.DEV) {
              console.log('[AuthContext] ❌ Cache validation FAILED - session user mismatch, clearing cached data');
            }
            setUser(null);
            setProfile(null);
            setSession(null);
            sessionStorage.removeItem(SESSION_CACHE_KEY);
            setCacheLoaded(false);
            return;
          }
          
          // Session exists and matches - cache is valid, mark as loaded from cache
          setCacheLoaded(true);
          if (import.meta.env.DEV) {
            console.log('[AuthContext] ✅ Cache validated successfully against actual session');
          }
        } catch (validationError) {
          if (import.meta.env.DEV) {
            console.warn('[AuthContext] ❌ Cache validation ERROR, clearing cached data:', validationError);
          }
          // Clear cache on validation error
          setUser(null);
          setProfile(null);
          setSession(null);
          sessionStorage.removeItem(SESSION_CACHE_KEY);
          setCacheLoaded(false);
        }
      }
    };
    
    loadCacheAndValidate();
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
          
          // Known admin emails - these should have admin priveges
          const adminEmails = [
            'daniel.pedraza@3mgroofing.com',
            'connor@3mgroofing.com',
            'jay.moroff@3mgroofing.com',
            'tyler.powell@3mgroofing.com',
            'nickolas.nell@3mgroofing.com',
            'harrison.cremata@3mgroofing.com'
          ];
          
                      // Known manager emails with their territory assignments
            const managerConfig = {
              'josh.vanhorn@3mgroofing.com': 'tampa', // Tampa territory - will be resolved dynamically
              'dmpearl@3mgroofing.com': 'south-florida', // South Florida territory - will be resolved dynamically
              'nickolas.nell@3mgroofing.com': 'southeast-florida', // Southeast Florida territory - will be resolved dynamically
              'harrison.cremata@3mgroofing.com': 'northeast-florida', // Northeast Florida territory - will be resolved dynamically
              'chase.lovejoy@3mgroofing.com': 'central-florida', // Central Florida territory - will be resolved dynamically
              'adam@3mgroofing.com': 'central-florida', // Central Florida territory - will be resolved dynamically
              'jacob.kallhoff@3mgroofing.com': 'north-central-florida' // North Central Florida territory - will be resolved dynamically
            };
          
          let defaultRole = 'rep';
          let shouldCompleteOnboarding = true; // FIXED: Always true to prevent onboarding redirect
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
            shouldCompleteOnboarding = true; // FIXED: Always true to prevent onboarding redirect
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
              'tyler.powell@3mgroofing.com'
            ];
            
            // Known manager emails with their territory assignments
            const managerConfig = {
              'josh.vanhorn@3mgroofing.com': 'tampa', // Tampa territory - will be resolved dynamically
              'dmpearl@3mgroofing.com': 'south-florida', // South Florida territory - will be resolved dynamically
              'nickolas.nell@3mgroofing.com': 'southeast-florida', // Southeast Florida territory - will be resolved dynamically
              'harrison.cremata@3mgroofing.com': 'northeast-florida', // Northeast Florida territory - will be resolved dynamically
              'chase.lovejoy@3mgroofing.com': 'central-florida', // Central Florida territory - will be resolved dynamically
              'adam@3mgroofing.com': 'central-florida', // Central Florida territory - will be resolved dynamically
              'jacob.kallhoff@3mgroofing.com': 'north-central-florida' // North Central Florida territory - will be resolved dynamically
            };
          
          let defaultRole = 'rep';
          let shouldCompleteOnboarding = true; // FIXED: Always true to prevent onboarding redirect
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
            shouldCompleteOnboarding = true; // FIXED: Always true to prevent onboarding redirect
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
              completed_onboarding: true, // FIXED: Always true to prevent onboarding redirect
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
        'tyler.powell@3mgroofing.com'
      ];
      
                  const managerEmails = [
              'nickolas.nell@3mgroofing.com',
              'harrison.cremata@3mgroofing.com'
            ];
      
      let defaultRole = 'rep';
      let shouldCompleteOnboarding = true; // FIXED: Always true to prevent onboarding redirect
      
      if (adminEmails.includes(userEmail)) {
        defaultRole = 'admin';
        shouldCompleteOnboarding = true;
      } else if (managerEmails.includes(userEmail)) {
        defaultRole = 'manager'; 
        shouldCompleteOnboarding = true;
      } else if (userEmail.endsWith('@3mgroofing.com')) {
        defaultRole = 'rep';
        shouldCompleteOnboarding = true; // FIXED: Always true to prevent onboarding redirect
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
              
              // Track successful login for analytics
              if (event === 'SIGNED_IN') {
                trackUserLogin(session.user.email || 'unknown', profileData.role);
                // Identify user in LogRocket for session replay
                identifyLogRocketUser(session.user.id, {
                  email: session.user.email || '',
                  role: profileData.role,
                  name: profileData.full_name || session.user.email || 'Unknown User'
                });
              }
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
                  'tyler.powell@3mgroofing.com'
                ];
                
                const managerConfig = {
                  'josh.vanhorn@3mgroofing.com': 'tampa', // Tampa territory - will be resolved dynamically
                  'dmpearl@3mgroofing.com': 'south-florida', // South Florida territory - will be resolved dynamically
                  'nickolas.nell@3mgroofing.com': 'southeast-florida', // Southeast Florida territory - will be resolved dynamically
                  'harrison.cremata@3mgroofing.com': 'northeast-florida', // Northeast Florida territory - will be resolved dynamically
                  'chase.lovejoy@3mgroofing.com': 'central-florida', // Central Florida territory - will be resolved dynamically
                  'adam@3mgroofing.com': 'central-florida', // Central Florida territory - will be resolved dynamically
                  'jacob.kallhoff@3mgroofing.com': 'north-central-florida' // North Central Florida territory - will be resolved dynamically
                };
              
              let defaultRole = 'rep';
              let shouldCompleteOnboarding = true; // FIXED: Always true to prevent onboarding redirect
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
                shouldCompleteOnboarding = true; // FIXED: Always true to prevent onboarding redirect
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
                completed_onboarding: true, // FIXED: Always true to prevent onboarding redirect
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
        console.log('[AuthContext] Starting logout process...');
      }
      
      // CRITICAL FIX: Set logout flag FIRST to prevent cache loading on refresh
      sessionStorage.setItem(LOGOUT_FLAG_KEY, 'true');
      
      // AGGRESSIVE LOGOUT: Clear ALL storage immediately
      sessionStorage.removeItem(SESSION_CACHE_KEY);
      sessionStorage.clear(); // Clear everything to be safe
      localStorage.removeItem('supabase.auth.token');
      
      // CRITICAL FIX: Re-set logout flag after clearing (since clear() removes it)
      sessionStorage.setItem(LOGOUT_FLAG_KEY, 'true');
      
      // Clear state immediately BEFORE Supabase logout to prevent race conditions
      setUser(null);
      setProfile(null);
      setSession(null);
      setProfileFetchAttempts(0);
      setProfileError(null);
      setCacheLoaded(false); // Reset cache loaded flag
      
      if (import.meta.env.DEV) {
        console.log('[AuthContext] State cleared, now signing out from Supabase...');
      }
      
      // Sign out from Supabase with all scopes
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        if (import.meta.env.DEV) {
          console.error('[AuthContext] Supabase logout error:', error);
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('[AuthContext] Supabase logout successful');
        }
      }
      
      // Additional cleanup - clear any remaining Supabase storage
      try {
        // Clear any remaining Supabase keys from localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.')) {
            localStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        if (import.meta.env.DEV) {
          console.warn('[AuthContext] Storage cleanup error:', storageError);
        }
      }
      
      if (import.meta.env.DEV) {
        console.log('[AuthContext] Logout process completed');
      }
      
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AuthContext] Logout exception:', error);
      }
      
      // Even if logout fails, clear state to show login
      setUser(null);
      setProfile(null);
      setSession(null);
      setProfileFetchAttempts(0);
      setProfileError(null);
      setCacheLoaded(false);
      sessionStorage.clear();
      
      // CRITICAL FIX: Ensure logout flag is set even on error
      sessionStorage.setItem(LOGOUT_FLAG_KEY, 'true');
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