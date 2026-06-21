import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

/**
 * Lazy singleton — opretter først klienten ved første faktiske kald.
 * Undgår at modul-evaluering (fx under Next.js prerendering på Netlify)
 * kaster en fejl hvis env-vars ikke er sat på det tidspunkt.
 */
function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    throw new Error(
      "Supabase env-vars mangler (NEXT_PUBLIC_SUPABASE_URL / " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY). Tjek Netlify Site settings → " +
      "Environment variables, eller .env.local i udvikling.",
    );
  }

  _supabase = createClient(supabaseUrl, supabaseAnon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return _supabase;
}

/**
 * Proxy der bevarer den eksisterende API (`supabase.auth...`, `supabase.from(...)`)
 * uden at kræve at alle kaldsteder ændres til `getSupabaseClient().x`.
 * Klienten oprettes først ved første faktiske property-access, ikke ved import.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    return Reflect.get(client, prop, receiver);
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
