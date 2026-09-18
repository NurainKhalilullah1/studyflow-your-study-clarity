import { Brain, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { SubjectMastery } from '@/hooks/useAnalytics';

interface Props {
  subjects: SubjectMastery[];
  isLoading: boolean;
}

const scoreColor = (score: number): string => {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-rose-500';
};

const progressColor = (score: number): string => {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
};

const SubjectRow = ({ subject }: { subject: SubjectMastery }) => (
  <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
    {/* Color swatch or fallback dot */}
    <div
      className="w-3 h-3 rounded-full mt-1 shrink-0"
      style={{ backgroundColor: subject.color ?? 'hsl(var(--primary))' }}
    />

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="text-sm font-medium text-foreground truncate">{subject.subject}</span>
        {subject.courseCode && (
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">
            {subject.courseCode}
          </Badge>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${progressColor(subject.avgScore)}`}
          style={{ width: `${subject.avgScore}%` }}
        />
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className={`font-semibold ${scoreColor(subject.avgScore)}`}>
          {subject.avgScore}%
        </span>
        <span className="flex items-center gap-0.5">
          <CheckCircle2 className="w-3 h-3" />
          {subject.quizCount} quiz{subject.quizCount !== 1 ? 'zes' : ''}
        </span>
        {subject.studyMinutes > 0 && (
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {subject.studyMinutes}m focus
          </span>
        )}
      </div>
    </div>
  </div>
);

export const SubjectMasteryCard = ({ subjects, isLoading }: Props) => {
  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        <CardTitle className="text-base font-semibold">Subject Mastery</CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-center py-2">
                <Skeleton className="w-3 h-3 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm gap-2">
            <span className="text-3xl">📚</span>
            <p>No quizzes completed yet.</p>
            <p className="text-xs">Take a quiz to track your subject mastery.</p>
          </div>
        ) : (
          <div>
            {subjects
              .slice()
              .sort((a, b) => b.quizCount - a.quizCount)
              .map((s) => (
                <SubjectRow key={s.subject} subject={s} />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
