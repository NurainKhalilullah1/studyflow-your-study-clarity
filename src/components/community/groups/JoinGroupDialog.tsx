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
import { Label } from "@/components/ui/label";
import { useJoinByInviteCode } from "@/hooks/useStudyGroups";
import { KeyRound, Loader2 } from "lucide-react";

interface JoinGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined?: (groupId: string) => void;
}

export function JoinGroupDialog({ open, onOpenChange, onJoined }: JoinGroupDialogProps) {
  const [inviteCode, setInviteCode] = useState("");
  const joinGroup = useJoinByInviteCode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inviteCode.trim().toUpperCase();
    if (!clean) return;

    try {
      const res = await joinGroup.mutateAsync(clean);
      setInviteCode("");
      onOpenChange(false);
      if (res?.group?.id) {
        onJoined?.(res.group.id);
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
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle>Join with Invite Code</DialogTitle>
          <DialogDescription>
            Enter the 8-character invite code shared by your group creator or peer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              placeholder="e.g. 7K2M9XPQ"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={12}
              className="font-mono text-center tracking-wider text-lg uppercase"
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={joinGroup.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!inviteCode.trim() || joinGroup.isPending}
            >
              {joinGroup.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Group"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
