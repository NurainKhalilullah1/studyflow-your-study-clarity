import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SharedPomodoroWidget } from "./SharedPomodoroWidget";
import { GroupFeedPostCard } from "./GroupFeedPostCard";
import { ShareToGroupDialog } from "./ShareToGroupDialog";
import { GroupMembersList } from "./GroupMembersList";
import { useStudyGroupDetails } from "@/hooks/useStudyGroups";
import { useGroupFeedPosts } from "@/hooks/useGroupFeed";
import {
  Flame,
  MessageSquare,
  Users,
  Copy,
  Check,
  Share2,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface StudyGroupDrawerProps {
  groupId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudyGroupDrawer({
  groupId,
  open,
  onOpenChange,
}: StudyGroupDrawerProps) {
  const [activeTab, setActiveTab] = useState<"focus" | "feed" | "members">("focus");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: groupDetails, isLoading } = useStudyGroupDetails(groupId || undefined);
  const { data: feedPosts, isLoading: feedLoading } = useGroupFeedPosts(groupId || undefined);

  if (!groupId) return null;

  const inviteCode = groupDetails?.invite_code || "";
  const inviteLink = `${window.location.origin}/groups/join/${inviteCode}`;

  const copyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    toast.success("Invite code copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    toast.success("Invite link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-background border-l border-border"
        >
          {isLoading || !groupDetails ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Top Drawer Header */}
              <div className="p-6 border-b border-border/80 bg-card/60 backdrop-blur space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <SheetTitle className="text-xl font-bold text-foreground truncate">
                      {groupDetails.name}
                    </SheetTitle>
                    {groupDetails.description && (
                      <SheetDescription className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {groupDetails.description}
                      </SheetDescription>
                    )}
                  </div>

                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20 shrink-0 text-xs px-2.5 py-1"
                  >
                    {groupDetails.member_count}/{groupDetails.max_members || 10} members
                  </Badge>
                </div>

                {/* Shareable Invite Code Pill */}
                {inviteCode && (
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs font-mono">
                      <span className="text-muted-foreground">Code:</span>
                      <span className="font-bold text-foreground tracking-wider uppercase">
                        {inviteCode}
                      </span>
                      <button
                        type="button"
                        onClick={copyCode}
                        className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy Code"
                      >
                        {copiedCode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1.5"
                      onClick={copyLink}
                    >
                      {copiedLink ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                      Copy Join Link
                    </Button>
                  </div>
                )}
              </div>

              {/* Navigation Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "focus" | "feed" | "members")}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="px-6 border-b border-border bg-card/30">
                  <TabsList className="bg-transparent border-b-0 p-0 h-11 w-full justify-start gap-6">
                    <TabsTrigger
                      value="focus"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-semibold text-xs gap-2"
                    >
                      <Flame className="w-4 h-4 text-primary" />
                      Focus Room
                    </TabsTrigger>
                    <TabsTrigger
                      value="feed"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-semibold text-xs gap-2"
                    >
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      Group Feed
                    </TabsTrigger>
                    <TabsTrigger
                      value="members"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-0 font-semibold text-xs gap-2"
                    >
                      <Users className="w-4 h-4 text-purple-500" />
                      Members ({groupDetails.member_count})
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab 1: Focus Room */}
                <TabsContent
                  value="focus"
                  className="flex-1 overflow-y-auto p-6 space-y-4 focus-visible:outline-none"
                >
                  <SharedPomodoroWidget
                    groupId={groupDetails.id}
                    groupName={groupDetails.name}
                  />
                </TabsContent>

                {/* Tab 2: Group Feed */}
                <TabsContent
                  value="feed"
                  className="flex-1 overflow-y-auto p-6 space-y-4 focus-visible:outline-none"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Study Feed</h3>
                      <p className="text-xs text-muted-foreground">
                        Real-time notes, uploaded documents, and quiz scores shared with this group.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShareDialogOpen(true)}
                      className="gap-1.5 h-8 text-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Share Resource
                    </Button>
                  </div>

                  {feedLoading ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading group feed...
                    </div>
                  ) : !feedPosts || feedPosts.length === 0 ? (
                    <div className="py-16 text-center border border-dashed rounded-2xl p-6 bg-card/40 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">
                        No resources shared yet
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        Be the first to share a document or quiz score with your study squad!
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShareDialogOpen(true)}
                        className="text-xs gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Share Resource Now
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {feedPosts.map((post) => (
                        <GroupFeedPostCard key={post.id} post={post} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: Members */}
                <TabsContent
                  value="members"
                  className="flex-1 overflow-y-auto p-6 focus-visible:outline-none"
                >
                  <GroupMembersList
                    groupId={groupDetails.id}
                    groupName={groupDetails.name}
                    isOwner={groupDetails.isOwner}
                    memberCount={groupDetails.member_count}
                    maxMembers={groupDetails.max_members || 10}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {groupId && (
        <ShareToGroupDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          groupId={groupId}
        />
      )}
    </>
  );
}
