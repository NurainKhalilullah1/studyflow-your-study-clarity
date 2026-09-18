# Epic: AI

The AI-powered study tools: tutor chat, quiz generation, spaced-repetition flashcards, and document analysis. These are the core value of the product.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| C | AI Tutor | Existing | existing |
| D | Quiz system | Existing | existing |
| E | Flashcards + spaced repetition | Existing | existing |
| F | Documents (upload + parse) | Existing | existing |

---

## Existing features

### C. AI Tutor · existing
Conversational AI study assistant backed by Gemini via the `gemini-chat` Supabase edge function. Supports multi-turn chat, document context (PDF and text upload), image input, flashcard generation from conversations, and voice input and output (Web Speech API). Large documents are chunked client-side (up to 10 parallel 8 000-char chunks) for parallel analysis.
code in `src/pages/Tutor.tsx`, `src/components/tutor/`, `src/hooks/useGoogleAI.ts`, `src/hooks/useConversations.ts`, `supabase/functions/gemini-chat/`

### D. Quiz system · existing
AI-generated quizzes from course context (subject, topic, difficulty, question count). Multiple choice with instant scoring, detailed explanations, improvement tracking across attempts, shareable quiz sessions via public link, and full quiz history with analytics.
code in `src/pages/Quiz.tsx`, `src/pages/QuizHistory.tsx`, `src/pages/SharedQuiz.tsx`, `src/components/quiz/`, `src/hooks/useQuiz.ts`

### E. Flashcards + spaced repetition · existing
Flashcard creation (manual or AI-generated from tutor), SM-2 spaced repetition scheduling (ratings: Again/Hard/Good/Easy = 1/3/4/5), card maturity tracking (new / learning / review / mastered), and due-card review queue.
code in `src/pages/Flashcards.tsx`, `src/components/tutor/FlashcardGenerator.tsx`, `src/components/tutor/FlashcardViewer.tsx`, `src/hooks/useFlashcards.ts`, `src/utils/spacedRepetition.ts`

### F. Documents · existing
Document upload (PDF, text), client-side parsing and text extraction, storage quota tracking per user, document selection for AI tutor context, and document preview.
code in `src/pages/Documents.tsx`, `src/components/documents/`, `src/hooks/useFileUpload.ts`, `src/utils/documentParser.ts`
