-- Migration: Study groups and collaborative rooms
-- Adds support for student-created peer study groups, group feeds, and shared Pomodoro sessions.

-- 1. Alter study_groups to support peer-created groups alongside university cohorts
ALTER TABLE public.study_groups
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS invite_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS max_members integer DEFAULT 10;

ALTER TABLE public.study_groups ALTER COLUMN university DROP NOT NULL;
ALTER TABLE public.study_groups ALTER COLUMN course_of_study DROP NOT NULL;
ALTER TABLE public.study_groups ALTER COLUMN member_count SET DEFAULT 1;

-- 2. Invite code generator function
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result text := '';
  i integer;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.study_groups WHERE invite_code = result);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger to auto-generate invite code on peer group insert
CREATE OR REPLACE FUNCTION public.set_study_group_invite_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.name IS NOT NULL AND NEW.invite_code IS NULL THEN
    NEW.invite_code := public.generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_study_group_invite_code ON public.study_groups;
CREATE TRIGGER trigger_set_study_group_invite_code
  BEFORE INSERT ON public.study_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.set_study_group_invite_code();

-- 3. Create group_members table for peer study groups
CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);

-- Auto add owner as member when group is created
CREATE OR REPLACE FUNCTION public.after_study_group_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_after_study_group_insert ON public.study_groups;
CREATE TRIGGER trigger_after_study_group_insert
  AFTER INSERT ON public.study_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.after_study_group_insert();

-- Sync member count on study_groups
CREATE OR REPLACE FUNCTION public.sync_study_group_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_group_id := NEW.group_id;
  ELSE
    v_group_id := OLD.group_id;
  END IF;

  UPDATE public.study_groups
  SET member_count = (
    SELECT count(*)::integer FROM public.group_members WHERE group_id = v_group_id
  )
  WHERE id = v_group_id AND name IS NOT NULL;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_group_member_count ON public.group_members;
CREATE TRIGGER trigger_sync_group_member_count
  AFTER INSERT OR DELETE ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_study_group_member_count();

-- 4. Enforce 10 member cap
CREATE OR REPLACE FUNCTION public.check_group_member_cap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_count integer;
  v_max_members integer;
BEGIN
  SELECT count(*)::integer INTO v_current_count
  FROM public.group_members
  WHERE group_id = NEW.group_id;

  SELECT coalesce(max_members, 10) INTO v_max_members
  FROM public.study_groups
  WHERE id = NEW.group_id;

  IF v_current_count >= v_max_members THEN
    RAISE EXCEPTION 'Group is full (maximum % members allowed)', v_max_members;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_group_member_cap ON public.group_members;
CREATE TRIGGER trigger_check_group_member_cap
  BEFORE INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.check_group_member_cap();

-- 5. Create group_feed_posts table
CREATE TABLE IF NOT EXISTS public.group_feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  post_type text NOT NULL CHECK (post_type IN ('document', 'quiz_result', 'note')),
  reference_id uuid,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_feed_posts_group_id ON public.group_feed_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_group_feed_posts_created_at ON public.group_feed_posts(created_at DESC);

-- 6. Create group_sessions table
CREATE TABLE IF NOT EXISTS public.group_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  started_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  work_duration integer NOT NULL DEFAULT 1500,
  break_duration integer NOT NULL DEFAULT 300,
  started_at timestamptz NOT NULL DEFAULT now(),
  state text NOT NULL CHECK (state IN ('work', 'break', 'completed')) DEFAULT 'work',
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_group_sessions_group_id ON public.group_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_sessions_state ON public.group_sessions(state);

-- 7. Create group_session_participants table
CREATE TABLE IF NOT EXISTS public.group_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.group_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  completed boolean NOT NULL DEFAULT false,
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_session_participants_session_id ON public.group_session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_group_session_participants_user_id ON public.group_session_participants(user_id);

-- 8. Enable Row Level Security
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_session_participants ENABLE ROW LEVEL SECURITY;

-- Additional policies for study_groups
CREATE POLICY "Public preview of study groups by invite code"
  ON public.study_groups FOR SELECT
  USING (invite_code IS NOT NULL);

CREATE POLICY "Authenticated users can create study groups"
  ON public.study_groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = owner_id);

CREATE POLICY "Group owners can update their groups"
  ON public.study_groups FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Group owners can delete their groups"
  ON public.study_groups FOR DELETE
  USING (auth.uid() = owner_id);

-- Policies for group_members
CREATE POLICY "Authenticated users can view group members"
  ON public.group_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can join groups"
  ON public.group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave or owners can remove members"
  ON public.group_members FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.study_groups
      WHERE id = group_members.group_id AND owner_id = auth.uid()
    )
  );

-- Policies for group_feed_posts
CREATE POLICY "Members can view group feed posts"
  ON public.group_feed_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_feed_posts.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert group feed posts"
  ON public.group_feed_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_feed_posts.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authors or group owners can delete group feed posts"
  ON public.group_feed_posts FOR DELETE
  USING (
    auth.uid() = author_id OR
    EXISTS (
      SELECT 1 FROM public.study_groups
      WHERE id = group_feed_posts.group_id AND owner_id = auth.uid()
    )
  );

-- Policies for group_sessions
CREATE POLICY "Members can view group sessions"
  ON public.group_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_sessions.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can start group sessions"
  ON public.group_sessions FOR INSERT
  WITH CHECK (
    auth.uid() = started_by AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_sessions.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update group sessions"
  ON public.group_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_sessions.group_id
        AND group_members.user_id = auth.uid()
    )
  );

-- Policies for group_session_participants
CREATE POLICY "Members can view session participants"
  ON public.group_session_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_sessions s
      JOIN public.group_members m ON m.group_id = s.group_id
      WHERE s.id = group_session_participants.session_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can join as participants"
  ON public.group_session_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants can update their participant status"
  ON public.group_session_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- 9. Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_feed_posts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_sessions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_session_participants;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
