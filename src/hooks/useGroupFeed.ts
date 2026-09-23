import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GroupFeedPost {
  id: string;
  group_id: string;
  author_id: string | null;
  post_type: "document" | "quiz_result" | "note";
  reference_id: string | null;
  caption: string | null;
  created_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  referenceData?: {
    title: string;
    subtitle?: string;
    score?: number;
    totalQuestions?: number;
  } | null;
}

export function useGroupFeedPosts(groupId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Realtime subscription for group feed
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group-feed:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_feed_posts",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["group-feed-posts", groupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  return useQuery({
    queryKey: ["group-feed-posts", groupId],
    queryFn: async (): Promise<GroupFeedPost[]> => {
      if (!groupId) return [];

      const { data: posts, error } = await supabase
        .from("group_feed_posts")
        .select("id, group_id, author_id, post_type, reference_id, caption, created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      // Collect author IDs and reference IDs
      const authorIds = Array.from(new Set(posts.map((p) => p.author_id).filter(Boolean))) as string[];
      const documentIds = posts
        .filter((p) => p.post_type === "document" && p.reference_id)
        .map((p) => p.reference_id) as string[];
      const quizIds = posts
        .filter((p) => p.post_type === "quiz_result" && p.reference_id)
        .map((p) => p.reference_id) as string[];

      // Fetch authors
      const authorsMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};
      if (authorIds.length > 0) {
        const { data: authors } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", authorIds);

        if (authors) {
          authors.forEach((a) => {
            authorsMap[a.id] = a;
          });
        }
      }

      // Fetch documents
      const docsMap: Record<string, { id: string; file_name: string; file_size: number | null }> = {};
      if (documentIds.length > 0) {
        const { data: docs } = await supabase
          .from("user_files")
          .select("id, file_name, file_size")
          .in("id", documentIds);

        if (docs) {
          docs.forEach((d) => {
            docsMap[d.id] = d;
          });
        }
      }

      // Fetch quizzes
      const quizzesMap: Record<string, { id: string; document_name: string | null; score: number | null; total_questions: number | null }> = {};
      if (quizIds.length > 0) {
        const { data: quizzes } = await supabase
          .from("quiz_sessions")
          .select("id, document_name, score, total_questions")
          .in("id", quizIds);

        if (quizzes) {
          quizzes.forEach((q) => {
            quizzesMap[q.id] = q;
          });
        }
      }

      return posts.map((p) => {
        let referenceData: GroupFeedPost["referenceData"] = null;

        if (p.post_type === "document" && p.reference_id && docsMap[p.reference_id]) {
          const doc = docsMap[p.reference_id];
          referenceData = {
            title: doc.file_name,
            subtitle: doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : "Document",
          };
        } else if (p.post_type === "quiz_result" && p.reference_id && quizzesMap[p.reference_id]) {
          const quiz = quizzesMap[p.reference_id];
          referenceData = {
            title: quiz.document_name || "Quiz Result",
            subtitle: `Score: ${quiz.score ?? 0}/${quiz.total_questions ?? 0}`,
            score: quiz.score,
            totalQuestions: quiz.total_questions,
          };
        }

        return {
          id: p.id,
          group_id: p.group_id,
          author_id: p.author_id,
          post_type: p.post_type as "document" | "quiz_result" | "note",
          reference_id: p.reference_id,
          caption: p.caption,
          created_at: p.created_at,
          author: p.author_id ? authorsMap[p.author_id] || null : null,
          referenceData,
        };
      });
    },
    enabled: !!groupId && !!user,
  });
}

export function useCreateGroupPost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      groupId,
      postType,
      referenceId,
      caption,
    }: {
      groupId: string;
      postType: "document" | "quiz_result" | "note";
      referenceId?: string | null;
      caption?: string;
    }) => {
      if (!user) throw new Error("Please sign in to share");

      const { data, error } = await supabase
        .from("group_feed_posts")
        .insert({
          group_id: groupId,
          author_id: user.id,
          post_type: postType,
          reference_id: referenceId || null,
          caption: caption?.trim() || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      toast.success("Shared to group feed!");
      queryClient.invalidateQueries({ queryKey: ["group-feed-posts", vars.groupId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to share post");
    },
  });
}

export function useUserShareableItems() {
  const { user } = useAuth();

  const documentsQuery = useQuery({
    queryKey: ["user-shareable-documents", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_files")
        .select("id, file_name, file_size, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const quizzesQuery = useQuery({
    queryKey: ["user-shareable-quizzes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("quiz_sessions")
        .select("id, document_name, score, total_questions, created_at")
        .eq("user_id", user.id)
        .not("score", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  return {
    documents: documentsQuery.data || [],
    quizzes: quizzesQuery.data || [],
    isLoading: documentsQuery.isLoading || quizzesQuery.isLoading,
  };
}
