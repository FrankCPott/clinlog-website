import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser Supabase client (anon key, RLS enforced). */
export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ── Domain types ──────────────────────────────────────────────────────────────

export type NoteType =
  | "stuegang"
  | "indlaeggelse"
  | "kontinuation"
  | "mat-kald";

export interface SupabaseNote {
  id:          string;
  user_id:     string;
  created_at:  string;
  updated_at:  string;
  app_variant: string;
  note_type:   NoteType;
  sections:    Record<string, string>;
  expires_at:  string;
}
