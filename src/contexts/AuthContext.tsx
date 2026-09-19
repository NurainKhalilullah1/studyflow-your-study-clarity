import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// 7 days in milliseconds for inactivity timeout
export const SESSION_INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000;
export const LAST_ACTIVE_KEY_PREFIX = "studyflow_last_active_";
export const VERIFIED_KEY_PREFIX = "studyflow_session_verified_";
export const SESSION_EXPIRED_REASON_KEY = "studyflow_session_expired_reason";

export const getLastActiveKey = (userId: string) => `${LAST_ACTIVE_KEY_PREFIX}${userId}`;
export const getVerifiedKey = (userId: string) => `${VERIFIED_KEY_PREFIX}${userId}`;

export const recordActivity = (userId?: string | null, force = false) => {
  if (!userId) return;
  const now = Date.now();
  const key = getLastActiveKey(userId);
  if (!force) {
    const last = localStorage.getItem(key);
    // Throttle localStorage writes to at most once every 30 seconds
    if (last && now - Number(last) < 30_000) {
      return;
    }
  }
  try {
    localStorage.setItem(key, now.toString());
  } catch {
    // ignore potential storage quota errors
  }
};

export const isSessionExpiredDueToInactivity = (userId?: string | null): boolean => {
  if (!userId) return true;
  const lastActiveStr = localStorage.getItem(getLastActiveKey(userId));
  const verifiedStr = localStorage.getItem(getVerifiedKey(userId));

  // If no timestamp exists yet, session does not exceed the limit
  if (!lastActiveStr && !verifiedStr) {
    return false;
  }

  const effectiveTimestamp = Math.max(
    Number(lastActiveStr) || 0,
    Number(verifiedStr) || 0
  );

  if (!effectiveTimestamp) return false;
  return Date.now() - effectiveTimestamp > SESSION_INACTIVITY_LIMIT_MS;
};

export const checkIsVerified = (userId?: string | null): boolean => {
  if (!userId) return false;
  if (isSessionExpiredDueToInactivity(userId)) {
    return false;
  }
  return Boolean(localStorage.getItem(getVerifiedKey(userId)));
};

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
  recordActivity: (userId?: string, force?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSessionVerified, setIsSessionVerified] = useState(false);

  const userRef = useRef<User | null>(null);
  userRef.current = user;
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const handleInactivityExpiry = useCallback(async (targetUserId?: string | null) => {
    const id = targetUserId || userRef.current?.id || sessionRef.current?.user?.id;
    if (id) {
      localStorage.removeItem(getVerifiedKey(id));
      localStorage.removeItem(getLastActiveKey(id));
    }
    try {
      sessionStorage.setItem(
        SESSION_EXPIRED_REASON_KEY,
        "Your session expired after 7 days of inactivity. Please log in again."
      );
    } catch {
      // ignore
    }
    setSession(null);
    setUser(null);
    setIsSessionVerified(false);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Sign out during inactivity expiry failed:", err);
    }
  }, []);

  useEffect(() => {
    // Initialize Native Google Auth
    if (Capacitor.isNativePlatform()) {
      try {
        GoogleAuth.initialize({
          clientId: "1048055478088-8rc0hh9t2ihbpdrmmcppe4hak2qrufn2.apps.googleusercontent.com",
          scopes: ["profile", "email"],
          grantOfflineAccess: true,
        });
      } catch (e) {
        console.warn("GoogleAuth initialization failed (non-critical if retryable):", e);
      }
    }

    // Hydrate session and auto-refresh expired access tokens via getSession()
    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error || !initialSession || !initialSession.user) {
          setSession(null);
          setUser(null);
          setIsSessionVerified(false);
          setLoading(false);
          return;
        }

        const currentUserId = initialSession.user.id;

        // Check if session has expired after 7 days of inactivity
        if (isSessionExpiredDueToInactivity(currentUserId)) {
          await handleInactivityExpiry(currentUserId);
          setLoading(false);
          return;
        }

        // Active session within 7 days
        setSession(initialSession);
        setUser(initialSession.user);
        setIsSessionVerified(checkIsVerified(currentUserId));
        recordActivity(currentUserId, true);
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes (token refreshed, signed in, signed out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === "SIGNED_OUT" || !currentSession?.user) {
          setSession(null);
          setUser(null);
          setIsSessionVerified(false);
          setLoading(false);
          return;
        }

        const currentUserId = currentSession.user.id;

        // If the user just signed in, immediately record current activity to prevent stale inactivity checks!
        if (event === "SIGNED_IN") {
          recordActivity(currentUserId, true);
        } else if (isSessionExpiredDueToInactivity(currentUserId)) {
          await handleInactivityExpiry(currentUserId);
          setLoading(false);
          return;
        }

        setSession(currentSession);
        setUser(currentSession.user);
        setIsSessionVerified(checkIsVerified(currentUserId));

        if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          recordActivity(currentUserId, true);
        }

        setLoading(false);
      }
    );

    // User activity listeners to renew rolling inactivity timer
    const onUserActivity = () => {
      const activeUserId = userRef.current?.id || sessionRef.current?.user?.id;
      if (activeUserId) {
        if (isSessionExpiredDueToInactivity(activeUserId)) {
          handleInactivityExpiry(activeUserId);
          return;
        }
        recordActivity(activeUserId);
      }
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((evt) => {
      window.addEventListener(evt, onUserActivity, { passive: true });
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        onUserActivity();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onUserActivity);

    // Capacitor app state change listener (when mobile app resumes from background)
    let capacitorListenerRemove: (() => void) | null = null;
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app").then(({ App: CapApp }) => {
        CapApp.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            onUserActivity();
          }
        }).then((handle) => {
          capacitorListenerRemove = () => handle.remove();
        });
      }).catch((e) => console.warn("Capacitor App listener error:", e));
    }

    // Periodic check every 60 seconds to detect inactivity expiry while tab is open
    const intervalId = setInterval(() => {
      const activeUserId = userRef.current?.id || sessionRef.current?.user?.id;
      if (activeUserId && isSessionExpiredDueToInactivity(activeUserId)) {
        handleInactivityExpiry(activeUserId);
      }
    }, 60_000);

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
      events.forEach((evt) => {
        window.removeEventListener(evt, onUserActivity);
      });
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onUserActivity);
      if (capacitorListenerRemove) capacitorListenerRemove();
    };
  }, [handleInactivityExpiry]);

  const markSessionVerified = (targetUserId?: string) => {
    const id = targetUserId || user?.id || session?.user?.id;
    if (id) {
      const now = Date.now().toString();
      localStorage.setItem(getVerifiedKey(id), now);
      localStorage.setItem(getLastActiveKey(id), now);
    }
    setIsSessionVerified(true);
  };

  const clearSessionVerified = (targetUserId?: string) => {
    const id = targetUserId || user?.id || session?.user?.id;
    if (id) {
      localStorage.removeItem(getVerifiedKey(id));
      localStorage.removeItem(getLastActiveKey(id));
    }
    setIsSessionVerified(false);
  };

  const handleRecordActivity = (targetUserId?: string, force = false) => {
    const id = targetUserId || userRef.current?.id || sessionRef.current?.user?.id;
    if (id) {
      recordActivity(id, force);
    }
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
        console.log("Attempting native Google Sign-In...");
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser?.authentication?.idToken || (googleUser as any)?.idToken;
        
        if (idToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });
          
          if (!error) return { error: null };
          console.warn("Native signInWithIdToken failed, falling back to web OAuth:", error);
        } else {
          console.warn("Native GoogleAuth returned no idToken, falling back to web OAuth");
        }
      } catch (nativeError: any) {
        console.warn("Native Google Sign-In failed, falling back to web OAuth:", nativeError);
      }

      // Fallback: Web OAuth via Capacitor Browser
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'com.lumina.studyflow://auth',
            skipBrowserRedirect: true,
          },
        });

        if (error) return { error };

        if (data?.url) {
          await Browser.open({ url: data.url, windowName: '_self' });
          return { error: null };
        }
        return { error: new Error("No redirect URL returned for Google Sign-In") };
      } catch (fallbackError: any) {
        console.error("Google OAuth fallback error:", fallbackError);
        return { error: new Error(fallbackError.message || "Google Sign-In failed") };
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
    const currentId = userRef.current?.id || sessionRef.current?.user?.id;
    clearSessionVerified(currentId);
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setIsSessionVerified(false);
    }
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
      recordActivity: handleRecordActivity,
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
