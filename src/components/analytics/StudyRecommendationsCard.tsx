import { useNavigate } from 'react-router-dom';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Recommendation } from '@/hooks/useAnalytics';

interface Props {
  recommendations: Recommendation[];
  isLoading: boolean;
}

export const StudyRecommendationsCard = ({ recommendations, isLoading }: Props) => {
  const navigate = useNavigate();

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Lightbulb className="w-4 h-4 text-violet-500" />
        <CardTitle className="text-base font-semibold">Study Recommendations</CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-sm gap-2">
            <span className="text-3xl">🎯</span>
            <p className="text-xs text-center">Complete more quizzes and flashcard reviews to get personalised recommendations.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div
                key={rec.id}
                className="group flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-gradient-to-r from-violet-500/5 to-transparent hover:from-violet-500/10 transition-colors"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rec.description}</p>
                </div>
                <Button
                  id={`recommendation-action-${rec.id.replace(/\s+/g, '-').toLowerCase()}`}
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-primary gap-1 shrink-0 group-hover:bg-primary/10"
                  onClick={() => navigate(rec.actionPath)}
                >
                  {rec.actionLabel}
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
