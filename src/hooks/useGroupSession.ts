import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GroupSession {
  id: string;
  group_id: string;
  started_by: string | null;
  work_duration: number;
  break_duration: number;
  started_at: string;
  state: "work" | "break" | "completed";
  completed_at: string | null;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  completed: boolean;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useActiveGroupSession(groupId: string | undefined) {
  const queryClient = useQueryClient();

  // Listen for real-time changes to group_sessions
  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group-sessions:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_sessions",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["active-group-session", groupId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_session_participants",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["active-group-session", groupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);

  return useQuery({
    queryKey: ["active-group-session", groupId],
    queryFn: async () => {
      if (!groupId) return null;

      // Look for a session in work or break state
      const { data: session, error } = await supabase
        .from("group_sessions")
        .select("id, group_id, started_by, work_duration, break_duration, started_at, state, completed_at")
        .eq("group_id", groupId)
        .in("state", ["work", "break"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!session) return null;

      // Fetch participants
      const { data: participantRows } = await supabase
        .from("group_session_participants")
        .select("id, session_id, user_id, joined_at, completed")
        .eq("session_id", session.id);

      const userIds = (participantRows || []).map((p) => p.user_id);
      const profilesMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        if (profiles) {
          profiles.forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      const participants: SessionParticipant[] = (participantRows || []).map((p) => ({
        id: p.id,
        session_id: p.session_id,
        user_id: p.user_id,
        joined_at: p.joined_at,
        completed: p.completed,
        profiles: profilesMap[p.user_id] || null,
      }));

      return {
        session: session as GroupSession,
        participants,
      };
    },
    enabled: !!groupId,
    refetchInterval: 5000, // Background sync fallback
  });
}

export function useGroupSessionTimer(session: GroupSession | undefined, onWorkComplete?: () => void) {
  const { user } = useAuth();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [currentMode, setCurrentMode] = useState<"work" | "break" | "completed">("work");
  const hasTriggeredCompleteRef = useRef(false);

  // Derive initial timer and state from started_at
  const deriveTimer = useCallback(() => {
    if (!session) return { mode: "work" as const, remaining: 0, isDone: true };

    const startTime = new Date(session.started_at).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((now - startTime) / 1000));

    const workSec = session.work_duration || 1500;
    const breakSec = session.break_duration || 300;
    const totalSec = workSec + breakSec;

    if (elapsedSeconds < workSec) {
      return {
        mode: "work" as const,
        remaining: workSec - elapsedSeconds,
        isDone: false,
      };
    } else if (elapsedSeconds < totalSec) {
      return {
        mode: "break" as const,
        remaining: totalSec - elapsedSeconds,
        isDone: false,
      };
    } else {
      return {
        mode: "completed" as const,
        remaining: 0,
        isDone: true,
      };
    }
  }, [session]);

  // Set up local interval and broadcast channel
  useEffect(() => {
    if (!session || session.state === "completed") {
      setSecondsRemaining(0);
      setCurrentMode("completed");
      return;
    }

    const initial = deriveTimer();
    setSecondsRemaining(initial.remaining);
    setCurrentMode(initial.mode);

    // Realtime Broadcast channel
    const channel = supabase.channel(`group-session:${session.id}`);

    channel
      .on("broadcast", { event: "timer_tick" }, ({ payload }) => {
        if (payload?.remaining !== undefined) {
          setSecondsRemaining(payload.remaining);
        }
        if (payload?.mode) {
          setCurrentMode(payload.mode);
        }
      })
      .subscribe();

    // Starter emits ticks, others listen or derive
    const isStarter = session.started_by === user?.id;

    const interval = setInterval(async () => {
      const current = deriveTimer();
      setSecondsRemaining(current.remaining);
      setCurrentMode(current.mode);

      if (isStarter) {
        channel.send({
          type: "broadcast",
          event: "timer_tick",
          payload: {
            remaining: current.remaining,
            mode: current.mode,
          },
        });
      }

      // Handle transitions
      if (current.mode === "break" && session.state === "work" && isStarter) {
        await supabase
          .from("group_sessions")
          .update({ state: "break" })
          .eq("id", session.id);
      }

      if (current.isDone && !hasTriggeredCompleteRef.current) {
        hasTriggeredCompleteRef.current = true;
        if (isStarter) {
          await supabase
            .from("group_sessions")
            .update({ state: "completed", completed_at: new Date().toISOString() })
            .eq("id", session.id);
        }
        onWorkComplete?.();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [session, user?.id, deriveTimer, onWorkComplete]);

  return {
    secondsRemaining,
    mode: currentMode,
    isCompleted: currentMode === "completed" || session?.state === "completed",
  };
}

export function useStartGroupSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      groupId,
      groupName,
      workDurationMinutes = 25,
      breakDurationMinutes = 5,
    }: {
      groupId: string;
      groupName: string;
      workDurationMinutes?: number;
      breakDurationMinutes?: number;
    }) => {
      if (!user) throw new Error("Please sign in to start a study session");

      const workDurationSeconds = Math.max(60, workDurationMinutes * 60);
      const breakDurationSeconds = Math.max(60, breakDurationMinutes * 60);

      // Check for active session
      const { data: existing } = await supabase
        .from("group_sessions")
        .select("id")
        .eq("group_id", groupId)
        .in("state", ["work", "break"])
        .maybeSingle();

      if (existing) {
        throw new Error("A study session is already active in this group");
      }

      // Create session
      const { data: session, error } = await supabase
        .from("group_sessions")
        .insert({
          group_id: groupId,
          started_by: user.id,
          work_duration: workDurationSeconds,
          break_duration: breakDurationSeconds,
          state: "work",
        })
        .select("id, group_id, started_by, work_duration, break_duration, started_at, state")
        .single();

      if (error) throw error;

      // Join starter as first participant
      await supabase.from("group_session_participants").insert({
        session_id: session.id,
        user_id: user.id,
      });

      // Broadcast session start announcement to online group members
      const channel = supabase.channel(`group-notifications:${groupId}`);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "session_started",
            payload: {
              groupId,
              groupName,
              sessionId: session.id,
              starterName: user.user_metadata?.full_name || "A peer",
            },
          });
        }
      });

      return session;
    },
    onSuccess: (session) => {
      toast.success("Shared Pomodoro session started! 🍅");
      queryClient.invalidateQueries({ queryKey: ["active-group-session", session.group_id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to start session");
    },
  });
}

export function useJoinGroupSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sessionId,
      groupId,
    }: {
      sessionId: string;
      groupId: string;
    }) => {
      if (!user) throw new Error("Please sign in");

      const { error } = await supabase.from("group_session_participants").insert({
        session_id: sessionId,
        user_id: user.id,
      });

      if (error && error.code !== "23505") {
        throw error;
      }

      return { sessionId, groupId };
    },
    onSuccess: (res) => {
      toast.success("Joined the study session! 🚀");
      queryClient.invalidateQueries({ queryKey: ["active-group-session", res.groupId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to join session");
    },
  });
}

export function useCompleteGroupSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sessionId,
      groupId,
      durationMinutes,
    }: {
      sessionId: string;
      groupId: string;
      durationMinutes: number;
    }) => {
      if (!user) return;

      // 1. Mark participant row as completed
      await supabase
        .from("group_session_participants")
        .update({ completed: true })
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      // 2. Award XP via study_events (handled automatically by gamification system)
      const { error: eventErr } = await supabase.from("study_events").insert({
        user_id: user.id,
        event_type: "pomodoro_completed",
        metadata: {
          duration: durationMinutes,
          group_session_id: sessionId,
          group_id: groupId,
        },
      });

      if (eventErr) {
        console.error("Failed to record group pomodoro event:", eventErr);
      }
    },
    onSuccess: () => {
      toast.success("Focus session completed! +25 XP earned 🎉", {
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ["gamification-events"] });
      queryClient.invalidateQueries({ queryKey: ["user-xp"] });
    },
  });
}
