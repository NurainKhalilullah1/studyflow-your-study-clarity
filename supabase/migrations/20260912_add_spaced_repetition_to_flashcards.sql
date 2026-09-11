-- Add Spaced Repetition (SM-2) tracking columns to flashcards table
ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS ease_factor REAL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repetitions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create index for high-performance due-cards queries
CREATE INDEX IF NOT EXISTS idx_flashcards_user_due 
  ON public.flashcards(user_id, next_review_at);
