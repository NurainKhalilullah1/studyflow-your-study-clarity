import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, FolderOpen, Sparkles, Trophy, Users, Shield, Layers, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/useSubscription";

const navItems = [
  { title: "Home",    url: "/dashboard",  icon: LayoutDashboard },
  { title: "Docs",    url: "/documents",  icon: FolderOpen },
  { title: "AI Tutor",url: "/tutor",      icon: Sparkles },
  { title: "Focus",   url: "/focus-room", icon: Headphones },
  { title: "Cards",   url: "/flashcards", icon: Layers },
  { title: "Ranks",   url: "/leaderboard",icon: Trophy },
  { title: "Community",url:"/community",  icon: Users },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: isAdmin } = useIsAdmin();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]")} />
              <span className="text-[10px] font-medium">{item.title}</span>
            </button>
          );
        })}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
              location.pathname === "/admin"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Shield className={cn("w-5 h-5", location.pathname === "/admin" && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]")} />
            <span className="text-[10px] font-medium">Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
