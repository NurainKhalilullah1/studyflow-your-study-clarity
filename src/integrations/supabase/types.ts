export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_versions: {
        Row: {
          created_at: string
          download_url: string
          id: string
          is_mandatory: boolean | null
          release_notes: string | null
          version_code: number
          version_name: string
        }
        Insert: {
          created_at?: string
          download_url: string
          id?: string
          is_mandatory?: boolean | null
          release_notes?: string | null
          version_code: number
          version_name: string
        }
        Update: {
          created_at?: string
          download_url?: string
          id?: string
          is_mandatory?: boolean | null
          release_notes?: string | null
          version_code?: number
          version_name?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          course_id: string | null
          course_name: string | null
          created_at: string
          due_date: string
          id: string
          priority: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          due_date: string
          id?: string
          priority?: string | null
          status?: string
          title: string
          type?: string
          user_id?: string
        }
        Update: {
          course_id?: string | null
          course_name?: string | null
          created_at?: string
          due_date?: string
          id?: string
          priority?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      auth_verification_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          max_attempts: number
          purpose: string
          used: boolean
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          max_attempts?: number
          purpose?: string
          used?: boolean
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          purpose?: string
          used?: boolean
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          category: string
          comment_count: number
          content: string
          created_at: string
          group_id: string | null
          id: string
          upvote_count: number
          user_id: string
        }
        Insert: {
          category?: string
          comment_count?: number
          content: string
          created_at?: string
          group_id?: string | null
          id?: string
          upvote_count?: number
          user_id: string
        }
        Update: {
          category?: string
          comment_count?: number
          content?: string
          created_at?: string
          group_id?: string | null
          id?: string
          upvote_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_upvotes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_upvotes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          context_file_path: string | null
          context_type: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_file_path?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_file_path?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          color: string | null
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          id?: string
          title: string
          user_id?: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          cta_text: string
          cta_url: string
          header_bg: string
          header_subtitle: string
          header_title: string
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          body: string
          cta_text?: string
          cta_url?: string
          header_bg: string
          header_subtitle?: string
          header_title: string
          id: string
          label: string
          updated_at?: string
        }
        Update: {
          body?: string
          cta_text?: string
          cta_url?: string
          header_bg?: string
          header_subtitle?: string
          header_title?: string
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          deck_name: string | null
          ease_factor: number | null
          front: string
          id: string
          interval_days: number | null
          last_reviewed_at: string | null
          next_review_at: string | null
          repetitions: number | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          deck_name?: string | null
          ease_factor?: number | null
          front: string
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          repetitions?: number | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          deck_name?: string | null
          ease_factor?: number | null
          front?: string
          id?: string
          interval_days?: number | null
          last_reviewed_at?: string | null
          next_review_at?: string | null
          repetitions?: number | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      league_history: {
        Row: {
          created_at: string | null
          id: string
          league: number
          outcome: string | null
          rank_in_league: number | null
          user_id: string
          week_start: string
          weekly_xp: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          league: number
          outcome?: string | null
          rank_in_league?: number | null
          user_id: string
          week_start: string
          weekly_xp?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          league?: number
          outcome?: string | null
          rank_in_league?: number | null
          user_id?: string
          week_start?: string
          weekly_xp?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      nigerian_universities: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          course_of_study: string | null
          created_at: string
          email: string | null
          email_opt_out: boolean
          full_name: string | null
          id: string
          last_verified_at: string | null
          level: string | null
          storage_limit_bytes: number
          storage_used_bytes: number
          subscription_tier: string
          university: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          course_of_study?: string | null
          created_at?: string
          email?: string | null
          email_opt_out?: boolean
          full_name?: string | null
          id: string
          last_verified_at?: string | null
          level?: string | null
          storage_limit_bytes?: number
          storage_used_bytes?: number
          subscription_tier?: string
          university?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          course_of_study?: string | null
          created_at?: string
          email?: string | null
          email_opt_out?: boolean
          full_name?: string | null
          id?: string
          last_verified_at?: string | null
          level?: string | null
          storage_limit_bytes?: number
          storage_used_bytes?: number
          subscription_tier?: string
          university?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          id: string
          last_seen: string | null
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_seen?: string | null
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_seen?: string | null
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          explanation: string | null
          id: string
          is_flagged: boolean
          options: Json
          question: string
          question_number: number
          quiz_session_id: string
          user_answer: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string
          explanation?: string | null
          id?: string
          is_flagged?: boolean
          options: Json
          question: string
          question_number: number
          quiz_session_id: string
          user_answer?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string
          explanation?: string | null
          id?: string
          is_flagged?: boolean
          options?: Json
          question?: string
          question_number?: number
          quiz_session_id?: string
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          completed_at: string | null
          course_id: string | null
          created_at: string
          document_content: string | null
          document_name: string | null
          id: string
          is_shared: boolean | null
          num_questions: number
          score: number | null
          started_at: string | null
          time_limit_minutes: number
          total_questions: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          document_content?: string | null
          document_name?: string | null
          id?: string
          is_shared?: boolean | null
          num_questions?: number
          score?: number | null
          started_at?: string | null
          time_limit_minutes?: number
          total_questions?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          document_content?: string | null
          document_name?: string | null
          id?: string
          is_shared?: boolean | null
          num_questions?: number
          score?: number | null
          started_at?: string | null
          time_limit_minutes?: number
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      study_events: {
        Row: {
          course_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          course_of_study: string
          created_at: string
          id: string
          level: string | null
          member_count: number
          university: string
        }
        Insert: {
          course_of_study: string
          created_at?: string
          id?: string
          level?: string | null
          member_count?: number
          university: string
        }
        Update: {
          course_of_study?: string
          created_at?: string
          id?: string
          level?: string | null
          member_count?: number
          university?: string
        }
        Relationships: []
      }
      university_courses: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      upgrade_requests: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          payment_reference: string | null
          receipt_url: string | null
          requested_tier: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_reference?: string | null
          receipt_url?: string | null
          requested_tier: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_reference?: string | null
          receipt_url?: string | null
          requested_tier?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_files: {
        Row: {
          created_at: string
          extraction_status: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          text_content: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          extraction_status?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          text_content?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          extraction_status?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          text_content?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          default_quiz_questions: number
          id: string
          pomodoro_duration: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_quiz_questions?: number
          id?: string
          pomodoro_duration?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_quiz_questions?: number
          id?: string
          pomodoro_duration?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          achievements: Json
          created_at: string
          current_league: number
          display_name: string | null
          id: string
          last_calculated_at: string
          level: number
          total_xp: number
          updated_at: string
          user_id: string
          week_start: string
          weekly_xp: number
        }
        Insert: {
          achievements?: Json
          created_at?: string
          current_league?: number
          display_name?: string | null
          id?: string
          last_calculated_at?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
          week_start?: string
          weekly_xp?: number
        }
        Update: {
          achievements?: Json
          created_at?: string
          current_league?: number
          display_name?: string | null
          id?: string
          last_calculated_at?: string
          level?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
          week_start?: string
          weekly_xp?: number
        }
        Relationships: []
      }
      weekly_goals: {
        Row: {
          created_at: string
          flashcard_target: number
          id: string
          quiz_target: number
          study_minutes_target: number
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          flashcard_target?: number
          id?: string
          quiz_target?: number
          study_minutes_target?: number
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          flashcard_target?: number
          id?: string
          quiz_target?: number
          study_minutes_target?: number
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_own_account: { Args: never; Returns: undefined }
      get_leaderboard: {
        Args: never
        Returns: {
          avatar_url: string
          level: number
          name: string
          total_xp: number
          user_id: string
        }[]
      }
      get_league_leaderboard: {
        Args: { p_league: number }
        Returns: {
          avatar_url: string
          current_league: number
          level: number
          name: string
          user_id: string
          weekly_xp: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_league_week: { Args: never; Returns: undefined }
      trigger_study_tip_notification: { Args: never; Returns: undefined }
      upsert_user_group:
        | {
            Args: { p_course_of_study: string; p_university: string }
            Returns: undefined
          }
        | {
            Args: {
              p_course_of_study: string
              p_level: string
              p_university: string
            }
            Returns: undefined
          }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

