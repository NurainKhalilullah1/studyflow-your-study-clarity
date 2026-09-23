import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateGroupPost, useUserShareableItems } from "@/hooks/useGroupFeed";
import { FileText, Trophy, MessageSquare, Check, Loader2 } from "lucide-react";

interface ShareToGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export function ShareToGroupDialog({
  open,
  onOpenChange,
  groupId,
}: ShareToGroupDialogProps) {
  const [tab, setTab] = useState<"document" | "quiz" | "note">("document");
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  const { documents, quizzes, isLoading } = useUserShareableItems();
  const createPost = useCreateGroupPost();

  const handleShare = async () => {
    try {
      await createPost.mutateAsync({
        groupId,
        postType: tab === "document" ? "document" : tab === "quiz" ? "quiz_result" : "note",
        referenceId: tab === "note" ? null : selectedReferenceId,
        caption: caption.trim() || undefined,
      });

      setSelectedReferenceId(null);
      setCaption("");
      onOpenChange(false);
    } catch (_) {
      // Error handled in hook toast
    }
  };

  const isSubmitDisabled =
    createPost.isPending ||
    (tab === "document" && !selectedReferenceId) ||
    (tab === "quiz" && !selectedReferenceId) ||
    (tab === "note" && !caption.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share to Group Feed</DialogTitle>
          <DialogDescription>
            Share learning resources or quiz scores with your study group members.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as "document" | "quiz" | "note"); setSelectedReferenceId(null); }}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="document" className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" /> Document
              </TabsTrigger>
              <TabsTrigger value="quiz" className="gap-1.5 text-xs">
                <Trophy className="w-3.5 h-3.5" /> Quiz Score
              </TabsTrigger>
              <TabsTrigger value="note" className="gap-1.5 text-xs">
                <MessageSquare className="w-3.5 h-3.5" /> Note / Update
              </TabsTrigger>
            </TabsList>

            {/* Document Picker */}
            <TabsContent value="document" className="space-y-3 pt-2">
              <span className="text-xs text-muted-foreground block">
                Choose a document from your library:
              </span>
              {isLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                  Loading your documents...
                </div>
              ) : documents.length === 0 ? (
                <div className="p-4 border rounded-xl text-center text-xs text-muted-foreground">
                  No documents found. Upload course slides or notes on the Documents page first.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {documents.map((doc) => {
                    const isSelected = selectedReferenceId === doc.id;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedReferenceId(doc.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <FileText className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : ""}`} />
                          <span className="font-medium truncate">{doc.file_name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Quiz Picker */}
            <TabsContent value="quiz" className="space-y-3 pt-2">
              <span className="text-xs text-muted-foreground block">
                Choose a quiz score to share:
              </span>
              {isLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                  Loading your quiz history...
                </div>
              ) : quizzes.length === 0 ? (
                <div className="p-4 border rounded-xl text-center text-xs text-muted-foreground">
                  No completed quizzes found. Complete a quiz first to share your score.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {quizzes.map((quiz) => {
                    const isSelected = selectedReferenceId === quiz.id;
                    const percent =
                      quiz.total_questions && quiz.total_questions > 0
                        ? Math.round(((quiz.score ?? 0) / quiz.total_questions) * 100)
                        : 0;

                    return (
                      <button
                        key={quiz.id}
                        type="button"
                        onClick={() => setSelectedReferenceId(quiz.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground"
                            : "border-border hover:bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <Trophy className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-amber-500"}`} />
                          <div className="truncate">
                            <span className="font-medium text-foreground block truncate">
                              {quiz.document_name || "General Quiz"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Score: {quiz.score ?? 0}/{quiz.total_questions ?? 0} ({percent}%)
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Note Picker */}
            <TabsContent value="note" className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">
                Share a discussion question, study update, or tip with your group.
              </p>
            </TabsContent>
          </Tabs>

          {/* Caption Input */}
          <div className="space-y-1.5">
            <Label htmlFor="post-caption" className="text-xs font-semibold">
              {tab === "note" ? "Your Note / Message *" : "Add a Caption (Optional)"}
            </Label>
            <Textarea
              id="post-caption"
              placeholder={
                tab === "note"
                  ? "What would you like to discuss with the group?"
                  : "Say something about this resource..."
              }
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              maxLength={300}
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createPost.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={isSubmitDisabled}>
            {createPost.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              "Share to Feed"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
