import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGoogleAI } from "./useGoogleAI";

export interface QuizQuestion {
  id?: string;
  quiz_session_id?: string;
  question_number: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string | null;
  user_answer?: string | null;
  is_flagged: boolean;
}

export interface QuizSession {
  id: string;
  user_id: string;
  document_name: string | null;
  document_content: string | null;
  num_questions: number;
  time_limit_minutes: number;
  score: number | null;
  total_questions: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  is_shared?: boolean;
}

// Fetch a quiz session by ID
export const useQuizSession = (sessionId: string | null) => {
  return useQuery({
    queryKey: ["quiz-session", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const { data, error } = await supabase.from("quiz_sessions").select("*").eq("id", sessionId).single();
      if (error) throw error;
      return data as QuizSession;
    },
    enabled: !!sessionId,
  });
};

// Fetch questions for a quiz session
export const useQuizQuestions = (sessionId: string | null) => {
  return useQuery({
    queryKey: ["quiz-questions", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_session_id", sessionId)
        .order("question_number", { ascending: true });
      if (error) throw error;
      return data.map((q) => ({
        ...q,
        options: q.options as string[],
      })) as QuizQuestion[];
    },
    enabled: !!sessionId,
  });
};

// Create a new quiz session
export const useCreateQuizSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      documentName,
      documentContent,
      numQuestions,
      timeLimitMinutes,
    }: {
      userId: string;
      documentName?: string;
      documentContent?: string;
      numQuestions: number;
      timeLimitMinutes: number;
    }) => {
      const { data, error } = await supabase
        .from("quiz_sessions")
        .insert({
          user_id: userId,
          document_name: documentName || null,
          document_content: documentContent || null,
          num_questions: numQuestions,
          time_limit_minutes: timeLimitMinutes,
        })
        .select()
        .single();
      if (error) throw error;
      return data as QuizSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-sessions"] });
    },
  });
};

// ── Quiz generation constants ─────────────────────────────────────────────────
// Maximum questions per parallel agent. Keeping this at 25 ensures each agent
// stays well within token output limits even for complex question types.
const QUIZ_BATCH_SIZE = 25;

// Documents shorter than this are sent in full to every batch agent.
// Longer documents are chunked proportionally — one chunk per agent.
const QUIZ_CHUNK_THRESHOLD = 15_000; // chars

/** Parse a raw AI response string into an array of question objects. */
function parseQuizJSON(raw: string): any[] {
  let jsonStr = raw.trim();
  // Strip optional markdown code fences
  if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
  if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  // Sometimes the model wraps the array in an object
  if (jsonStr.startsWith("{")) {
    const obj = JSON.parse(jsonStr);
    const arr = obj.questions ?? obj.quiz ?? Object.values(obj)[0];
    if (Array.isArray(arr)) return arr;
  }
  return JSON.parse(jsonStr);
}

/** Build the AI prompt for a single quiz batch. */
function buildBatchPrompt(
  batchCount: number,
  batchIndex: number,
  totalBatches: number,
  docChunk: string,
  formatInstructions: string
): string {
  return `You are an expert quiz generator. Generate exactly ${batchCount} questions.

DOCUMENT SECTION ${batchIndex + 1} OF ${totalBatches}:
${docChunk}

QUESTION FORMAT RULES:
${formatInstructions}

IMPORTANT:
- Draw ALL questions from the document section above.
- Every question MUST include an "explanation" field (1-2 sentences).
- Return ONLY a valid JSON array — no markdown, no code blocks, no extra text.

JSON format:
[
  {
    "question": "What is the capital of France?",
    "options": ["A) London", "B) Paris", "C) Berlin", "D) Madrid"],
    "correct": "B) Paris",
    "explanation": "Paris is the capital and largest city of France."
  }
]

Generate exactly ${batchCount} questions. Return ONLY the JSON array.`;
}

// Generate quiz questions using AI (parallel batch mode)
export const useGenerateQuizQuestions = () => {
  const { generateContent } = useGoogleAI();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      sessionId,
      documentContent,
      numQuestions,
      questionType = "mixed",
    }: {
      sessionId: string;
      documentContent: string;
      numQuestions: number;
      questionType?: string;
    }) => {
      // Cap at 75 questions as per UI slider
      const questionsToGenerate = Math.min(numQuestions, 75);

      // ── Question format instructions ─────────────────────────────────────────
      const typeInstructions: Record<string, string> = {
        mixed: `Generate a mix of the following 4 question types (roughly equal amounts of each):
1. Multiple Choice (MCQ):
   - Exactly 4 options.
   - Format: "options": ["A) ...", "B) ...", "C) ...", "D) ..."]
2. True/False:
   - Format: "options": ["True", "False"]
   - The correct answer must be exactly "True" or "False".
3. Fill-in-the-Blank:
   - Question must contain "_________" (underscores) for the blank.
   - Format: "options": ["FILL_IN_THE_BLANK"]
   - The correct answer is the word/phrase that fills the blank.
4. Short Answer:
   - A direct question requiring a brief answer.
   - Format: "options": ["SHORT_ANSWER"]
   - The correct answer is a concise, accurate sentence or phrase.`,

        mcq: `Generate ONLY Multiple Choice questions:
- Exactly 4 options per question.
- Format: "options": ["A) ...", "B) ...", "C) ...", "D) ..."]
- Correct answer must be the full option string, e.g. "A) Paris".`,

        truefalse: `Generate ONLY True/False questions:
- Format: "options": ["True", "False"]
- The correct answer must be exactly "True" or "False".`,

        fill: `Generate ONLY Fill-in-the-Blank questions:
- Each question must contain "_________" (underscores) for the blank.
- Format: "options": ["FILL_IN_THE_BLANK"]
- The correct answer is the word/phrase that completes the blank.`,

        short: `Generate ONLY Short Answer questions:
- A direct question requiring a brief written answer.
- Format: "options": ["SHORT_ANSWER"]
- The correct answer is a concise, accurate sentence or phrase.`,
      };

      const formatInstructions = typeInstructions[questionType] ?? typeInstructions["mixed"];

      // ── Decide: single call or parallel batches? ───────────────────────────
      const numBatches = Math.ceil(questionsToGenerate / QUIZ_BATCH_SIZE);
      const useParallel = numBatches > 1;

      console.log(
        `Quiz generation: ${questionsToGenerate} questions in ${numBatches} batch(es) — ` +
          (useParallel ? "parallel mode" : "single-call mode")
      );

      let allQuestions: any[] = [];

      if (!useParallel) {
        // ── Single-call path (≤25 questions) ────────────────────────────────
        const docChunk =
          documentContent.length > QUIZ_CHUNK_THRESHOLD
            ? documentContent.slice(0, QUIZ_CHUNK_THRESHOLD)
            : documentContent;

        const prompt = buildBatchPrompt(questionsToGenerate, 0, 1, docChunk, formatInstructions);
        const responseText = await generateContent(prompt);
        allQuestions = parseQuizJSON(responseText);
      } else {
        // ── Parallel batch path (>25 questions) ──────────────────────────────
        // Distribute questions per batch (last batch may be smaller)
        const batchCounts = Array.from({ length: numBatches }, (_, i) => {
          const assigned = i < numBatches - 1
            ? QUIZ_BATCH_SIZE
            : questionsToGenerate - QUIZ_BATCH_SIZE * (numBatches - 1);
          return Math.max(assigned, 1);
        });

        // Split the document into chunks — one per batch
        // For short docs every batch sees the full content; for large docs each
        // batch gets its own slice so coverage is guaranteed.
        const docChunks: string[] = (() => {
          const doc = documentContent;
          if (doc.length <= QUIZ_CHUNK_THRESHOLD) {
            // Short doc: all batches see the full text
            return Array(numBatches).fill(doc);
          }
          // Large doc: split proportionally with 300-char overlap
          const chunkSize = Math.ceil(doc.length / numBatches);
          const overlap = 300;
          return Array.from({ length: numBatches }, (_, i) =>
            doc.slice(
              Math.max(0, i * chunkSize - overlap),
              Math.min(doc.length, (i + 1) * chunkSize + overlap)
            )
          );
        })();

        // Build one batch payload per agent
        const batches = batchCounts.map((count, i) => ({
          contents: [
            {
              role: "user" as const,
              parts: [
                {
                  text: buildBatchPrompt(
                    count,
                    i,
                    numBatches,
                    docChunks[i],
                    formatInstructions
                  ),
                },
              ],
            },
          ],
        }));

        toast({
          title: `Generating quiz in parallel…`,
          description: `${numBatches} AI agents are working simultaneously on your ${questionsToGenerate}-question quiz.`,
        });

        // Fire all batches simultaneously via the server-side batches endpoint
        // (runs up to 5 concurrent AI calls inside the edge function)
        const { data, error } = await supabase.functions.invoke("gemini-chat", {
          body: { batches },
        });

        if (error) throw new Error(error.message || "Parallel quiz generation failed");
        if (!data?.results) throw new Error("No results from parallel agents");

        // Parse and merge successful batch results
        const results = data.results as Array<{ text: string | null; error: string | null }>;
        for (const [idx, result] of results.entries()) {
          if (!result.text) {
            console.warn(`Batch ${idx + 1} failed: ${result.error}`);
            continue;
          }
          try {
            const parsed = parseQuizJSON(result.text);
            console.log(`Batch ${idx + 1}: parsed ${parsed.length} questions`);
            allQuestions.push(...parsed);
          } catch (e) {
            console.warn(`Batch ${idx + 1}: JSON parse failed`, e);
          }
        }

        // Shuffle merged questions so questions from different chunks are mixed
        for (let i = allQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
        }
      }

      if (!Array.isArray(allQuestions) || allQuestions.length === 0) {
        throw new Error("No questions were generated. Please try with different content.");
      }

      if (allQuestions.length < questionsToGenerate) {
        console.warn(`Requested ${questionsToGenerate} questions but got ${allQuestions.length}`);
      }
      console.log(`Total questions generated: ${allQuestions.length} (requested: ${questionsToGenerate})`);

      // ── Persist to database ───────────────────────────────────────────────
      const questionsToInsert = allQuestions.slice(0, questionsToGenerate).map((q: any, idx: number) => ({
        quiz_session_id: sessionId,
        question_number: idx + 1,
        question: q.question,
        options: q.options,
        correct_answer: q.correct,
        explanation: q.explanation || null,
        is_flagged: false,
      }));

      const { error: dbError } = await supabase.from("quiz_questions").insert(questionsToInsert);
      if (dbError) {
        console.error("Database insert error:", dbError);
        throw new Error("Failed to save questions to database.");
      }

      // Update session with total questions and start time
      await supabase
        .from("quiz_sessions")
        .update({
          total_questions: questionsToInsert.length,
          started_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      return questionsToInsert.length;
    },
    onError: (error: Error) => {
      console.error("Quiz generation error:", error);
    },
  });
};

// Save an answer to a question
export const useSaveQuizAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      questionId,
      answer,
      isFlagged,
    }: {
      questionId: string;
      answer?: string;
      isFlagged?: boolean;
    }) => {
      const updateData: Record<string, any> = {};
      if (answer !== undefined) updateData.user_answer = answer;
      if (isFlagged !== undefined) updateData.is_flagged = isFlagged;

      const { error } = await supabase.from("quiz_questions").update(updateData).eq("id", questionId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
    },
  });
};

// Submit quiz and calculate score
export const useSubmitQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      // Get all questions for this session
      const { data: questions, error: fetchError } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_session_id", sessionId);

      if (fetchError) throw fetchError;

      // Calculate score
      let correct = 0;
      questions?.forEach((q) => {
        const isMatch = q.user_answer?.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase();
        if (isMatch) {
          correct++;
        }
      });

      // Update session with score and completion time
      const { error: updateError } = await supabase
        .from("quiz_sessions")
        .update({
          score: correct,
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (updateError) throw updateError;

      return {
        score: correct,
        total: questions?.length || 0,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-session"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
      queryClient.invalidateQueries({ queryKey: ["goal-progress"] });
      queryClient.invalidateQueries({ queryKey: ["gamification-quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["gamification-questions"] });
    },
  });
};

// Fetch quiz history for a user
export const useQuizHistory = (userId: string | null) => {
  return useQuery({
    queryKey: ["quiz-history", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as QuizSession[];
    },
    enabled: !!userId,
  });
};

// Delete a quiz session and its questions
export const useDeleteQuizSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      // Delete questions first
      const { error: questionsError } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("quiz_session_id", sessionId);

      if (questionsError) throw questionsError;

      // Then delete the session
      const { error: sessionError } = await supabase
        .from("quiz_sessions")
        .delete()
        .eq("id", sessionId);

      if (sessionError) throw sessionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-history"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-sessions"] });
    },
  });
};

// Hook to manage quiz timer
export const useQuizTimer = (timeLimitMinutes: number, isActive: boolean, onTimeUp: () => void) => {
  const [timeRemaining, setTimeRemaining] = useState(timeLimitMinutes * 60);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onTimeUp]);

  return {
    timeRemaining,
    minutes: Math.floor(timeRemaining / 60),
    seconds: timeRemaining % 60,
    formattedTime: `${Math.floor(timeRemaining / 60)
      .toString()
      .padStart(2, "0")}:${(timeRemaining % 60).toString().padStart(2, "0")}`,
  };
};
