import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrackStudyEvent } from "@/hooks/useStudyStats";
import { useAuth } from "@/contexts/AuthContext";
import { useReviewFlashcard } from "@/hooks/useFlashcards";
import { RATING_CONFIG, getCardMaturity, type SM2Rating, type SM2CardData } from "@/utils/spacedRepetition";
import { motion, AnimatePresence } from "framer-motion";

export interface ViewerFlashcard extends SM2CardData {
  id: string;
  front: string;
  back: string;
  deck_name?: string;
}

interface FlashcardViewerProps {
  cards: ViewerFlashcard[];
  onClose?: () => void;
  trackReviews?: boolean;
  enableSpacedRepetition?: boolean;
  onFinishReview?: () => void;
}

export const FlashcardViewer = ({
  cards,
  onClose,
  trackReviews = true,
  enableSpacedRepetition = true,
  onFinishReview,
}: FlashcardViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<ViewerFlashcard[]>(cards);
  const [reviewedCards, setReviewedCards] = useState<Set<string>>(new Set());
  const [sessionCount, setSessionCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  const { user } = useAuth();
  const trackEvent = useTrackStudyEvent();
  const reviewMutation = useReviewFlashcard();

  useEffect(() => {
    setShuffledCards(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
  }, [cards]);

  const currentCard = shuffledCards[currentIndex];

  // Track review event when flipped
  useEffect(() => {
    if (isFlipped && currentCard && !reviewedCards.has(currentCard.id) && trackReviews && user) {
      setReviewedCards((prev) => new Set(prev).add(currentCard.id));
      trackEvent.mutate({
        userId: user.id,
        eventType: "flashcard_reviewed",
        metadata: { cardId: currentCard.id },
      });
    }
  }, [isFlipped, currentCard, reviewedCards, trackReviews, user, trackEvent]);

  const handleNext = useCallback(() => {
    if (currentIndex >= shuffledCards.length - 1) {
      if (enableSpacedRepetition && sessionCount > 0) {
        setIsFinished(true);
        if (onFinishReview) onFinishReview();
        return;
      }
    }
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % shuffledCards.length);
    }, 150);
  }, [currentIndex, shuffledCards.length, enableSpacedRepetition, sessionCount, onFinishReview]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + shuffledCards.length) % shuffledCards.length);
    }, 150);
  }, [shuffledCards.length]);

  const handleRateCard = useCallback(async (rating: SM2Rating) => {
    if (!currentCard) return;

    // Trigger mutation in background
    reviewMutation.mutate({
      cardId: currentCard.id,
      rating,
      currentCard,
    });

    setSessionCount((prev) => prev + 1);

    // If rated "Again", append to end of current session queue to repeat
    if (rating === 1) {
      setShuffledCards((prev) => [...prev, currentCard]);
    }

    // Advance to next card
    if (currentIndex >= shuffledCards.length - 1) {
      setIsFinished(true);
      if (onFinishReview) onFinishReview();
    } else {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 150);
    }
  }, [currentCard, reviewMutation, currentIndex, shuffledCards.length, onFinishReview]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped && enableSpacedRepetition) {
        if (e.key === "1") handleRateCard(1);
        if (e.key === "2") handleRateCard(3);
        if (e.key === "3") handleRateCard(4);
        if (e.key === "4") handleRateCard(5);
      } else if (!isFlipped) {
        if (e.key === "ArrowRight") handleNext();
        if (e.key === "ArrowLeft") handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, enableSpacedRepetition, handleRateCard, handleNext, handlePrev]);

  const handleShuffle = () => {
    const shuffled = [...shuffledCards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleReset = () => {
    setShuffledCards(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setSessionCount(0);
  };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No flashcards to review right now.</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          You're all caught up for today! 🎉
        </p>
      </div>
    );
  }

  // Finished review celebration screen
  if (isFinished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center space-y-4 max-w-md mx-auto"
      >
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mb-2">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold">Review Complete! 🎉</h3>
        <p className="text-muted-foreground text-sm">
          You reviewed <strong>{sessionCount}</strong> cards using spaced repetition. Your memory strength and daily streak have been updated!
        </p>
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" /> Review Again
          </Button>
          {onClose && (
            <Button variant="default" onClick={onClose}>
              Back to Decks
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  const maturity = currentCard ? getCardMaturity(currentCard) : "new";
  const maturityBadges: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    new: { label: "New", variant: "secondary" },
    learning: { label: "Learning", variant: "outline" },
    review: { label: "In Review", variant: "default" },
    mastered: { label: "Mastered 🌟", variant: "default" },
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6 w-full max-w-xl mx-auto">
      {/* Top Header: Progress & Maturity */}
      <div className="w-full flex items-center justify-between text-xs text-muted-foreground px-2">
        <Badge variant={maturityBadges[maturity].variant} className="text-[11px] font-medium">
          {maturityBadges[maturity].label}
        </Badge>
        <span>
          Card {currentIndex + 1} of {shuffledCards.length}
        </span>
        <span className="text-[11px] hidden sm:inline text-muted-foreground/60">
          Space to flip
        </span>
      </div>

      {/* 3D Flashcard */}
      <div
        className="perspective-1000 w-full h-72 cursor-pointer select-none"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={cn(
            "relative w-full h-full transition-transform duration-500 transform-style-preserve-3d shadow-lg rounded-2xl",
            isFlipped && "rotate-y-180"
          )}
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <Card
            className="absolute inset-0 p-8 flex flex-col justify-between text-center backface-hidden bg-gradient-to-br from-primary/5 via-card to-accent/5 border-2 border-primary/20 rounded-2xl"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Question
            </div>
            <div className="my-auto overflow-y-auto max-h-40 px-2">
              <p className="text-lg md:text-xl font-medium leading-relaxed">
                {currentCard?.front}
              </p>
            </div>
            <div className="text-xs text-muted-foreground/60 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" /> Tap to reveal answer
            </div>
          </Card>

          {/* Back */}
          <Card
            className="absolute inset-0 p-8 flex flex-col justify-between text-center backface-hidden bg-gradient-to-br from-emerald-500/10 via-card to-green-500/5 border-2 border-emerald-500/30 rounded-2xl"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
              Answer
            </div>
            <div className="my-auto overflow-y-auto max-h-40 px-2">
              <p className="text-lg md:text-xl font-medium leading-relaxed text-foreground">
                {currentCard?.back}
              </p>
            </div>
            <div className="text-xs text-muted-foreground/60">
              Rate how well you recalled this
            </div>
          </Card>
        </div>
      </div>

      {/* Controls & Rating Area */}
      <div className="w-full space-y-3">
        {/* SM-2 Rating Buttons (Shown when card is flipped) */}
        <AnimatePresence>
          {isFlipped && enableSpacedRepetition ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="grid grid-cols-4 gap-2 w-full pt-1"
            >
              {([1, 3, 4, 5] as SM2Rating[]).map((rating) => {
                const config = RATING_CONFIG[rating];
                return (
                  <button
                    key={rating}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRateCard(rating);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 active:scale-95",
                      config.bg
                    )}
                  >
                    <span className={cn("font-semibold text-sm", config.color)}>
                      {config.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      {config.intervalDesc}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleReset}
                title="Reset deck"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handlePrev}
                disabled={shuffledCards.length <= 1}
                title="Previous card"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="glow"
                className="px-6"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                {isFlipped ? "Show Question" : "Show Answer"}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={shuffledCards.length <= 1}
                title="Next card"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={handleShuffle}
                title="Shuffle cards"
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </AnimatePresence>

        {isFlipped && enableSpacedRepetition && (
          <p className="text-[11px] text-center text-muted-foreground/60">
            Keyboard shortcuts: <strong>1</strong> (Again) · <strong>2</strong> (Hard) · <strong>3</strong> (Good) · <strong>4</strong> (Easy)
          </p>
        )}
      </div>
    </div>
  );
};
