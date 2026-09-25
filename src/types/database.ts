/**
 * Hand-written stand-in matching supabase/migrations/0001_init.sql (+ 0003_nutrition_exercise.sql).
 * Once a real Supabase project exists, regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          owner_id: string;
          is_self: boolean;
          display_name: string;
          date_of_birth: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          is_self?: boolean;
          display_name: string;
          date_of_birth?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      medications: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          dosage: string;
          instructions: string | null;
          recurrence_rule: Record<string, unknown>;
          quantity_on_hand: number | null;
          refill_threshold: number | null;
          start_date: string;
          end_date: string | null;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          dosage: string;
          instructions?: string | null;
          recurrence_rule: Record<string, unknown>;
          quantity_on_hand?: number | null;
          refill_threshold?: number | null;
          start_date: string;
          end_date?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["medications"]["Insert"]>;
        Relationships: [];
      };
      dose_logs: {
        Row: {
          id: string;
          medication_id: string;
          scheduled_at: string;
          status: "pending" | "taken" | "skipped" | "snoozed";
          logged_at: string | null;
        };
        Insert: {
          id?: string;
          medication_id: string;
          scheduled_at: string;
          status?: "pending" | "taken" | "skipped" | "snoozed";
          logged_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["dose_logs"]["Insert"]>;
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          profile_id: string;
          provider_name: string;
          specialty: string | null;
          location: string | null;
          scheduled_at: string;
          pre_visit_notes: string | null;
          post_visit_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          provider_name: string;
          specialty?: string | null;
          location?: string | null;
          scheduled_at: string;
          pre_visit_notes?: string | null;
          post_visit_notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
        Relationships: [];
      };
      food_entries: {
        Row: {
          id: string;
          profile_id: string;
          name: string;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "other";
          eaten_at: string;
          quantity: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          name: string;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "other";
          eaten_at: string;
          quantity?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["food_entries"]["Insert"]>;
        Relationships: [];
      };
      exercise_entries: {
        Row: {
          id: string;
          profile_id: string;
          exercise_type:
            | "walking"
            | "running"
            | "cycling"
            | "gym"
            | "strength"
            | "yoga"
            | "stretching"
            | "swimming"
            | "sports"
            | "other";
          name: string | null;
          started_at: string;
          duration_minutes: number;
          intensity: "light" | "moderate" | "vigorous" | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          exercise_type: Database["public"]["Tables"]["exercise_entries"]["Row"]["exercise_type"];
          name?: string | null;
          started_at: string;
          duration_minutes: number;
          intensity?: "light" | "moderate" | "vigorous" | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exercise_entries"]["Insert"]>;
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          source_type: "medication" | "appointment";
          source_id: string;
          offset_minutes: number;
          escalation_enabled: boolean;
        };
        Insert: {
          id?: string;
          source_type: "medication" | "appointment";
          source_id: string;
          offset_minutes: number;
          escalation_enabled?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["reminders"]["Insert"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          user_id: string;
          status: "trial" | "active" | "expired" | "canceled";
          current_period_end: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          status: "trial" | "active" | "expired" | "canceled";
          current_period_end?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
