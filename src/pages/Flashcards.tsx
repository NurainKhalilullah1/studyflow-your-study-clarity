import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlashcardViewer } from "@/components/tutor/FlashcardViewer";
import { useAuth } from "@/contexts/AuthContext";
import { useFlashcards, useDueFlashcards, useDeleteFlashcard } from "@/hooks/useFlashcards";
import { isCardDue, getCardMaturity } from "@/utils/spacedRepetition";
import { Layers, Trash2, BookOpen, Loader2, Sparkles, BrainCircuit, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function Flashcards() {
  const { user } = useAuth();
  const { data: flashcards, isLoading } = useFlashcards(user?.id);
  const { dueCards, dueCount } = useDueFlashcards(user?.id);
  const deleteFlashcard = useDeleteFlashcard();

  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [reviewAll, setReviewAll] = useState(false);
  const [reviewDueOnly, setReviewDueOnly] = useState(false);

  // Group flashcards by deck_name
  const decks = flashcards?.reduce((acc, card) => {
    const deckName = card.deck_name || "General";
    if (!acc[deckName]) {
      acc[deckName] = [];
    }
    acc[deckName].push(card);
    return acc;
  }, {} as Record<string, typeof flashcards>) || {};

  const deckNames = Object.keys(decks);
  const selectedCards = selectedDeck ? decks[selectedDeck] || [] : [];
  const allCards = flashcards || [];

  const handleDeleteCard = async (id: string) => {
    try {
      await deleteFlashcard.mutateAsync(id);
      toast.success("Flashcard deleted");
    } catch {
      toast.error("Failed to delete flashcard");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Review Due Cards mode (Spaced Repetition priority)
  if (reviewDueOnly) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-3xl mx-auto pb-20 md:pb-6">
          <Button variant="ghost" onClick={() => setReviewDueOnly(false)} className="mb-4">
            ← Back to decks
          </Button>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/30 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                    Daily Spaced Repetition Review
                  </CardTitle>
                  <Badge variant="secondary" className="font-mono">
                    {dueCards.length} due
                  </Badge>
                </div>
                <CardDescription>
                  Reviewing cards at their optimal retention window using the SuperMemo-2 algorithm.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FlashcardViewer
                  cards={dueCards}
                  enableSpacedRepetition={true}
                  onClose={() => setReviewDueOnly(false)}
                  onFinishReview={() => {
                    toast.success("Great job! All due cards reviewed for today.");
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  // Review All mode
  if (reviewAll) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-3xl mx-auto pb-20 md:pb-6">
          <Button variant="ghost" onClick={() => setReviewAll(false)} className="mb-4">
            ← Back to decks
          </Button>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Review All Cards
                </CardTitle>
                <CardDescription>{allCards.length} cards from {deckNames.length} decks</CardDescription>
              </CardHeader>
              <CardContent>
                <FlashcardViewer
                  cards={allCards}
                  enableSpacedRepetition={true}
                  onClose={() => setReviewAll(false)}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto pb-20 md:pb-6 space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <Layers className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">My Flashcards</h1>
              <p className="text-muted-foreground text-sm">
                {flashcards?.length || 0} cards across {deckNames.length} deck{deckNames.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            {dueCount > 0 && (
              <Button
                variant="glow"
                onClick={() => setReviewDueOnly(true)}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <BrainCircuit className="w-4 h-4" />
                Review Due ({dueCount})
              </Button>
            )}
            {allCards.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setReviewAll(true)}
                className="gap-2 flex-1 sm:flex-initial"
              >
                <BookOpen className="w-4 h-4" />
                Review All
              </Button>
            )}
          </div>
        </motion.div>

        {/* Spaced Repetition Hero Card */}
        {allCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
              <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1 bg-primary/20 text-primary font-medium">
                      <Sparkles className="w-3 h-3" /> SuperMemo SM-2 Active
                    </Badge>
                    {dueCount === 0 && (
                      <Badge variant="outline" className="text-green-600 border-green-500/30 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> All Caught Up
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold pt-1">
                    {dueCount > 0
                      ? `You have ${dueCount} flashcard${dueCount !== 1 ? "s" : ""} due for optimal memory recall`
                      : "Zero cards due today — your memory is currently reinforced!"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Spaced repetition predicts the exact moment memories begin to fade, reviewing them in expanding intervals for permanent retention.
                  </p>
                </div>

                {dueCount > 0 ? (
                  <Button
                    variant="glow"
                    size="lg"
                    onClick={() => setReviewDueOnly(true)}
                    className="shrink-0 gap-2 font-medium"
                  >
                    <Clock className="w-4 h-4" />
                    Start Daily Review (~{Math.max(1, Math.ceil(dueCount * 0.4))}m)
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setReviewAll(true)}
                    className="shrink-0 gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Practice Ahead
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {deckNames.length === 0 ? (
          /* Empty state */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No flashcards yet</h3>
              <p className="text-muted-foreground max-w-sm mb-4 text-sm">
                Upload notes or lecture slides in the AI Tutor and ask it to generate flashcards to start your spaced repetition study streak.
              </p>
              <Button asChild variant="glow">
                <Link to="/tutor">Go to AI Tutor</Link>
              </Button>
            </CardContent>
          </Card>
        ) : selectedDeck ? (
          /* Single Deck Viewer */
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedDeck(null)}
              className="mb-4"
            >
              ← Back to decks
            </Button>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedDeck}</CardTitle>
                    <CardDescription>{selectedCards.length} cards</CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {selectedCards.filter(isCardDue).length} due today
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <FlashcardViewer
                  cards={selectedCards}
                  enableSpacedRepetition={true}
                />

                {/* Card list for management */}
                <div className="mt-8 border-t pt-6">
                  <h4 className="font-medium mb-4">All Cards in Deck</h4>
                  <div className="space-y-3">
                    {selectedCards.map((card) => {
                      const maturity = getCardMaturity(card);
                      const isDue = isCardDue(card);
                      return (
                        <div
                          key={card.id}
                          className="flex items-start justify-between p-4 rounded-lg bg-muted/40 border transition-colors hover:bg-muted/60"
                        >
                          <div className="flex-1 mr-4 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={isDue ? "destructive" : "secondary"} className="text-[10px] py-0">
                                {isDue ? "Due Now" : `Interval: ${card.interval_days || 0}d`}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground capitalize font-medium">
                                {maturity}
                              </span>
                            </div>
                            <p className="font-medium text-sm pt-1">{card.front}</p>
                            <p className="text-sm text-muted-foreground">{card.back}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCard(card.id)}
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Deck Grid */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deckNames.map((deckName) => {
              const cards = decks[deckName];
              const dueInDeck = cards.filter(isCardDue).length;
              return (
                <Card
                  key={deckName}
                  className={cn(
                    "cursor-pointer transition-all duration-300 relative group",
                    "hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1",
                    dueInDeck > 0 ? "border-primary/40" : "hover:border-border"
                  )}
                  onClick={() => setSelectedDeck(deckName)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      {dueInDeck > 0 ? (
                        <Badge variant="default" className="bg-primary text-primary-foreground font-mono">
                          {dueInDeck} due
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Up to date
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {deckName}
                    </CardTitle>
                    <CardDescription>{cards.length} cards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Click to practice</span>
                      <span className="text-primary font-medium group-hover:translate-x-1 transition-transform inline-block">
                        Open Deck →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
