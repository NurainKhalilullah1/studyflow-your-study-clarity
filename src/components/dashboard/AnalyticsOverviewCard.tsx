import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Flame, Clock, Brain, TrendingUp, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics } from '@/hooks/useAnalytics';

const StatPill = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) => (
  <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
    <div className={`flex items-center justify-center w-9 h-9 rounded-full ${color} bg-opacity-15 mb-0.5`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <span className="text-lg font-bold text-foreground leading-none">{value}</span>
    <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
  </div>
);

export const AnalyticsOverviewCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { stats, isLoading } = useAnalytics(user?.id, '7d');

  const focusHours = (stats.totalStudyMinutes / 60).toFixed(1);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card className="border border-border/50 bg-gradient-to-br from-card to-card/80 shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
            Study Overview · 7 days
          </CardTitle>
          <Button
            id="analytics-view-full-btn"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary gap-1"
            onClick={() => navigate('/analytics')}
          >
            Full analytics
            <ArrowRight className="w-3 h-3" />
          </Button>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex gap-4 justify-around py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <Skeleton className="w-10 h-5 rounded" />
                  <Skeleton className="w-14 h-3 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 justify-around py-1">
              <StatPill
                icon={Flame}
                label="Day streak"
                value={`${stats.currentStreak}d`}
                color="text-orange-500"
              />
              <div className="w-px bg-border self-stretch" />
              <StatPill
                icon={Clock}
                label="Focus hours"
                value={focusHours}
                color="text-blue-500"
              />
              <div className="w-px bg-border self-stretch" />
              <StatPill
                icon={Brain}
                label="Quizzes"
                value={String(stats.totalQuizzes)}
                color="text-violet-500"
              />
              <div className="w-px bg-border self-stretch" />
              <StatPill
                icon={TrendingUp}
                label="Avg score"
                value={`${stats.averageScore}%`}
                color="text-emerald-500"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
