import { supabase } from "@/lib/supabase";

/**
 * Indsætter en ny SP-kontekst-række i pending_sp_context-køen (FIFO).
 *
 * Semantik: indsætter altid en ny 'pending'-række — ingen DELETE.
 * Forbruges atomisk af appen via consume_sp_context() RPC.
 * Slettes automatisk efter 24 timer via pg_cron "purge-expired-sp-context".
 *
 * Gem-regler (ufravigelige):
 *   • sp_data: kun den parsede/formaterede tekst (aldrig rå SP-input)
 *   • bed_label: valgfrit, ikke-personhenførbart sengepladslabel
 *   • Ingen CPR, patientnavn eller fødselsdato lagres.
 */
export async function saveSpNote(
  parsedNote: string,
  bedLabel?: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Ikke logget ind");

  const { error } = await supabase
    .from("pending_sp_context")
    .insert({
      user_id:   user.id,
      sp_data:   parsedNote,
      bed_label: bedLabel ?? null,
    });

  if (error) throw new Error(error.message);
}
