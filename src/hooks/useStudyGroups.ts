import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  invite_code: string | null;
  max_members: number;
  member_count: number;
  created_at: string;
  user_role?: "owner" | "member";
}

export interface GroupMemberProfile {
  id: string;
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    university: string | null;
    course_of_study: string | null;
  } | null;
}

export function useMyStudyGroups() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-study-groups", user?.id],
    queryFn: async (): Promise<StudyGroup[]> => {
      if (!user) return [];

      // Fetch memberships for peer study groups (study_groups with name)
      const { data: memberRows, error: memberErr } = await supabase
        .from("group_members")
        .select(`
          group_id,
          role,
          study_groups (
            id,
            name,
            description,
            owner_id,
            invite_code,
            max_members,
            member_count,
            created_at
          )
        `)
        .eq("user_id", user.id);

      if (memberErr) throw memberErr;
      if (!memberRows) return [];

      const groups: StudyGroup[] = [];
      for (const row of memberRows) {
        const g = row.study_groups as unknown as StudyGroup | null;
        if (g && g.name) {
          groups.push({
            ...g,
            user_role: row.role as "owner" | "member",
          });
        }
      }

      return groups.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!user,
  });
}

export function useStudyGroupDetails(groupId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["study-group-details", groupId],
    queryFn: async () => {
      if (!groupId) return null;

      const { data: group, error: groupErr } = await supabase
        .from("study_groups")
        .select("id, name, description, owner_id, invite_code, max_members, member_count, created_at")
        .eq("id", groupId)
        .single();

      if (groupErr) throw groupErr;

      const { data: members, error: membersErr } = await supabase
        .from("group_members")
        .select(`
          id,
          group_id,
          user_id,
          role,
          joined_at
        `)
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true });

      if (membersErr) throw membersErr;

      // Fetch profiles for all members
      const userIds = (members || []).map((m) => m.user_id);
      const profilesMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null; university: string | null; course_of_study: string | null }> = {};

      if (userIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, university, course_of_study")
          .in("id", userIds);

        if (profileRows) {
          for (const p of profileRows) {
            profilesMap[p.id] = p;
          }
        }
      }

      const populatedMembers: GroupMemberProfile[] = (members || []).map((m) => ({
        id: m.id,
        group_id: m.group_id,
        user_id: m.user_id,
        role: m.role as "owner" | "member",
        joined_at: m.joined_at,
        profiles: profilesMap[m.user_id] || null,
      }));

      const currentUserMember = populatedMembers.find((m) => m.user_id === user?.id);

      return {
        ...group,
        members: populatedMembers,
        currentUserRole: currentUserMember?.role,
        isOwner: group.owner_id === user?.id || currentUserMember?.role === "owner",
      };
    },
    enabled: !!groupId && !!user,
  });
}

export function useGroupByInviteCode(code: string | undefined) {
  return useQuery({
    queryKey: ["study-group-preview", code?.toUpperCase()],
    queryFn: async () => {
      if (!code) return null;
      const cleanCode = code.trim().toUpperCase();

      const { data, error } = await supabase
        .from("study_groups")
        .select("id, name, description, member_count, max_members, invite_code")
        .eq("invite_code", cleanCode)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!code && code.length >= 6,
  });
}

export function useCreateStudyGroup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user) throw new Error("Please sign in to create a group");
      if (!name.trim()) throw new Error("Group name is required");

      const { data, error } = await supabase
        .from("study_groups")
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          owner_id: user.id,
          max_members: 10,
        })
        .select("id, name, description, invite_code, member_count, created_at")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newGroup) => {
      toast.success("Study group created successfully!");
      queryClient.invalidateQueries({ queryKey: ["my-study-groups"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create study group");
    },
  });
}

export function useJoinByInviteCode() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user) throw new Error("Please sign in to join a group");
      const cleanCode = inviteCode.trim().toUpperCase();

      // 1. Look up group
      const { data: group, error: fetchErr } = await supabase
        .from("study_groups")
        .select("id, name, member_count, max_members")
        .eq("invite_code", cleanCode)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!group) throw new Error("No group found with this invite code");

      // 2. Check if already a member
      const { data: existingMember } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingMember) {
        return { group, alreadyMember: true };
      }

      // 3. Check group member cap
      if (group.member_count >= (group.max_members || 10)) {
        throw new Error("This study group is full (maximum 10 members allowed)");
      }

      // 4. Join group
      const { error: joinErr } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "member",
      });

      if (joinErr) {
        if (joinErr.message?.includes("Group is full")) {
          throw new Error("This study group is full (maximum 10 members allowed)");
        }
        throw joinErr;
      }

      return { group, alreadyMember: false };
    },
    onSuccess: (res) => {
      if (res.alreadyMember) {
        toast.info(`You are already a member of ${res.group.name}`);
      } else {
        toast.success(`Joined ${res.group.name}!`);
      }
      queryClient.invalidateQueries({ queryKey: ["my-study-groups"] });
      queryClient.invalidateQueries({ queryKey: ["study-group-details", res.group.id] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to join group");
    },
  });
}

export function useInviteByUsername() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      groupId,
      groupName,
      targetUserId,
    }: {
      groupId: string;
      groupName: string;
      targetUserId: string;
    }) => {
      if (!user) throw new Error("Please sign in");

      // Check current group size
      const { data: group } = await supabase
        .from("study_groups")
        .select("member_count, max_members")
        .eq("id", groupId)
        .single();

      if (group && group.member_count >= (group.max_members || 10)) {
        throw new Error("This study group is full (maximum 10 members allowed)");
      }

      // Insert member
      const { error: insertErr } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: targetUserId,
        role: "member",
      });

      if (insertErr) {
        if (insertErr.code === "23505") {
          throw new Error("Student is already a member of this group");
        }
        if (insertErr.message?.includes("Group is full")) {
          throw new Error("This study group is full (maximum 10 members allowed)");
        }
        throw insertErr;
      }

      // Broadcast notification to invitee channel
      const channel = supabase.channel(`group-notifications:${targetUserId}`);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "group_invite",
            payload: {
              groupId,
              groupName,
              inviterName: user.user_metadata?.full_name || "A fellow student",
            },
          });
        }
      });

      return { success: true };
    },
    onSuccess: (_, vars) => {
      toast.success("Student added to group!");
      queryClient.invalidateQueries({ queryKey: ["study-group-details", vars.groupId] });
      queryClient.invalidateQueries({ queryKey: ["my-study-groups"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to invite student");
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      groupId,
      targetUserId,
    }: {
      groupId: string;
      targetUserId: string;
    }) => {
      if (!user) throw new Error("Please sign in");

      const isSelf = targetUserId === user.id;

      if (isSelf) {
        // Leaving group. Check if leaving user is owner.
        const { data: group } = await supabase
          .from("study_groups")
          .select("owner_id")
          .eq("id", groupId)
          .single();

        if (group && group.owner_id === user.id) {
          // Find next earliest-joined member
          const { data: remainingMembers } = await supabase
            .from("group_members")
            .select("user_id, joined_at")
            .eq("group_id", groupId)
            .neq("user_id", user.id)
            .order("joined_at", { ascending: true });

          if (!remainingMembers || remainingMembers.length === 0) {
            // Last member left: delete the study group and cascade data
            await supabase.from("study_groups").delete().eq("id", groupId);
            return { action: "deleted" as const, groupId };
          }

          // Transfer ownership to the earliest-joined member
          const nextOwner = remainingMembers[0];
          await supabase
            .from("study_groups")
            .update({ owner_id: nextOwner.user_id })
            .eq("id", groupId);

          await supabase
            .from("group_members")
            .update({ role: "owner" })
            .eq("group_id", groupId)
            .eq("user_id", nextOwner.user_id);
        }

        // Delete own membership row
        const { error } = await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", user.id);

        if (error) throw error;
        return { action: "left" as const, groupId };
      } else {
        // Owner removing another member
        const { error } = await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", targetUserId);

        if (error) throw error;
        return { action: "removed" as const, groupId };
      }
    },
    onSuccess: (res) => {
      if (res.action === "deleted") {
        toast.info("Study group closed as all members have left");
      } else if (res.action === "left") {
        toast.success("You have left the study group");
      } else {
        toast.success("Member removed from group");
      }
      queryClient.invalidateQueries({ queryKey: ["my-study-groups"] });
      queryClient.invalidateQueries({ queryKey: ["study-group-details", res.groupId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to remove member");
    },
  });
}

export function useSearchProfiles(searchQuery: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["search-profiles", searchQuery],
    queryFn: async () => {
      const q = searchQuery.trim();
      if (!q || q.length < 2) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, university, course_of_study")
        .neq("id", user?.id || "")
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.trim().length >= 2,
  });
}
