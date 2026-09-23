import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGroupByInviteCode, useJoinByInviteCode } from "@/hooks/useStudyGroups";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Sparkles, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

export default function GroupJoin() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, isSessionVerified } = useAuth();

  const { data: group, isLoading, error } = useGroupByInviteCode(code);
  const joinMutation = useJoinByInviteCode();

  const isFull = group ? (group.member_count >= (group.max_members || 10)) : false;

  const handleJoin = async () => {
    if (!code) return;

    if (!user || !isSessionVerified) {
      // Store redirect target and send to auth
      sessionStorage.setItem("studyflow_return_to", `/groups/join/${code}`);
      navigate(`/auth?returnTo=/groups/join/${code}`);
      return;
    }

    try {
      const res = await joinMutation.mutateAsync(code);
      if (res?.group?.id) {
        navigate(`/community?tab=study-groups&groupId=${res.group.id}`);
      }
    } catch (_) {
      // Handled by hook toast
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-8 cursor-pointer" onClick={() => navigate("/")}>
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
          <Sparkles className="w-5 h-5" />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-foreground">Lumina</span>
      </div>

      <div className="w-full max-w-md bg-card border border-border/80 shadow-xl rounded-3xl p-6 sm:p-8 space-y-6 text-center">
        {isLoading ? (
          <div className="py-12 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">Checking invite link...</p>
          </div>
        ) : error || !group ? (
          <div className="py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">Group Not Found</h2>
              <p className="text-xs text-muted-foreground">
                This invite link may be expired or the invite code is incorrect.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/community")}
              className="text-xs mt-2"
            >
              Go to Community
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
                <Users className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider block mb-1">
                  You're Invited to Join
                </span>
                <h1 className="text-2xl font-black text-foreground tracking-tight">
                  {group.name}
                </h1>
                {group.description && (
                  <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto line-clamp-3">
                    {group.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <Badge
                  variant="outline"
                  className={
                    isFull
                      ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  }
                >
                  {group.member_count}/{group.max_members || 10} members
                </Badge>
                {isFull && (
                  <Badge variant="destructive" className="text-[10px]">
                    Group Full
                  </Badge>
                )}
              </div>
            </div>

            {/* Benefits Banner */}
            <div className="bg-muted/40 border border-border/60 rounded-2xl p-4 text-left text-xs space-y-2 text-muted-foreground">
              <p className="font-semibold text-foreground">In this study group:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Study in synchronized Pomodoro focus rooms</li>
                <li>Share document summaries and quiz scores</li>
                <li>Earn individual XP together with peers</li>
              </ul>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              {isFull ? (
                <Button disabled size="lg" className="w-full text-xs">
                  Group is at Maximum Capacity (10/10)
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full gap-2 font-semibold shadow-md"
                  onClick={handleJoin}
                  disabled={joinMutation.isPending}
                >
                  {joinMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Joining Group...
                    </>
                  ) : !user || !isSessionVerified ? (
                    <>
                      Sign In to Join Group
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Join Study Group
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}

              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Protected by Lumina. Max 10 peers per study group.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
