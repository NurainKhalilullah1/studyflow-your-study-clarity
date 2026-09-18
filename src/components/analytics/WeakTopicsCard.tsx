import { AlertTriangle, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { WeakTopic } from '@/hooks/useAnalytics';

interface Props {
  weakTopics: WeakTopic[];
  isLoading: boolean;
}

export const WeakTopicsCard = ({ weakTopics, isLoading }: Props) => {
  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <CardTitle className="text-base font-semibold">Weak Topics</CardTitle>
        {weakTopics.length > 0 && (
          <Badge variant="destructive" className="ml-auto h-5 text-[10px] px-1.5">
            {weakTopics.length}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : weakTopics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-sm gap-2">
            <span className="text-3xl">🌟</span>
            <p className="font-medium text-foreground">All looking good!</p>
            <p className="text-xs text-center">No weak topics detected. Keep up the consistent study sessions.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {weakTopics.map((topic) => (
              <div
                key={topic.subject}
                className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20"
              >
                <BookOpen className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{topic.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{topic.reason}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {topic.quizCount > 0 && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-rose-500 border-rose-500/30">
                        {topic.avgScore}% avg
                      </Badge>
                    )}
                    {topic.overdueCards > 0 && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-600 border-amber-500/30">
                        {topic.overdueCards} due cards
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
