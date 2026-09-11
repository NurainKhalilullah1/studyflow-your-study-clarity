import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  BookOpen, 
  CalendarCheck, 
  Sparkles, 
  ClipboardList,
  FolderOpen,
  Trophy,
  Users,
  Settings, 
  LogOut,
  Shield,
  Layers,
  Headphones
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useSubscription";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { StudyFlowLogo } from "./StudyFlowLogo";
import StorageIndicator from "./dashboard/StorageIndicator";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Documents", url: "/documents", icon: FolderOpen },
  { title: "My Courses", url: "/courses", icon: BookOpen },
  { title: "Assignments", url: "/assignments", icon: CalendarCheck },
  { title: "AI Tutor", url: "/tutor", icon: Sparkles },
  { title: "My Flashcards", url: "/flashcards", icon: Layers },
  { title: "Focus Room", url: "/focus-room", icon: Headphones },
  { title: "Quiz History", url: "/quiz-history", icon: ClipboardList },
  { title: "Community", url: "/community", icon: Users },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Settings", url: "/settings", icon: Settings },
];

const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { data: isAdmin } = useIsAdmin();

  const handleSignOut = async () => {
    await signOut();
    queryClient.clear(); // Clear all cached data to prevent stale data on re-login
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <StudyFlowLogo size="md" variant="purple" className="shrink-0" />
          {!isCollapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">StudyFlow</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <a
                      href={item.url}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.url);
                      }}
                      className="flex items-center gap-3"
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/admin")}
                    tooltip="Admin Panel"
                  >
                    <a
                      href="/admin"
                      onClick={(e) => { e.preventDefault(); navigate("/admin"); }}
                      className="flex items-center gap-3 text-primary"
                    >
                      <Shield className="w-5 h-5 shrink-0" />
                      <span>Admin Panel</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Storage Indicator */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <StorageIndicator />
      </div>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Logout"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
