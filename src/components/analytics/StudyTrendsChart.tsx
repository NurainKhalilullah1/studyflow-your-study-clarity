import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { DailyTrend, Timeframe } from '@/hooks/useAnalytics';

interface Props {
  trends: DailyTrend[];
  timeframe: Timeframe;
  onTimeframeChange: (t: Timeframe) => void;
  isLoading: boolean;
}

const TIMEFRAME_OPTIONS: { label: string; value: Timeframe }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: 'All time', value: 'all' },
];

interface TooltipPayloadEntry {
  name: string;
  value: number | string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

// Custom tooltip for the composed chart
const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/95 backdrop-blur-sm px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export const StudyTrendsChart = ({ trends, timeframe, onTimeframeChange, isLoading }: Props) => {
  // For all-time with many data points, aggregate by week to keep the chart readable
  const displayData =
    trends.length > 30
      ? aggregateByWeek(trends)
      : trends;

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2 flex-wrap">
        <CardTitle className="text-base font-semibold">Study Trends</CardTitle>
        <div className="flex gap-1 flex-wrap" role="group" aria-label="Timeframe selection">
          {TIMEFRAME_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              id={`analytics-timeframe-${opt.value}`}
              size="sm"
              variant={timeframe === opt.value ? 'default' : 'outline'}
              className="h-7 text-xs px-3"
              onClick={() => onTimeframeChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full h-52 rounded-xl" />
        ) : trends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-muted-foreground text-sm gap-2">
            <span className="text-3xl">📊</span>
            <p>No study activity yet in this period.</p>
            <p className="text-xs">Complete a focus session or quiz to see trends.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={displayData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="minutes"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}m`}
              />
              <YAxis
                yAxisId="quizzes"
                orientation="right"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value) =>
                  value === 'minutes' ? 'Focus (min)' : 'Quizzes'
                }
              />
              <Bar
                yAxisId="minutes"
                dataKey="minutes"
                name="minutes"
                fill="hsl(var(--primary)/0.7)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Line
                yAxisId="quizzes"
                dataKey="quizzes"
                name="quizzes"
                type="monotone"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

// Collapse daily points into weekly buckets when data is long
function aggregateByWeek(trends: DailyTrend[]): DailyTrend[] {
  const weeks: Map<string, DailyTrend> = new Map();
  for (const d of trends) {
    const date = new Date(d.date + 'T00:00:00');
    date.setDate(date.getDate() - date.getDay()); // floor to Sunday
    const weekKey = date.toISOString().slice(0, 10);
    const existing = weeks.get(weekKey);
    if (existing) {
      existing.minutes += d.minutes;
      existing.quizzes += d.quizzes;
    } else {
      weeks.set(weekKey, {
        date: weekKey,
        label: `Wk ${date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}`,
        minutes: d.minutes,
        quizzes: d.quizzes,
      });
    }
  }
  return Array.from(weeks.values());
}
