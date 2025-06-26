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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [profileFetchAttempts, setProfileFetchAttempts] = useState(0);
  const [profileError, setProfileError] = useState<string | null>(null);

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
    const maxAttempts = 3;
    const timeout = 3000; // Reduced to 3 seconds for faster response
    
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
          await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Shorter exponential backoff
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

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    let initializationTimeout: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      try {
        if (import.meta.env.DEV) {
          console.log('[AuthContext] Initializing auth state...');
        }
        
        // CRITICAL FIX: Set a maximum initialization timeout to prevent infinite loading
        initializationTimeout = setTimeout(() => {
          if (isMounted) {
            if (import.meta.env.DEV) {
              console.warn('[AuthContext] Auth initialization timeout, forcing completion');
            }
            setLoading(false);
            setMounted(true);
          }
        }, 8000); // 8 seconds max initialization time
        
        // Get initial session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        );
        
        const { data: { session: initialSession }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        
        if (error) {
          if (import.meta.env.DEV) {
            console.error('[AuthContext] Error getting initial session:', error);
          }
          if (isMounted) {
            setLoading(false);
            setMounted(true);
          }
          return;
        }

        if (initialSession?.user && isMounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Fetch profile with timeout
          const profileData = await fetchProfileWithTimeout(initialSession.user.id);
          if (isMounted) {
            setProfile(profileData);
          }
        }
        
        if (isMounted) {
          clearTimeout(initializationTimeout);
          setLoading(false);
          setMounted(true);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[AuthContext] Auth initialization error:', error);
        }
        if (isMounted) {
          clearTimeout(initializationTimeout);
          setLoading(false);
          setMounted(true);
        }
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
                setTimeout(() => reject(new Error('Profile fetch timeout during auth change')), 6000)
              )
            ]);
            
            if (isMounted) {
              setProfile(profileData);
              setLoading(false);
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
  }, [fetchProfileWithTimeout]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('[AuthContext] Logging out...');
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (import.meta.env.DEV) {
          console.error('[AuthContext] Logout error:', error);
        }
      }
      
      // Clear state
      setUser(null);
      setProfile(null);
      setSession(null);
      setProfileFetchAttempts(0);
      setProfileError(null);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AuthContext] Logout exception:', error);
      }
    }
  }, []);

  const value = {
    user,
    loading: loading || !mounted,
    profile,
    session,
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