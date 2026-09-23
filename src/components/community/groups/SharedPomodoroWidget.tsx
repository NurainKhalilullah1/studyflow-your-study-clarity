import { useState } from "react";
import {
  useActiveGroupSession,
  useGroupSessionTimer,
  useStartGroupSession,
  useJoinGroupSession,
  useCompleteGroupSession,
  GroupSession,
} from "@/hooks/useGroupSession";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Users, Coffee, Flame, Sparkles, Loader2, CheckCircle2 } from "lucide-react";

interface SharedPomodoroWidgetProps {
  groupId: string;
  groupName: string;
}

export function SharedPomodoroWidget({ groupId, groupName }: SharedPomodoroWidgetProps) {
  const { user } = useAuth();
  const { data: sessionData, isLoading } = useActiveGroupSession(groupId);
  const startSession = useStartGroupSession();
  const joinSession = useJoinGroupSession();
  const completeSession = useCompleteGroupSession();

  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [selectedBreak, setSelectedBreak] = useState<number>(5);

  const activeSession = sessionData?.session;
  const participants = sessionData?.participants || [];
  const isParticipant = participants.some((p) => p.user_id === user?.id);

  // Handle timer completion and XP award
  const handleWorkComplete = () => {
    if (activeSession && isParticipant) {
      completeSession.mutate({
        sessionId: activeSession.id,
        groupId,
        durationMinutes: Math.round(activeSession.work_duration / 60),
      });
    }
  };

  const { secondsRemaining, mode, isCompleted } = useGroupSessionTimer(
    activeSession,
    handleWorkComplete
  );

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-2xl min-h-[260px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-3">Loading study room...</p>
      </div>
    );
  }

  // 1. ACTIVE SESSION VIEW
  if (activeSession && !isCompleted) {
    const totalDuration =
      mode === "work" ? activeSession.work_duration : activeSession.break_duration;
    const progressPercent = totalDuration > 0
      ? Math.max(0, Math.min(100, ((totalDuration - secondsRemaining) / totalDuration) * 100))
      : 0;

    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 border border-border/70 rounded-2xl p-6 shadow-sm">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-sm font-semibold text-foreground">Session Active</span>
          </div>

          <Badge
            variant="outline"
            className={
              mode === "work"
                ? "bg-rose-500/10 text-rose-500 border-rose-500/30 gap-1.5"
                : "bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1.5"
            }
          >
            {mode === "work" ? (
              <>
                <Flame className="w-3.5 h-3.5" /> Focus Interval
              </>
            ) : (
              <>
                <Coffee className="w-3.5 h-3.5" /> Rest Break
              </>
            )}
          </Badge>
        </div>

        {/* Big Central Countdown */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative flex items-center justify-center w-48 h-48 rounded-full border-4 border-muted/50 bg-background/50">
            {/* SVG Progress Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="6"
                className="text-muted/30"
                fill="transparent"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - progressPercent / 100)}
                strokeLinecap="round"
                className={`transition-all duration-1000 ${
                  mode === "work" ? "text-primary" : "text-amber-500"
                }`}
                fill="transparent"
              />
            </svg>

            {/* Time Display */}
            <div className="text-center z-10">
              <div className="text-4xl font-extrabold tracking-tight font-mono text-foreground">
                {formatTime(secondsRemaining)}
              </div>
              <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mt-1">
                {mode === "work" ? "Remaining" : "Break Time"}
              </p>
            </div>
          </div>
        </div>

        {/* Join action or participant status */}
        <div className="mt-6 flex flex-col items-center justify-center gap-3">
          {!isParticipant ? (
            <Button
              size="lg"
              className="w-full max-w-sm gap-2 font-semibold shadow-md"
              onClick={() =>
                joinSession.mutate({ sessionId: activeSession.id, groupId })
              }
              disabled={joinSession.isPending}
            >
              {joinSession.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Join This Focus Session
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              You are actively participating (+25 XP on completion)
            </div>
          )}

          {/* Active Participants Avatars */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground">Studying together:</span>
            <div className="flex -space-x-2">
              {participants.map((p) => {
                const name = p.profiles?.full_name || "Student";
                return (
                  <Avatar key={p.id} className="w-7 h-7 border-2 border-background">
                    <AvatarImage src={p.profiles?.avatar_url || ""} />
                    <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                      {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
            </div>
            <span className="text-xs font-semibold text-foreground">
              {participants.length} {participants.length === 1 ? "student" : "students"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. IDLE ROOM (START NEW SESSION)
  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-6">
      <div className="max-w-md mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
          <Flame className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Shared Focus Room</h3>
        <p className="text-sm text-muted-foreground">
          Study with peers in real time. All members see the same live Pomodoro timer and earn +25 XP upon completion.
        </p>
      </div>

      {/* Preset Duration Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="space-y-1.5 w-full sm:w-auto">
          <span className="text-xs font-medium text-muted-foreground">Work Duration</span>
          <div className="flex items-center justify-center gap-2">
            {[25, 45, 50].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setSelectedDuration(mins)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedDuration === mins
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {mins} mins
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5 w-full sm:w-auto">
          <span className="text-xs font-medium text-muted-foreground">Break Duration</span>
          <div className="flex items-center justify-center gap-2">
            {[5, 10].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setSelectedBreak(mins)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedBreak === mins
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {mins} mins
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="pt-2">
        <Button
          size="lg"
          className="gap-2 px-8 font-semibold shadow-md"
          onClick={() =>
            startSession.mutate({
              groupId,
              groupName,
              workDurationMinutes: selectedDuration,
              breakDurationMinutes: selectedBreak,
            })
          }
          disabled={startSession.isPending}
        >
          {startSession.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          Start Shared Pomodoro
        </Button>
      </div>
    </div>
  );
}
