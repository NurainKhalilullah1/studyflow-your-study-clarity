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

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenSplash, setHasSeenSplash] = useState(false);

  useEffect(() => {
    // Check if user has already seen splash in this session
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
      CapacitorApp.addListener('appUrlOpen', (event) => {
        const parsedUrl = new URL(event.url);

        // OAuth flow: Supabase returns access_token in the URL hash
        if (parsedUrl.hash && parsedUrl.hash.includes('access_token')) {
          window.location.hash = parsedUrl.hash;
          Browser.close();
          return;
        }

        // Password-recovery flow: Supabase redirects with type=recovery in the
        // query string. Navigate to /auth so onAuthStateChange can fire
        // PASSWORD_RECOVERY and let the user set a new password.
        const type = parsedUrl.searchParams.get('type');
        if (type === 'recovery') {
          // Preserve the full query so Supabase can exchange the token
          window.location.href = `/auth${parsedUrl.search}${parsedUrl.hash}`;
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
