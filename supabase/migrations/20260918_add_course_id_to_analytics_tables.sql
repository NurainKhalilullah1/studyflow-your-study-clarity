-- Migration: add optional course_id to quiz_sessions and study_events
-- Spec: 0001-analytics-dashboard
-- This enables subject-level analytics grouping by linking sessions to courses.
-- Both columns are nullable so existing records are unaffected.

ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS course_id uuid
    REFERENCES courses(id) ON DELETE SET NULL;

ALTER TABLE study_events
  ADD COLUMN IF NOT EXISTS course_id uuid
    REFERENCES courses(id) ON DELETE SET NULL;

-- Index for efficient per-course analytics queries
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_course_id
  ON quiz_sessions(course_id)
  WHERE course_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_events_course_id
  ON study_events(course_id)
  WHERE course_id IS NOT NULL;
