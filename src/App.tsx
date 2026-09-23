import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, useTheme } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { PomodoroProvider } from "@/contexts/PomodoroContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SplashScreen } from "@/components/SplashScreen";
import { MaintenancePage, MAINTENANCE_MODE } from "@/components/MaintenanceBanner";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Courses from "./pages/Courses";
import Assignments from "./pages/Assignments";
import Tutor from "./pages/Tutor";
import Documents from "./pages/Documents";
import Flashcards from "./pages/Flashcards";
import Quiz from "./pages/Quiz";
import QuizHistory from "./pages/QuizHistory";
import Settings from "./pages/Settings";
import Leaderboard from "./pages/Leaderboard";
import Community from "./pages/Community";
import Features from "./pages/Features";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Admin from "./pages/Admin";
import Upgrade from "./pages/Upgrade";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import DownloadPage from "./pages/Download";
import SharedQuiz from "@/pages/SharedQuiz";
import FocusRoom from "./pages/FocusRoom";
import GroupJoin from "./pages/GroupJoin";
import { useGroupNotifications } from "@/hooks/useGroupNotifications";
import { AppUpdateGuard } from "@/components/AppUpdateGuard";
import InitialRedirect from "@/components/InitialRedirect";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

// Module-level flag: true once the splash has been shown in this WebView lifecycle.
// On native Android the WebView is created fresh on each cold launch so this always
// starts as false, meaning the splash always plays on launch.
let splashShownThisSession = false;

const App = () => {
  // On native: always show on first render (module flag guards against in-app re-mounts)
  // On web: respect sessionStorage so navigating tabs doesn't re-trigger the splash
  const [showSplash, setShowSplash] = useState(() => {
    if (Capacitor.isNativePlatform()) {
      return !splashShownThisSession;
    }
    return !sessionStorage.getItem("splashSeen");
  });
  const [hasSeenSplash, setHasSeenSplash] = useState(() => {
    if (Capacitor.isNativePlatform()) {
      return splashShownThisSession;
    }
    return !!sessionStorage.getItem("splashSeen");
  });

  useEffect(() => {

    // Mobile App specific logic
    if (Capacitor.isNativePlatform()) {
      // Listen for deep links (Supabase OAuth and password-recovery redirects)
      CapacitorApp.addListener('appUrlOpen', async (event) => {
        try {
          const urlStr = event.url;
          const hashIdx = urlStr.indexOf('#');
          const searchIdx = urlStr.indexOf('?');
          
          let hash = '';
          let search = '';
          if (hashIdx !== -1) {
            hash = urlStr.substring(hashIdx);
          }
          if (searchIdx !== -1) {
            search = hashIdx !== -1 && hashIdx > searchIdx 
              ? urlStr.substring(searchIdx, hashIdx) 
              : urlStr.substring(searchIdx);
          }

          const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
          const searchParams = new URLSearchParams(search.replace(/^\?/, ''));

          const isRecovery =
            hashParams.get('type') === 'recovery' ||
            searchParams.get('type') === 'recovery' ||
            urlStr.includes('type=recovery');

          const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');

          // If tokens are in URL, set the Supabase session explicitly
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }

          if (isRecovery) {
            sessionStorage.setItem('studyflow_pending_recovery', 'true');
            window.history.pushState({}, '', `/auth?type=recovery${hash}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
            window.dispatchEvent(new HashChangeEvent('hashchange'));
            try { await Browser.close(); } catch (_) {}
            return;
          }

          // Normal OAuth sign-in flow (e.g. Google OAuth redirect)
          if (accessToken || searchParams.get('code')) {
            window.history.pushState({}, '', `/auth?google_callback=true${hash}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
            try { await Browser.close(); } catch (_) {}
            return;
          }
        } catch (e) {
          console.error("Deep link handler error:", e);
        }
      });
    }
  }, []);

  const handleSplashComplete = () => {
    splashShownThisSession = true;
    setShowSplash(false);
    setHasSeenSplash(true);
    if (!Capacitor.isNativePlatform()) {
      sessionStorage.setItem("splashSeen", "true");
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <StatusBarController />
        <AuthProvider>
          <PomodoroProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />

              {/* ── Strict Maintenance Gate ────────────────────── */}
              {MAINTENANCE_MODE ? (
                <MaintenancePage />
              ) : (
                <>
                  {/* Splash Screen - only on first load per session */}
                  {showSplash && !hasSeenSplash && (
                    <SplashScreen onComplete={handleSplashComplete} />
                  )}

                  <AppUpdateGuard>
                    <BrowserRouter>
                      <NotificationGate />
                      <Routes>
                        <Route path="/" element={<InitialRedirect />} />
                        <Route path="/features" element={<Features />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/terms" element={<TermsOfService />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/upgrade" element={<Upgrade />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/download" element={<DownloadPage />} />
                        <Route path="/shared-quiz/:sessionId" element={<SharedQuiz />} />
                        <Route
                          path="/dashboard"
                          element={
                            <ProtectedRoute>
                              <Dashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/courses"
                          element={
                            <ProtectedRoute>
                              <Courses />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/assignments"
                          element={
                            <ProtectedRoute>
                              <Assignments />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/tutor"
                          element={
                            <ProtectedRoute>
                              <Tutor />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/documents"
                          element={
                            <ProtectedRoute>
                              <Documents />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/flashcards"
                          element={
                            <ProtectedRoute>
                              <Flashcards />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/quiz"
                          element={
                            <ProtectedRoute>
                              <Quiz />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/quiz-history"
                          element={
                            <ProtectedRoute>
                              <QuizHistory />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/settings"
                          element={
                            <ProtectedRoute>
                              <Settings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/leaderboard"
                          element={
                            <ProtectedRoute>
                              <Leaderboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/community"
                          element={
                            <ProtectedRoute>
                              <Community />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin"
                          element={
                            <ProtectedRoute>
                              <Admin />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/focus-room"
                          element={
                            <ProtectedRoute>
                              <FocusRoom />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/analytics"
                          element={
                            <ProtectedRoute>
                              <Analytics />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="/groups/join/:code" element={<GroupJoin />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </BrowserRouter>
                  </AppUpdateGuard>
                </>
              )}
            </TooltipProvider>
          </PomodoroProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Inner component: needs to live inside AuthProvider to access useAuth()
const NotificationGate = () => {
  const { user, isSessionVerified } = useAuth();
  useGroupNotifications();
  if (!user || !isSessionVerified) return null;
  return <NotificationPrompt userId={user.id} />;
};

// Controls native status bar overlay and theme-aware colors
const StatusBarController = () => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const configureStatusBar = async () => {
      try {
        // Disallow webview from scrolling underneath the native phone status bar
        await StatusBar.setOverlaysWebView({ overlay: false });

        const isDark = resolvedTheme === "dark";
        // Dark theme -> light icons on dark status bar (#090D16)
        // Light theme -> dark icons on light status bar (#FFFFFF)
        await StatusBar.setStyle({
          style: isDark ? Style.Dark : Style.Light,
        });
        await StatusBar.setBackgroundColor({
          color: isDark ? "#090d16" : "#ffffff",
        });
      } catch (err) {
        console.warn("StatusBar setup warning:", err);
      }
    };

    configureStatusBar();
  }, [resolvedTheme]);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none bg-background/95 backdrop-blur-md md:hidden transition-colors"
      style={{ height: "env(safe-area-inset-top, 0px)" }}
    />
  );
};

export default App;
