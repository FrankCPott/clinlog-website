import { supabase } from "@/lib/supabase";

export interface PendingSpRow {
  id:         string;
  bed_label:  string | null;
  sp_data:    string;
  created_at: string;
}

/**
 * Henter alle ventende SP-kontekst-rækker for den autentificerede bruger (FIFO-rækkefølge).
 * Returnerer tom array hvis køen er tom.
 */
export async function fetchPendingQueue(): Promise<PendingSpRow[]> {
  const { data, error } = await supabase
    .from("pending_sp_context")
    .select("id, bed_label, sp_data, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PendingSpRow[];
}

/**
 * Sletter en ventende SP-kontekst-række (bruger annullerer inden appen henter den).
 * Kun pending-rækker kan slettes — consumed-rækker ignoreres (safety-tjek i DB).
 */
export async function deletePendingRow(id: string): Promise<void> {
  const { error } = await supabase
    .from("pending_sp_context")
    .delete()
    .eq("id", id)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
}
