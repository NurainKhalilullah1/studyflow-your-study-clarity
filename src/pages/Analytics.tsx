import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Clock, Brain, TrendingUp, Download, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics, exportStudyData, type Timeframe, type AnalyticsExport } from '@/hooks/useAnalytics';
import { StudyTrendsChart } from '@/components/analytics/StudyTrendsChart';
import { SubjectMasteryCard } from '@/components/analytics/SubjectMasteryCard';
import { WeakTopicsCard } from '@/components/analytics/WeakTopicsCard';
import { StudyRecommendationsCard } from '@/components/analytics/StudyRecommendationsCard';

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  bgColor: string;
  isLoading: boolean;
}

const StatCard = ({ icon: Icon, label, value, sub, color, bgColor, isLoading }: StatCardProps) => (
  <Card className="border border-border/50 shadow-sm">
    <CardContent className="pt-5 pb-4">
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="h-7 w-16 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center mb-1`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      )}
    </CardContent>
  </Card>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const Analytics = () => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');

  const { stats, dailyTrends, subjectMastery, weakTopics, recommendations, isLoading, refetch } =
    useAnalytics(user?.id, timeframe);

  const handleExport = (format: 'json' | 'csv') => {
    const exportData: AnalyticsExport = {
      stats,
      dailyTrends,
      subjectMastery,
      weakTopics,
      exportedAt: new Date().toISOString(),
    };
    exportStudyData(format, exportData);
  };

  const focusHours = (stats.totalStudyMinutes / 60).toFixed(1);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 pb-24 md:pb-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Your study habits, mastery, and progress at a glance.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              id="analytics-refresh-btn"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={refetch}
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
            <Button
              id="analytics-export-csv-btn"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => handleExport('csv')}
            >
              <Download className="w-3 h-3" />
              Export CSV
            </Button>
            <Button
              id="analytics-export-json-btn"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => handleExport('json')}
            >
              <Download className="w-3 h-3" />
              Export JSON
            </Button>
          </div>
        </motion.div>

        {/* Summary stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <StatCard
            icon={Flame}
            label="Current streak"
            value={`${stats.currentStreak}d`}
            sub={`Longest: ${stats.longestStreak}d`}
            color="text-orange-500"
            bgColor="bg-orange-500/10"
            isLoading={isLoading}
          />
          <StatCard
            icon={Clock}
            label="Focus hours"
            value={focusHours}
            sub={`${stats.totalStudyMinutes} minutes total`}
            color="text-blue-500"
            bgColor="bg-blue-500/10"
            isLoading={isLoading}
          />
          <StatCard
            icon={Brain}
            label="Quizzes taken"
            value={String(stats.totalQuizzes)}
            color="text-violet-500"
            bgColor="bg-violet-500/10"
            isLoading={isLoading}
          />
          <StatCard
            icon={TrendingUp}
            label="Average score"
            value={`${stats.averageScore}%`}
            color="text-emerald-500"
            bgColor="bg-emerald-500/10"
            isLoading={isLoading}
          />
        </motion.div>

        {/* Study trends chart (with timeframe toggle) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StudyTrendsChart
            trends={dailyTrends}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            isLoading={isLoading}
          />
        </motion.div>

        {/* Lower grid: mastery + weak + recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            className="lg:col-span-1"
          >
            <SubjectMasteryCard subjects={subjectMastery} isLoading={isLoading} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="lg:col-span-1"
          >
            <WeakTopicsCard weakTopics={weakTopics} isLoading={isLoading} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className="lg:col-span-1"
          >
            <StudyRecommendationsCard recommendations={recommendations} isLoading={isLoading} />
          </motion.div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Analytics;
