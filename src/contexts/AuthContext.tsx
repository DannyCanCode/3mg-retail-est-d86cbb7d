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
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Simplified logout function
  const logout = useCallback(async () => {
    if (import.meta.env.DEV) {
      console.log('[Auth] Manual logout initiated');
    }
    try {
      await supabase.auth.signOut();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[Auth] Error during logout:', error);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          if (import.meta.env.DEV) {
            console.error('[Auth] Error getting initial session:', error);
          }
          setLoading(false);
          return;
        }

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchProfile(initialSession.user.id);
        }
        
        setLoading(false);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[Auth] Critical error getting initial session:', error);
        }
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (import.meta.env.DEV) {
          console.log(`[Auth] Auth state changed: ${event}`);
        }
        
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Initialize
    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (uid: string) => {
    if (import.meta.env.DEV) {
      console.log(`[Auth] Fetching profile for user: ${uid}`);
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('id, role, org_id, territory_id, completed_onboarding, full_name')
        .eq('id', uid)
        .single();

      if (error && error.code !== 'PGRST116') {
        if (import.meta.env.DEV) {
          console.error('[Auth] Error fetching profile:', error);
        }
        setProfile(null);
      } else {
        const profileData = data as unknown as Profile | null;
        if (import.meta.env.DEV) {
          console.log('[Auth] Profile fetch result:', profileData);
        }
        setProfile(profileData);
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('[Auth] Critical error in fetchProfile:', error);
      }
      setProfile(null);
    }
  };
  
  const value = { session, user, profile, loading, logout };

  if (import.meta.env.DEV) {
    console.log('[DEBUG] AuthContext value updated:', { 
      hasUser: !!user, 
      hasProfile: !!profile, 
      loading,
      role: profile?.role 
    });
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);