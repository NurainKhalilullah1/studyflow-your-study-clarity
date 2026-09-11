import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Calendar, CheckCircle2, AlertCircle, Upload, Sparkles, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AddAssignmentDialog } from "@/components/AddAssignmentDialog";
import { StudyStatsDashboard } from "@/components/dashboard/StudyStatsDashboard";
import { QuizAnalytics } from "@/components/dashboard/QuizAnalytics";
import { WeeklyGoals } from "@/components/dashboard/WeeklyGoals";
import { DashboardPomodoroCard } from "@/components/dashboard/DashboardPomodoroCard";
import { XPProgressCard } from "@/components/dashboard/XPProgressCard";
import { AchievementsCard } from "@/components/dashboard/AchievementsCard";
import { useStudyEvents } from "@/hooks/useStudyStats";
import { useDueFlashcards } from "@/hooks/useFlashcards";
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dueCount = 0 } = useDueFlashcards(user?.id);
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";

  const [stats, setStats] = useState([
    { label: "Assignments Pending", value: 0, icon: ClipboardList, color: "text-primary" },
    { label: "Upcoming Exams", value: 0, icon: Calendar, color: "text-accent" },
    { label: "Tasks Completed", value: 0, icon: CheckCircle2, color: "text-emerald-500" },
  ]);

  const [urgentAssignments, setUrgentAssignments] = useState<any[]>([]);

  const fetchData = async () => {
    if (!user) return;

    const { count: pendingCount } = await supabase
      .from("assignments")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .eq("type", "assignment");

    const { count: examCount } = await supabase
      .from("assignments")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .eq("type", "exam");

    const { count: completedCount } = await supabase
      .from("assignments")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("status", "completed");

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const { data: urgent } = await supabase
      .from("assignments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .lte("due_date", threeDaysFromNow.toISOString())
      .order("due_date", { ascending: true })
      .limit(3);

    setStats([
      { label: "Assignments Pending", value: pendingCount || 0, icon: ClipboardList, color: "text-primary" },
      { label: "Upcoming Exams", value: examCount || 0, icon: Calendar, color: "text-accent" },
      { label: "Tasks Completed", value: completedCount || 0, icon: CheckCircle2, color: "text-emerald-500" },
    ]);

    if (urgent) {
      setUrgentAssignments(urgent.map(a => ({
        ...a,
        dueIn: new Date(a.due_date).toLocaleDateString()
      })));
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            {getGreeting()}, {userName} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here is your academic overview.</p>
        </motion.div>

        {dueCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 sm:p-5 border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm sm:text-base">
                  {dueCount} Flashcard{dueCount !== 1 ? "s" : ""} Due for Spaced Repetition Review
                </p>
                <p className="text-xs text-muted-foreground">
                  Reinforce these concepts before memory decay sets in (~{Math.max(1, Math.ceil(dueCount * 0.4))} min)
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="glow"
              onClick={() => navigate("/flashcards")}
              className="shrink-0 font-medium text-xs sm:text-sm"
            >
              Start Daily Review →
            </Button>
          </motion.div>
        )}

        {/* Pomodoro Timer, Weekly Goals and Study Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <DashboardPomodoroCard />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
            <WeeklyGoals />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <XPProgressCard />
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
          <StudyStatsDashboard />
        </motion.div>

        {/* Achievements */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <AchievementsCard />
        </motion.div>

        {/* Quiz Performance Analytics */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <QuizAnalytics />
        </motion.div>

        {/* Assignment Stats Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card/60 backdrop-blur-xl rounded-xl p-5 shadow-xl border border-border/50 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-muted/80 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Due Soon */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card/60 backdrop-blur-xl rounded-xl p-6 shadow-xl border border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">Due Soon</h2>
          </div>
          
          {urgentAssignments.length > 0 ? (
            <div className="space-y-3">
              {urgentAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{assignment.title}</p>
                        {assignment.type === 'exam' && <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full uppercase font-bold">Exam</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{assignment.course_name}</p>
                  </div>
                  <span className="text-sm font-medium text-destructive bg-destructive/10 px-3 py-1 rounded-full">
                    {assignment.dueIn}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted rounded-lg">
              <Sparkles className="w-8 h-8 text-primary/50 mb-2" />
              <p className="text-muted-foreground">No urgent deadlines!</p>
              <div className="mt-4">
                <AddAssignmentDialog onAssignmentAdded={fetchData} />
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card/60 backdrop-blur-xl rounded-xl p-6 shadow-xl border border-border/50">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2" onClick={() => navigate('/tutor')}>
              <Upload className="w-4 h-4" /> Upload PDF
            </Button>
            <AddAssignmentDialog onAssignmentAdded={fetchData} />
            <Button variant="secondary" className="gap-2" onClick={() => navigate('/tutor')}>
              <Sparkles className="w-4 h-4" /> Ask AI
            </Button>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
