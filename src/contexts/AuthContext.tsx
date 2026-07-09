import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const logEvent = (
      event_type: 'sign_in' | 'sign_out' | 'password_change' | 'token_refresh',
      session_id?: string,
    ) => {
      // Fire-and-forget; never block auth on telemetry.
      supabase.functions.invoke('log-login', { body: { event_type, session_id } }).catch(() => {});
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Dedupe SIGNED_IN across tabs/refreshes for the same access token.
        const token = session?.access_token;
        if (event === 'SIGNED_IN' && token) {
          const key = 'flow.lastLoggedToken';
          if (typeof window !== 'undefined' && window.localStorage.getItem(key) !== token) {
            window.localStorage.setItem(key, token);
            setTimeout(() => logEvent('sign_in', token.slice(-16)), 0);
          }
        } else if (event === 'SIGNED_OUT') {
          if (typeof window !== 'undefined') window.localStorage.removeItem('flow.lastLoggedToken');
          setTimeout(() => logEvent('sign_out'), 0);
        } else if (event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') {
          setTimeout(() => logEvent('password_change', token?.slice(-16)), 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
