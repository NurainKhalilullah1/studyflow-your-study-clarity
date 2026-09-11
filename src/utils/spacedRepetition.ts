/**
 * SuperMemo-2 (SM-2) Spaced Repetition Algorithm
 * 
 * Used by Anki and Quizlet to calculate the optimal review schedule
 * based on human memory decay (Ebbinghaus Forgetting Curve).
 */

export type SM2Rating = 1 | 3 | 4 | 5;

export interface SM2CardData {
  ease_factor?: number | null;
  interval_days?: number | null;
  repetitions?: number | null;
  next_review_at?: string | null;
  last_reviewed_at?: string | null;
}

export interface SM2CalculationResult {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  last_reviewed_at: string;
}

export const RATING_CONFIG: Record<SM2Rating, { label: string; intervalDesc: string; color: string; bg: string }> = {
  1: { label: "Again", intervalDesc: "< 10 min", color: "text-red-500", bg: "bg-red-500/10 hover:bg-red-500/20 border-red-500/30" },
  3: { label: "Hard", intervalDesc: "1 day", color: "text-amber-500", bg: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30" },
  4: { label: "Good", intervalDesc: "3 days", color: "text-green-500", bg: "bg-green-500/10 hover:bg-green-500/20 border-green-500/30" },
  5: { label: "Easy", intervalDesc: "7+ days", color: "text-blue-500", bg: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30" },
};

/**
 * Calculates the next interval, repetitions, and ease factor using SM-2
 * 
 * @param card Current card stats
 * @param rating User grade: 1 (Again), 3 (Hard), 4 (Good), 5 (Easy)
 */
export function calculateSM2(
  card: SM2CardData,
  rating: SM2Rating
): SM2CalculationResult {
  const currentEase = card.ease_factor ?? 2.5;
  const currentRepetitions = card.repetitions ?? 0;
  const currentInterval = card.interval_days ?? 0;

  let newRepetitions = currentRepetitions;
  let newInterval = currentInterval;

  // 1. Calculate new Ease Factor (EF)
  // EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  let newEase = currentEase + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  // Ease factor never drops below 1.3 to prevent cards from getting permanently stuck
  if (newEase < 1.3) newEase = 1.3;
  // Cap at 3.0 for reasonable spacing
  if (newEase > 3.0) newEase = 3.0;

  // 2. Calculate interval and repetitions based on recall quality
  if (rating === 1) {
    // Again: reset repetitions count, card will be re-reviewed soon
    newRepetitions = 0;
    newInterval = 0; // due immediately / today
  } else if (rating === 3) {
    // Hard: advance interval slightly, but don't accelerate repetitions heavily
    newRepetitions = Math.max(1, currentRepetitions);
    newInterval = 1; // 1 day
  } else {
    // Good (4) or Easy (5)
    newRepetitions = currentRepetitions + 1;

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = rating === 5 ? 6 : 3;
    } else {
      const bonus = rating === 5 ? 1.3 : 1.0;
      newInterval = Math.round(currentInterval * newEase * bonus);
    }
  }

  // Calculate next review timestamp
  const now = new Date();
  const nextDate = new Date(now);
  if (newInterval === 0) {
    // Due in 10 minutes
    nextDate.setMinutes(nextDate.getMinutes() + 10);
  } else {
    nextDate.setDate(nextDate.getDate() + newInterval);
    // Set to start of day for consistent daily due checks
    nextDate.setHours(4, 0, 0, 0); // 4:00 AM
  }

  return {
    ease_factor: Number(newEase.toFixed(2)),
    interval_days: newInterval,
    repetitions: newRepetitions,
    next_review_at: nextDate.toISOString(),
    last_reviewed_at: now.toISOString(),
  };
}

/**
 * Checks whether a card is currently due for review
 */
export function isCardDue(card: SM2CardData): boolean {
  if (!card.next_review_at) return true; // Unreviewed cards are due
  return new Date(card.next_review_at).getTime() <= Date.now();
}

/**
 * Returns learning maturity status of card
 */
export function getCardMaturity(card: SM2CardData): "new" | "learning" | "review" | "mastered" {
  const reps = card.repetitions ?? 0;
  const interval = card.interval_days ?? 0;

  if (reps === 0 && !card.last_reviewed_at) return "new";
  if (reps < 2 || interval <= 1) return "learning";
  if (interval >= 21) return "mastered";
  return "review";
}
