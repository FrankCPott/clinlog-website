"use client";

/**
 * SpPasteView — SP smartphrase paste & parse interface.
 *
 * Workflow:
 *   SP (.allpatientdata) → Ctrl+A → Ctrl+X → Ctrl+V her
 *   → parseSPSmartphrase() → kompakt stuegangsnotat
 *   → gem i Supabase (pending_sp_context FIFO-kø) → tilgængeligt i app
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { parseSPSmartphrase, type ParseOptions } from "@/lib/spParser/spParser";
import { saveSpNote } from "@/lib/spParser/saveSpNote";
import { fetchPendingQueue, deletePendingRow, type PendingSpRow } from "@/lib/spParser/spQueue";

type Status = "idle" | "parsed" | "saving" | "saved" | "error";

export default function SpPasteView() {
  const [parsedNote, setParsedNote]           = useState("");
  const [status, setStatus]                   = useState<Status>("idle");
  const [errorMsg, setErrorMsg]               = useState("");
  const [includeMedications, setIncludeMedications] = useState(true);
  const [bedLabel, setBedLabel]               = useState("");
  const textareaRef                           = useRef<HTMLTextAreaElement>(null);
  const rawRef                                = useRef<string>("");

  // ── Kø-tilstand (FASE 5B) ─────────────────────────────────────────────────
  const [queue, setQueue]       = useState<PendingSpRow[]>([]);
  const [queueErr, setQueueErr] = useState("");

  const loadQueue = useCallback(async () => {
    try {
      const rows = await fetchPendingQueue();
      setQueue(rows);
      setQueueErr("");
    } catch (e) {
      setQueueErr(e instanceof Error ? e.message : "Kunne ikke hente kø");
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  // ── Re-parse when checkbox changes ────────────────────────────────────────
  useEffect(() => {
    if (!rawRef.current) return;
    const opts: ParseOptions = { includeMedications };
    const result = parseSPSmartphrase(rawRef.current, opts);
    setParsedNote(result);
    if (status === "saved" || status === "saving") setStatus("parsed");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeMedications]);

  // ── Paste handler ─────────────────────────────────────────────────────────
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const raw = e.clipboardData.getData("text/plain");
    if (!raw.trim()) return;

    // Nulstil textarea-DOM så næste Ctrl+V trigger onPaste igen
    e.currentTarget.value = "";

    rawRef.current = raw;

    try {
      const result = parseSPSmartphrase(raw, { includeMedications });
      if (!result.trim()) {
        setErrorMsg("Ingen data fundet for aktuel dato. Tjek at teksten er kopieret korrekt fra SP.");
        setStatus("error");
        return;
      }
      setParsedNote(result);
      setStatus("parsed");

      // Auto-save
      setStatus("saving");
      await saveSpNote(result, bedLabel.trim() || undefined);
      setStatus("saved");
      loadQueue();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Ukendt fejl");
      setStatus("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeMedications, bedLabel]);

  // ── Manual save (retry) ───────────────────────────────────────────────────
  const handleManualSave = async () => {
    if (!parsedNote.trim()) return;
    setStatus("saving");
    try {
      await saveSpNote(parsedNote, bedLabel.trim() || undefined);
      setStatus("saved");
      loadQueue();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Ukendt fejl");
      setStatus("error");
    }
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!parsedNote) return;
    await navigator.clipboard.writeText(parsedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    rawRef.current = "";
    setParsedNote("");
    setStatus("idle");
    setErrorMsg("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // ── Status badge ──────────────────────────────────────────────────────────
  const StatusBadge = () => {
    if (status === "idle")   return <span className="text-xs text-slate-400">Afventer indsætning</span>;
    if (status === "parsed") return <span className="text-xs text-slate-500">Parset — gemmer…</span>;
    if (status === "saving") return <span className="text-xs text-slate-400">Gemmer…</span>;
    if (status === "saved")  return <span className="text-xs text-green-600 font-medium">✓ Gemt i app</span>;
    if (status === "error")  return <span className="text-xs text-red-500">⚠ {errorMsg}</span>;
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6 max-w-3xl">

      {/* ── Header ── */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-1">SP-data import</h2>
        <p className="text-sm text-slate-500">
          Gå til SP → åbn notatvindue → tryk{" "}
          <kbd className="px-1 py-0.5 text-xs bg-slate-100 border border-slate-200 rounded">Ctrl+A</kbd>{" "}
          <kbd className="px-1 py-0.5 text-xs bg-slate-100 border border-slate-200 rounded">Ctrl+X</kbd>{" "}
          → tryk{" "}
          <kbd className="px-1 py-0.5 text-xs bg-slate-100 border border-slate-200 rounded">Ctrl+V</kbd>{" "}
          i feltet herunder
        </p>
      </div>

      {/* ── Options ── */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <input
            id="chk-med"
            type="checkbox"
            checked={includeMedications}
            onChange={e => setIncludeMedications(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand accent-brand"
          />
          <label htmlFor="chk-med" className="text-sm text-slate-600 select-none cursor-pointer">
            Inkludér medicinstatus i output
          </label>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="bed-label" className="text-sm text-slate-600 whitespace-nowrap">
            Sengelabel
          </label>
          <input
            id="bed-label"
            type="text"
            value={bedLabel}
            onChange={e => setBedLabel(e.target.value)}
            placeholder="fx 4B"
            maxLength={20}
            className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1
                       text-sm text-slate-800 placeholder-slate-300
                       focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
          />
        </div>
      </div>

      {/* ── Paste zone (hidden when note is parsed) ── */}
      {status === "idle" || status === "error" ? (
        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">
            Indsæt SP-data her
          </label>
          <textarea
            ref={textareaRef}
            autoFocus
            onPaste={handlePaste}
            readOnly
            placeholder="Tryk Ctrl+V for at indsætte data fra SP…"
            className="w-full h-32 rounded-xl border border-dashed border-slate-300 bg-white
                       px-4 py-3 text-sm text-slate-400 focus:outline-none
                       focus:border-brand focus:ring-1 focus:ring-brand
                       resize-none cursor-text"
          />
          {status === "error" && (
            <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
          )}
        </div>
      ) : null}

      {/* ── Parsed output ── */}
      {parsedNote && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Parset stuegangsnotat
            </label>
            <div className="flex items-center gap-2">
              <StatusBadge />
              <button
                onClick={handleCopy}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  copied
                    ? "border-green-200 bg-green-50 text-green-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand"
                }`}
              >
                {copied ? "✓ Kopieret" : "📋 Kopier"}
              </button>
              {status === "error" && (
                <button
                  onClick={handleManualSave}
                  className="text-xs px-2.5 py-1 rounded-lg border border-brand text-brand hover:bg-brand hover:text-white transition-colors"
                >
                  Gem nu
                </button>
              )}
              <button
                onClick={handleReset}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
              >
                Ny indsætning
              </button>
            </div>
          </div>

          <textarea
            value={parsedNote}
            onChange={e => { setParsedNote(e.target.value); setStatus("parsed"); }}
            className="w-full rounded-xl border border-slate-200 bg-white
                       px-4 py-3 text-sm text-slate-800 leading-relaxed
                       focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand
                       resize-none font-mono"
            rows={Math.max(10, parsedNote.split("\n").length + 2)}
            spellCheck={false}
          />
          <p className="mt-2 text-xs text-slate-400">
            Du kan redigere teksten — tryk "Gem nu" for at opdatere i appen.
          </p>
        </div>
      )}

      {/* ── Info box when idle ── */}
      {status === "idle" && (
        <div className="mt-6 rounded-xl bg-blue-50 border border-blue-100 px-5 py-4">
          <p className="text-xs font-semibold text-blue-700 mb-2">Sådan virker det</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Åbn det eksisterende SP-stuegangsnotat i <strong>redigeringstilstand</strong></li>
            <li>Tryk <strong>Ctrl+A</strong> → <strong>Ctrl+X</strong> (marker og klip al tekst)</li>
            <li>Klik i feltet herover og tryk <strong>Ctrl+V</strong></li>
            <li>Parseren filtrerer data fra i dag og formaterer notatet automatisk</li>
            <li>Notatet gemmes og er tilgængeligt i ClinLog-appen under diktering</li>
          </ol>
        </div>
      )}

      {/* ── Kø-visning (FASE 5B) ── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Ventende i app-kø
            {queue.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5
                               rounded-full bg-brand text-white text-[10px] font-bold">
                {queue.length}
              </span>
            )}
          </h3>
          <button
            onClick={loadQueue}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
            title="Opdater kø"
          >
            ↺ Opdater
          </button>
        </div>

        {queueErr && (
          <p className="text-xs text-red-500 mb-2">{queueErr}</p>
        )}

        {queue.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Ingen ventende kontekst — næste diktering starter uden SP-data.
          </p>
        ) : (
          <ul className="space-y-2">
            {queue.map((row, idx) => {
              const ts = new Date(row.created_at);
              const timeStr = ts.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
              const preview = row.sp_data.slice(0, 120).replace(/\n/g, " ");

              return (
                <li
                  key={row.id}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3
                             flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {idx === 0 && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide
                                         text-brand border border-brand/30 rounded px-1.5 py-0.5">
                          Næste
                        </span>
                      )}
                      {row.bed_label && (
                        <span className="text-xs font-medium text-slate-700">
                          🛏 {row.bed_label}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{timeStr}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate font-mono">
                      {preview}{row.sp_data.length > 120 ? "…" : ""}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await deletePendingRow(row.id);
                        setQueue(q => q.filter(r => r.id !== row.id));
                      } catch (e) {
                        setQueueErr(e instanceof Error ? e.message : "Slet fejlede");
                      }
                    }}
                    className="shrink-0 text-xs text-slate-400 hover:text-red-500
                               transition-colors px-2 py-1 rounded-lg
                               hover:bg-red-50 border border-transparent hover:border-red-100"
                    title="Annullér denne kontekst"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
