import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateSM2, isCardDue, type SM2Rating, type SM2CardData } from '@/utils/spacedRepetition';

export interface Flashcard extends SM2CardData {
  id: string;
  user_id: string;
  session_id: string | null;
  front: string;
  back: string;
  deck_name: string;
  created_at: string;
}

export const useFlashcards = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['flashcards', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Flashcard[];
    },
    enabled: !!userId,
  });
};

export const useDueFlashcards = (userId: string | undefined) => {
  const query = useFlashcards(userId);
  const dueCards = query.data?.filter(isCardDue) || [];
  return {
    ...query,
    dueCards,
    dueCount: dueCards.length,
  };
};

export const useFlashcardsBySession = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: ['flashcards', 'session', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Flashcard[];
    },
    enabled: !!sessionId,
  });
};

export const useReviewFlashcard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardId,
      rating,
      currentCard,
    }: {
      cardId: string;
      rating: SM2Rating;
      currentCard: SM2CardData;
    }) => {
      const sm2Update = calculateSM2(currentCard, rating);
      const { data, error } = await supabase
        .from('flashcards')
        .update(sm2Update as any)
        .eq('id', cardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
};

export const useCreateFlashcards = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (flashcards: Omit<Flashcard, 'id' | 'created_at'>[]) => {
      const { data, error } = await supabase
        .from('flashcards')
        .insert(flashcards)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
};

export const useDeleteFlashcard = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
};

export const useDeleteFlashcardsBySession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('session_id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });
};
