import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isCardDue } from '@/utils/spacedRepetition';
import type { Flashcard } from '@/hooks/useFlashcards';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Timeframe = '7d' | '30d' | 'all';

export interface DailyTrend {
  date: string;      // ISO date string "YYYY-MM-DD"
  label: string;     // Short display label "Mon 15"
  minutes: number;
  quizzes: number;
}

export interface SubjectMastery {
  subject: string;       // Display label: course code or document name
  courseCode?: string;
  color?: string;
  avgScore: number;      // 0-100
  quizCount: number;
  studyMinutes: number;
}

export interface WeakTopic {
  subject: string;
  avgScore: number;
  quizCount: number;
  overdueCards: number;
  reason: string;        // Human readable reason for the flag
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionPath: string;
}

export interface AnalyticsStats {
  currentStreak: number;
  longestStreak: number;
  totalStudyMinutes: number;
  totalQuizzes: number;
  averageScore: number;   // 0-100
}

export interface AnalyticsExport {
  stats: AnalyticsStats;
  dailyTrends: DailyTrend[];
  subjectMastery: SubjectMastery[];
  weakTopics: WeakTopic[];
  exportedAt: string;
}

export interface UseAnalyticsReturn {
  stats: AnalyticsStats;
  dailyTrends: DailyTrend[];
  subjectMastery: SubjectMastery[];
  weakTopics: WeakTopic[];
  recommendations: Recommendation[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the local calendar date string "YYYY-MM-DD" for a given ISO timestamp.
 * Uses the device locale timezone so day boundaries match West Africa Time.
 */
function toLocalDateString(isoString: string): string {
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayLocal(): string {
  return toLocalDateString(new Date().toISOString());
}

function shortLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00'); // force local midnight
  return d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric' });
}

function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function timeframeStart(timeframe: Timeframe): string | null {
  if (timeframe === 'all') return null;
  const days = timeframe === '7d' ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── Streak calculation ───────────────────────────────────────────────────────

function computeStreaks(activeDates: Set<string>): { current: number; longest: number } {
  const sorted = Array.from(activeDates).sort();

  // Longest streak
  let longest = 0;
  let run = 0;
  let prev: string | null = null;

  for (const dateStr of sorted) {
    if (prev === null) {
      run = 1;
    } else {
      const prevD = new Date(prev + 'T00:00:00');
      const currD = new Date(dateStr + 'T00:00:00');
      const diff = Math.round((currD.getTime() - prevD.getTime()) / 86_400_000);
      if (diff === 1) {
        run++;
      } else {
        run = 1;
      }
    }
    if (run > longest) longest = run;
    prev = dateStr;
  }

  // Current streak: walk back from today in local timezone
  let current = 0;
  const check = new Date();
  check.setHours(0, 0, 0, 0);

  while (true) {
    const ds = toLocalDateString(check.toISOString());
    if (!activeDates.has(ds)) break;
    current++;
    check.setDate(check.getDate() - 1);
  }

  return { current, longest };
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useAnalytics(userId: string | undefined, timeframe: Timeframe): UseAnalyticsReturn {
  const empty: UseAnalyticsReturn = {
    stats: { currentStreak: 0, longestStreak: 0, totalStudyMinutes: 0, totalQuizzes: 0, averageScore: 0 },
    dailyTrends: [],
    subjectMastery: [],
    weakTopics: [],
    recommendations: [],
    isLoading: false,
    isError: false,
    refetch: () => {},
  };

  // ── Fetch: study_events (all time for streak; filtered for totals)
  const eventsQuery = useQuery({
    queryKey: ['analytics-study-events', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('study_events')
        .select('id, event_type, metadata, created_at, course_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  // ── Fetch: quiz_sessions (completed only)
  const quizQuery = useQuery({
    queryKey: ['analytics-quiz-sessions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('id, score, total_questions, document_name, completed_at, created_at, course_id')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  // ── Fetch: courses for tagging
  const coursesQuery = useQuery({
    queryKey: ['analytics-courses', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('courses')
        .select('id, code, title, color')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // ── Fetch: flashcards (for overdue count per deck)
  const flashcardsQuery = useQuery({
    queryKey: ['analytics-flashcards', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('flashcards')
        .select('id, deck_name, next_review_at, repetitions, ease_factor, interval_days, last_reviewed_at')
        .eq('user_id', userId);
      if (error) throw error;
      return data as Flashcard[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  const isLoading =
    eventsQuery.isLoading ||
    quizQuery.isLoading ||
    coursesQuery.isLoading ||
    flashcardsQuery.isLoading;

  const isError =
    eventsQuery.isError ||
    quizQuery.isError ||
    coursesQuery.isError ||
    flashcardsQuery.isError;

  const refetch = () => {
    eventsQuery.refetch();
    quizQuery.refetch();
    coursesQuery.refetch();
    flashcardsQuery.refetch();
  };

  // ── Derived analytics (memoised)
  const derived = useMemo(() => {
    const allEvents = eventsQuery.data ?? [];
    const allQuizzes = quizQuery.data ?? [];
    const courses = coursesQuery.data ?? [];
    const allFlashcards = flashcardsQuery.data ?? [];

    const courseMap = new Map(courses.map((c) => [c.id, c]));

    // Timeframe boundary
    const cutoff = timeframeStart(timeframe);

    const filteredEvents = cutoff
      ? allEvents.filter((e) => e.created_at >= cutoff)
      : allEvents;

    const filteredQuizzes = cutoff
      ? allQuizzes.filter((q) => q.created_at >= cutoff)
      : allQuizzes;

    // ── Streaks (always from all-time data, never filtered)
    const activeDates = new Set<string>();
    for (const e of allEvents) {
      activeDates.add(toLocalDateString(e.created_at));
    }
    for (const q of allQuizzes) {
      activeDates.add(toLocalDateString(q.created_at));
    }
    const streaks = computeStreaks(activeDates);

    // ── Focus minutes (Pomodoro events in timeframe)
    let totalStudyMinutes = 0;
    for (const e of filteredEvents) {
      if (e.event_type === 'pomodoro_completed') {
        const meta = e.metadata as Record<string, unknown> | null;
        totalStudyMinutes += Number(meta?.duration ?? 25);
      }
    }

    // ── Quiz totals
    const completedQuizzes = filteredQuizzes.filter(
      (q) => q.score != null && q.total_questions != null && q.total_questions > 0,
    );
    const totalQuizzes = completedQuizzes.length;
    const averageScore =
      totalQuizzes === 0
        ? 0
        : Math.round(
            safeDivide(
              completedQuizzes.reduce(
                (sum, q) => sum + safeDivide(q.score!, q.total_questions!) * 100,
                0,
              ),
              totalQuizzes,
            ),
          );

    // ── Daily trends (build a day-by-day map for the timeframe window)
    const trendMap = new Map<string, { minutes: number; quizzes: number }>();
    const windowDays = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : null;

    if (windowDays !== null) {
      for (let i = windowDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = toLocalDateString(d.toISOString());
        trendMap.set(ds, { minutes: 0, quizzes: 0 });
      }
    } else {
      // All time: derive date range from earliest record
      const all = [...filteredEvents.map((e) => e.created_at), ...filteredQuizzes.map((q) => q.created_at)];
      if (all.length > 0) {
        const earliest = all.reduce((a, b) => (a < b ? a : b));
        const start = new Date(earliest);
        start.setHours(0, 0, 0, 0);
        const now = new Date();
        for (const d = start; d <= now; d.setDate(d.getDate() + 1)) {
          const ds = toLocalDateString(d.toISOString());
          trendMap.set(ds, { minutes: 0, quizzes: 0 });
        }
      }
    }

    for (const e of filteredEvents) {
      if (e.event_type !== 'pomodoro_completed') continue;
      const ds = toLocalDateString(e.created_at);
      const meta = e.metadata as Record<string, unknown> | null;
      const mins = Number(meta?.duration ?? 25);
      const entry = trendMap.get(ds);
      if (entry) entry.minutes += mins;
    }

    for (const q of completedQuizzes) {
      const ds = toLocalDateString(q.created_at);
      const entry = trendMap.get(ds);
      if (entry) entry.quizzes += 1;
    }

    const dailyTrends: DailyTrend[] = Array.from(trendMap.entries()).map(([date, v]) => ({
      date,
      label: shortLabel(date),
      minutes: v.minutes,
      quizzes: v.quizzes,
    }));

    // ── Subject mastery
    // Accumulate per-subject quiz stats
    const subjectAccum = new Map<
      string,
      { subject: string; courseCode?: string; color?: string; totalScore: number; quizCount: number; studyMinutes: number }
    >();

    const courseKeyFor = (courseId: string | null, docName: string | null): string => {
      if (courseId) {
        const c = courseMap.get(courseId);
        if (c) return `course:${c.id}`;
      }
      return `doc:${docName || 'General'}`;
    };

    for (const q of completedQuizzes) {
      const key = courseKeyFor(q.course_id ?? null, q.document_name ?? null);
      let rec = subjectAccum.get(key);
      if (!rec) {
        let subject = q.document_name || 'General';
        let courseCode: string | undefined;
        let color: string | undefined;
        if (q.course_id) {
          const c = courseMap.get(q.course_id);
          if (c) {
            subject = c.title;
            courseCode = c.code;
            color = c.color ?? undefined;
          }
        }
        rec = { subject, courseCode, color, totalScore: 0, quizCount: 0, studyMinutes: 0 };
        subjectAccum.set(key, rec);
      }
      rec.totalScore += safeDivide(q.score!, q.total_questions!) * 100;
      rec.quizCount += 1;
    }

    // Add study minutes for each subject via course_id on study_events
    for (const e of filteredEvents) {
      if (e.event_type !== 'pomodoro_completed') continue;
      if (!e.course_id) continue;
      const key = courseKeyFor(e.course_id ?? null, null);
      const rec = subjectAccum.get(key);
      if (rec) {
        const meta = e.metadata as Record<string, unknown> | null;
        rec.studyMinutes += Number(meta?.duration ?? 25);
      }
    }

    const subjectMastery: SubjectMastery[] = Array.from(subjectAccum.values()).map((r) => ({
      subject: r.subject,
      courseCode: r.courseCode,
      color: r.color,
      avgScore: Math.round(safeDivide(r.totalScore, r.quizCount)),
      quizCount: r.quizCount,
      studyMinutes: r.studyMinutes,
    }));

    // ── Overdue flashcards per deck (for weak topic detection)
    const overdueDeckMap = new Map<string, number>();
    for (const fc of allFlashcards) {
      if (!isCardDue(fc)) continue;
      const deck = fc.deck_name || 'General';
      overdueDeckMap.set(deck, (overdueDeckMap.get(deck) ?? 0) + 1);
    }

    // ── Weak topics
    const weakTopics: WeakTopic[] = [];

    for (const sm of subjectMastery) {
      const reasons: string[] = [];
      if (sm.quizCount >= 2 && sm.avgScore < 60) {
        reasons.push(`Average score ${sm.avgScore}% across ${sm.quizCount} quizzes`);
      }
      // Match overdue cards by fuzzy deck name match
      let overdue = 0;
      for (const [deck, count] of overdueDeckMap.entries()) {
        const deckLower = deck.toLowerCase();
        const subjectLower = sm.subject.toLowerCase();
        if (
          deckLower.includes(subjectLower) ||
          subjectLower.includes(deckLower) ||
          (sm.courseCode && deckLower.includes(sm.courseCode.toLowerCase()))
        ) {
          overdue += count;
        }
      }
      if (overdue > 5) {
        reasons.push(`${overdue} overdue flashcards`);
      }
      if (reasons.length > 0) {
        weakTopics.push({
          subject: sm.subject,
          avgScore: sm.avgScore,
          quizCount: sm.quizCount,
          overdueCards: overdue,
          reason: reasons.join(' · '),
        });
      }
    }

    // Also flag decks with overdue cards that have no quiz sessions
    for (const [deck, count] of overdueDeckMap.entries()) {
      if (count <= 5) continue;
      const alreadyFlagged = weakTopics.some(
        (wt) =>
          wt.subject.toLowerCase().includes(deck.toLowerCase()) ||
          deck.toLowerCase().includes(wt.subject.toLowerCase()),
      );
      if (!alreadyFlagged) {
        weakTopics.push({
          subject: deck,
          avgScore: 0,
          quizCount: 0,
          overdueCards: count,
          reason: `${count} overdue flashcards pending review`,
        });
      }
    }

    // Sort by severity (lowest score first, then most overdue)
    weakTopics.sort((a, b) => {
      if (a.quizCount >= 2 && b.quizCount >= 2) return a.avgScore - b.avgScore;
      return b.overdueCards - a.overdueCards;
    });

    // ── Recommendations (from weakest subjects)
    const recommendations: Recommendation[] = weakTopics.slice(0, 3).map((wt) => {
      const hasQuizzes = wt.quizCount > 0;
      const hasOverdue = wt.overdueCards > 0;
      const path = hasOverdue
        ? `/flashcards?deck=${encodeURIComponent(wt.subject)}`
        : `/quiz?subject=${encodeURIComponent(wt.subject)}`;
      const actionLabel = hasOverdue ? 'Review Flashcards' : 'Practice Quiz';
      return {
        id: wt.subject,
        title: `Strengthen: ${wt.subject}`,
        description: wt.reason,
        actionLabel,
        actionPath: path,
      };
    });

    // If no weak topics, add a positive nudge to start studying
    if (recommendations.length === 0 && totalQuizzes === 0 && totalStudyMinutes === 0) {
      recommendations.push({
        id: 'get-started',
        title: 'Start your first session',
        description: 'Complete a Pomodoro timer or a quiz to see personalised recommendations.',
        actionLabel: 'Start Focus Session',
        actionPath: '/dashboard',
      });
    }

    return {
      stats: {
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        totalStudyMinutes,
        totalQuizzes,
        averageScore,
      },
      dailyTrends,
      subjectMastery,
      weakTopics,
      recommendations,
    };
  }, [eventsQuery.data, quizQuery.data, coursesQuery.data, flashcardsQuery.data, timeframe]);

  if (isLoading) {
    return { ...empty, isLoading: true, refetch };
  }

  if (isError) {
    return { ...empty, isError: true, refetch };
  }

  return {
    ...derived,
    isLoading,
    isError,
    refetch,
  };
}

// ─── Export utility ───────────────────────────────────────────────────────────

export function exportStudyData(format: 'json' | 'csv', data: AnalyticsExport): void {
  let content: string;
  let mimeType: string;
  let filename: string;

  if (format === 'json') {
    content = JSON.stringify(data, null, 2);
    mimeType = 'application/json';
    filename = `study-analytics-${data.exportedAt.slice(0, 10)}.json`;
  } else {
    // CSV: daily trends
    const rows = [
      ['Date', 'Label', 'Study Minutes', 'Quizzes'],
      ...data.dailyTrends.map((d) => [d.date, d.label, String(d.minutes), String(d.quizzes)]),
    ];
    content = rows.map((r) => r.join(',')).join('\n');
    mimeType = 'text/csv';
    filename = `study-analytics-${data.exportedAt.slice(0, 10)}.csv`;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
