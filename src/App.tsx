import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { PomodoroProvider } from "@/contexts/PomodoroContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SplashScreen } from "@/components/SplashScreen";
import { MaintenancePage, MAINTENANCE_MODE } from "@/components/MaintenanceBanner";
import { Capacitor } from "@capacitor/core";
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
import { AppUpdateGuard } from "@/components/AppUpdateGuard";
import InitialRedirect from "@/components/InitialRedirect";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenSplash, setHasSeenSplash] = useState(false);

  useEffect(() => {
    // Check if splash has already been shown in this tab/session
    const seen = sessionStorage.getItem("splashSeen");
    if (seen) {
      setShowSplash(false);
      setHasSeenSplash(true);
    }

    // Mobile App specific logic
    if (Capacitor.isNativePlatform()) {
      setShowSplash(false); // Disable web splash for mobile
      setHasSeenSplash(true);
      
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
            window.location.href = `/auth?type=recovery${hash}`;
            try { await Browser.close(); } catch (_) {}
            return;
          }

          // Normal OAuth sign-in flow (e.g. Google OAuth redirect)
          if (accessToken || searchParams.get('code')) {
            window.location.href = `/auth?google_callback=true${hash}`;
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
    setShowSplash(false);
    setHasSeenSplash(true);
    sessionStorage.setItem("splashSeen", "true");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AuthProvider>
          <PomodoroProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <NotificationGate />

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
  const { user } = useAuth();
  return <NotificationPrompt userId={user?.id} />;
};

export default App;
