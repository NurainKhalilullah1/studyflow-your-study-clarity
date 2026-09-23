import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateStudyGroup } from "@/hooks/useStudyGroups";
import { Users, Loader2 } from "lucide-react";

interface CreateStudyGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (groupId: string) => void;
}

export function CreateStudyGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateStudyGroupDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createGroup = useCreateStudyGroup();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      onOpenChange(false);
      if (res?.id) {
        onCreated?.(res.id);
      }
    } catch (_) {
      // Error handled by hook toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle>Create Study Group</DialogTitle>
          <DialogDescription>
            Form a small cohort of up to 10 students to study together, share quiz scores, and run synchronized Pomodoro sessions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">Group Name *</Label>
            <Input
              id="group-name"
              placeholder="e.g. Anatomy Exam Prep, CS 301 Squad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-desc">Description (Optional)</Label>
            <Textarea
              id="group-desc"
              placeholder="What are you studying and what are your goals?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={250}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createGroup.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createGroup.isPending}>
              {createGroup.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
