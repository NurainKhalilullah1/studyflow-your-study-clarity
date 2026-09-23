import { useState } from "react";
import { useMyStudyGroups, StudyGroup } from "@/hooks/useStudyGroups";
import { CreateStudyGroupDialog } from "./CreateStudyGroupDialog";
import { JoinGroupDialog } from "./JoinGroupDialog";
import { StudyGroupDrawer } from "./StudyGroupDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  KeyRound,
  Crown,
  ChevronRight,
  Flame,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface StudyGroupsListProps {
  initialOpenGroupId?: string | null;
}

export function StudyGroupsList({ initialOpenGroupId }: StudyGroupsListProps) {
  const { data: groups, isLoading } = useMyStudyGroups();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialOpenGroupId || null
  );
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleCopyCode = (e: React.MouseEvent, code: string, groupId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCodeId(groupId);
    toast.success("Invite code copied!");
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleGroupCreatedOrJoined = (groupId: string) => {
    setSelectedGroupId(groupId);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-2xl p-4 sm:p-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Your Study Groups
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Collaborate in cohorts of up to 10 peers, share resources, and study in sync.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setJoinOpen(true)}
            className="text-xs gap-1.5 h-9"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Join with Code
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="text-xs gap-1.5 h-9 font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Group Cards or Loading / Empty States */}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          Loading your study groups...
        </div>
      ) : !groups || groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed rounded-3xl bg-card/40 space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <Users className="w-8 h-8" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="font-bold text-lg text-foreground">No study groups yet</h3>
            <p className="text-xs text-muted-foreground">
              Form small peer groups with course mates to stay accountable, run shared Pomodoro sessions, and exchange notes.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setJoinOpen(true)}
              className="text-xs gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Enter Code
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="text-xs gap-1.5 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Group
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => {
            const isOwner = group.user_role === "owner";

            return (
              <div
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className="group relative bg-card border border-border/80 hover:border-primary/50 hover:shadow-md rounded-2xl p-5 cursor-pointer transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 pr-2">
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {group.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {isOwner && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] gap-1 px-1.5 py-0"
                        >
                          <Crown className="w-3 h-3" />
                          Owner
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-muted/60 text-muted-foreground px-2 py-0"
                      >
                        {group.member_count}/{group.max_members || 10}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Footer of card */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 text-xs">
                  {group.invite_code ? (
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(e, group.invite_code!, group.id)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 hover:bg-muted font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy Invite Code"
                    >
                      <span>Code:</span>
                      <span className="font-semibold text-foreground tracking-wide uppercase">
                        {group.invite_code}
                      </span>
                      {copiedCodeId === group.id ? (
                        <Check className="w-3 h-3 text-emerald-500 ml-0.5" />
                      ) : (
                        <Copy className="w-3 h-3 ml-0.5" />
                      )}
                    </button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-1 text-primary text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Open Room</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals and Drawer */}
      <CreateStudyGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleGroupCreatedOrJoined}
      />

      <JoinGroupDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onJoined={handleGroupCreatedOrJoined}
      />

      <StudyGroupDrawer
        groupId={selectedGroupId}
        open={!!selectedGroupId}
        onOpenChange={(open) => {
          if (!open) setSelectedGroupId(null);
        }}
      />
    </div>
  );
}
