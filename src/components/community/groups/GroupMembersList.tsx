import { useState } from "react";
import {
  useStudyGroupDetails,
  useInviteByUsername,
  useRemoveMember,
  useSearchProfiles,
  GroupMemberProfile,
} from "@/hooks/useStudyGroups";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Crown,
  UserPlus,
  UserMinus,
  LogOut,
  Search,
  Loader2,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface GroupMembersListProps {
  groupId: string;
  groupName: string;
  isOwner: boolean;
  memberCount: number;
  maxMembers: number;
}

export function GroupMembersList({
  groupId,
  groupName,
  isOwner,
  memberCount,
  maxMembers,
}: GroupMembersListProps) {
  const { user } = useAuth();
  const { data: details, isLoading } = useStudyGroupDetails(groupId);
  const inviteByUsername = useInviteByUsername();
  const removeMember = useRemoveMember();

  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults, isFetching: isSearching } = useSearchProfiles(searchQuery);

  const members = details?.members || [];
  const isFull = memberCount >= maxMembers;

  const handleAddMember = async (targetUserId: string) => {
    try {
      await inviteByUsername.mutateAsync({
        groupId,
        groupName,
        targetUserId,
      });
      setSearchQuery("");
    } catch (_) {
      // Error handled by hook toast
    }
  };

  const handleRemove = (targetUserId: string) => {
    removeMember.mutate({
      groupId,
      targetUserId,
    });
  };

  return (
    <div className="space-y-6">
      {/* Search and invite peers section */}
      <div className="bg-card border border-border/70 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground">Add Group Members</h4>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {memberCount}/{maxMembers} members
          </span>
        </div>

        {isFull ? (
          <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground text-center">
            This study group has reached the 10-member maximum.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
              {isSearching && (
                <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>

            {/* Search results dropdown */}
            {searchQuery.trim().length >= 2 && searchResults && searchResults.length > 0 && (
              <div className="border border-border/80 rounded-lg bg-popover divide-y divide-border/50 max-h-48 overflow-y-auto shadow-md">
                {searchResults.map((profile) => {
                  const alreadyInGroup = members.some((m) => m.user_id === profile.id);
                  const name = profile.full_name || "Student";

                  return (
                    <div
                      key={profile.id}
                      className="p-2 flex items-center justify-between gap-2 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={profile.avatar_url || ""} />
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{name}</p>
                          {profile.university && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {profile.university}
                            </p>
                          )}
                        </div>
                      </div>

                      {alreadyInGroup ? (
                        <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                          Joined
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs px-2.5 shrink-0"
                          onClick={() => handleAddMember(profile.id)}
                          disabled={inviteByUsername.isPending}
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Members roster */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Current Members ({members.length})
        </h4>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
            Loading members...
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const name = member.profiles?.full_name || "Student";
              const isSelf = member.user_id === user?.id;
              const joinedAgo = member.joined_at
                ? formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })
                : "";

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70 hover:border-border transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarImage src={member.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {name}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] text-muted-foreground">(You)</span>
                        )}
                        {member.role === "owner" && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1 px-1.5 py-0"
                          >
                            <Crown className="w-3 h-3" />
                            Owner
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        Joined {joinedAgo}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    {isSelf ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-8 gap-1.5"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Leave
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Leave Study Group?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.role === "owner"
                                ? "You are the group owner. If you leave, ownership will be transferred to the earliest-joined remaining member. If you are the last member, the group will be closed."
                                : "Are you sure you want to leave this study group? You will need an invite link or code to join again."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Stay</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemove(member.user_id)}
                              className="bg-rose-600 hover:bg-rose-700"
                            >
                              Leave Group
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : isOwner ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 h-8"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove {name} from this study group? Their existing feed contributions will remain visible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemove(member.user_id)}
                              className="bg-rose-600 hover:bg-rose-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
