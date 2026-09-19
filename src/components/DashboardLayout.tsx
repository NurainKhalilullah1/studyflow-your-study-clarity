import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/DashboardSidebar";
import BottomNav from "@/components/BottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogOut, Settings } from "lucide-react";
import { StudyFlowLogo } from "@/components/StudyFlowLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useTrackStudyEvent, useStudyEvents } from "@/hooks/useStudyStats";

interface DashboardLayoutProps {
  children: React.ReactNode;
  hideMobileHeader?: boolean;
  /** When true, hides bottom nav (mobile) and sidebar (desktop) for distraction-free quiz mode */
  hideNav?: boolean;
}

const DashboardLayout = ({ children, hideMobileHeader, hideNav }: DashboardLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: recentEvents } = useStudyEvents(user?.id, 1);
  const trackEvent = useTrackStudyEvent();

  // Track daily login streak globally
  useEffect(() => {
    if (user && recentEvents) {
      const today = new Date().toDateString();
      const hasLoggedInToday = recentEvents.some(
        e => e.event_type === 'daily_login' && new Date(e.created_at).toDateString() === today
      );
      
      if (!hasLoggedInToday) {
        trackEvent.mutate({
          userId: user.id,
          eventType: 'daily_login',
          metadata: { source: 'app_launch' }
        });
      }
    }
  }, [user, recentEvents]);

  const handleSignOut = async () => {
    await signOut();
    queryClient.clear();
    toast({ title: "Signed out", description: "You have been signed out successfully." });
    navigate("/auth");
  };

  return (
    <SidebarProvider>
      <div className={`flex w-full bg-background ${hideMobileHeader || hideNav ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <div className={hideNav ? 'hidden' : 'hidden md:block'}>
          <DashboardSidebar />
        </div>
        <SidebarInset className="flex flex-col min-w-0 min-h-0">
          {/* Mobile Header */}
          {!hideMobileHeader && (
            <header 
              className="flex items-center justify-between px-4 border-b border-border bg-card/95 backdrop-blur-md md:hidden shrink-0 sticky top-0 z-30 transition-colors"
              style={{
                paddingTop: "env(safe-area-inset-top, 0px)",
                minHeight: "calc(3.5rem + env(safe-area-inset-top, 0px))",
              }}
            >
              <div className="flex items-center gap-2">
                <button onClick={handleSignOut} className="p-2 -ml-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
                <StudyFlowLogo size="md" variant="purple" />
                <span className="text-lg font-bold text-foreground">StudyFlow</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => navigate("/settings")} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                <ThemeToggle />
              </div>
            </header>
          )}
          
          {/* Desktop Header — hidden in distraction-free (hideNav) mode */}
          {!hideNav && (
            <div className="hidden md:flex items-center justify-between h-14 px-4 border-b border-border bg-card/80 backdrop-blur-md shrink-0 sticky top-0 z-10">
              <SidebarTrigger />
              <ThemeToggle />
            </div>
          )}

          {/* Main Content */}
          {hideMobileHeader || hideNav ? (
            <main 
              className="flex-1 overflow-hidden flex flex-col min-h-0"
              style={{ paddingTop: hideMobileHeader ? "env(safe-area-inset-top, 0px)" : undefined }}
            >
              {children}
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
              {children}
            </main>
          )}
        </SidebarInset>
        {!hideNav && <BottomNav />}
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
