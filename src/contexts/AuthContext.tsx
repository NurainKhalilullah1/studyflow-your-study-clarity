import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSessionVerified: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  sendVerificationCode: (email: string, purpose?: string, name?: string) => Promise<{ ok: boolean; error?: string; cooldown?: boolean; message?: string }>;
  verifyCode: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  markSessionVerified: (userId?: string) => void;
  clearSessionVerified: (userId?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionVerified, setIsSessionVerified] = useState(false);

  const checkIsVerified = (userId?: string | null) => {
    if (!userId) return false;
    return Boolean(localStorage.getItem(`studyflow_session_verified_${userId}`));
  };

  useEffect(() => {
    let initialValidationDone = false;
    // Initialize Native Google Auth
    if (Capacitor.isNativePlatform()) {
      try {
        GoogleAuth.initialize();
      } catch (e) {
        console.warn("GoogleAuth initialization failed (non-critical if retryable):", e);
      }
    }

    // Validate session with server, not just local token
    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (error || !user) {
        // Token is invalid or user was deleted - clear local session
        // IMPORTANT: Never eagerly sign out if we're in the middle of an OAuth redirect 
        // OR if this is a fresh launch where we already have no session (prevents potential null errors)
        const hasHashToken = window.location.hash.includes('access_token');
        if (!hasHashToken && (session || user)) {
          setSession(null);
          setUser(null);
          setIsSessionVerified(false);
          await supabase.auth.signOut({ scope: "local" });
        }
      } else {
        // Valid user, now get the full session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        setIsSessionVerified(checkIsVerified(session?.user?.id));
      }
      initialValidationDone = true;
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Ignore INITIAL_SESSION during startup to prevent stale cached sessions
        if (event === "INITIAL_SESSION" && !initialValidationDone) {
          return;
        }
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setIsSessionVerified(checkIsVerified(currentUser?.id));
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const markSessionVerified = (targetUserId?: string) => {
    const id = targetUserId || user?.id;
    if (id) {
      localStorage.setItem(`studyflow_session_verified_${id}`, Date.now().toString());
    }
    setIsSessionVerified(true);
  };

  const clearSessionVerified = (targetUserId?: string) => {
    const id = targetUserId || user?.id;
    if (id) {
      localStorage.removeItem(`studyflow_session_verified_${id}`);
    }
    setIsSessionVerified(false);
  };

  const sendVerificationCode = async (email: string, purpose = "signin", name?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("auth-verification", {
        body: { action: "send", email, purpose, name },
      });

      if (error) {
        return { ok: false, error: error.message || "Failed to send verification code." };
      }
      if (data?.error) {
        return { ok: false, error: data.error, cooldown: data.cooldown };
      }
      return { ok: true, message: data?.message };
    } catch (err: any) {
      return { ok: false, error: err.message || "Network error while requesting verification code." };
    }
  };

  const verifyCode = async (email: string, code: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("auth-verification", {
        body: { action: "verify", email, code },
      });

      if (error) {
        return { ok: false, error: error.message || "Verification request failed." };
      }
      if (data?.error) {
        return { ok: false, error: data.error };
      }
      if (data?.verified) {
        markSessionVerified();
        return { ok: true };
      }
      return { ok: false, error: "Verification was not confirmed." };
    } catch (err: any) {
      return { ok: false, error: err.message || "Network error while verifying code." };
    }
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: Capacitor.isNativePlatform() ? 'com.lumina.studyflow://onboarding' : `${window.location.origin}/onboarding`,
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

  const signInWithGoogle = async () => {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      try {
        // 1. Get ID Token from Native Google Sign-In
        const googleUser = await GoogleAuth.signIn();
        
        if (!googleUser.authentication?.idToken) {
          throw new Error("No ID token returned from Google");
        }

        // 2. Pass ID Token to Supabase
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: googleUser.authentication.idToken,
        });
        
        return { error };
      } catch (error: any) {
        console.error("Native Google Sign-In Error:", error);
        return { error: new Error(error.message || "Native Google Sign-In failed") };
      }
    } else {
      // Web fallback
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth?google_callback=true`,
        },
      });

      if (error) return { error };

      if (data?.url) {
        window.location.href = data.url;
      }
      return { error: null };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Capacitor.isNativePlatform() ? 'com.lumina.studyflow://auth' : `${window.location.origin}/auth`,
    });
    return { error };
  };

  const signOut = async () => {
    clearSessionVerified();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isSessionVerified,
      signUp,
      signIn,
      signInWithGoogle,
      resetPassword,
      signOut,
      sendVerificationCode,
      verifyCode,
      markSessionVerified,
      clearSessionVerified,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
