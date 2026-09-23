import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useGroupNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Listen on personal notification channel for direct invites
    const userChannel = supabase
      .channel(`group-notifications:${user.id}`)
      .on("broadcast", { event: "group_invite" }, ({ payload }) => {
        if (payload?.groupName) {
          toast.info(`${payload.inviterName || "A student"} added you to ${payload.groupName}!`, {
            action: {
              label: "Open Group",
              onClick: () => {
                navigate(`/community?tab=study-groups&groupId=${payload.groupId}`);
              },
            },
            duration: 8000,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
    };
  }, [user, navigate]);
}
