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

  // Fetch user profile data
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      if (import.meta.env.DEV) {
        console.log('[AuthContext] Fetching profile for user:', userId);
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
        return null;
      }

      if (import.meta.env.DEV) {
        console.log('[AuthContext] Profile fetched successfully:', data);
      }
      return data as unknown as Profile;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AuthContext] Profile fetch exception:', error);
      }
      return null;
    }
  }, []);

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
          }
          return;
        }

        if (initialSession?.user && isMounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Fetch profile
          const profileData = await fetchProfile(initialSession.user.id);
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
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session.user);
          setLoading(true);
          
          // Fetch profile
          const profileData = await fetchProfile(session.user.id);
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
  }, [fetchProfile]);

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