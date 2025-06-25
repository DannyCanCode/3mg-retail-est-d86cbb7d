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
          // Create default profile for this user
          const defaultProfile: Profile = {
            id: userId,
            role: 'rep', // Default role
            completed_onboarding: false,
            full_name: null,
            org_id: null,
            territory_id: null
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
    const timeout = 5000; // 5 seconds
    
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
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(`[AuthContext] Profile fetch attempt ${attempt} failed:`, error);
        }
        
        if (attempt === maxAttempts) {
          // Final attempt failed, create default profile
          if (import.meta.env.DEV) {
            console.log('[AuthContext] All profile fetch attempts failed, using default profile');
          }
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
    
    return null;
  }, [fetchProfile]);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        if (import.meta.env.DEV) {
          console.log('[AuthContext] Initializing auth state...');
        }
        
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
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
          setLoading(false);
          setMounted(true);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[AuthContext] Auth initialization error:', error);
        }
        if (isMounted) {
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
          
          // Fetch profile with timeout
          const profileData = await fetchProfileWithTimeout(session.user.id);
          if (isMounted) {
            setProfile(profileData);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
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