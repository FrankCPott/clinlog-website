"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SupabaseNote, NoteType } from "@/lib/supabase";
import { NOTE_TYPE_FIELDS, NOTE_TYPE_LABELS, isBlank } from "@/lib/noteTypes";
import type { FieldDef } from "@/lib/noteTypes";
import { ensureHtml, htmlToPlain } from "@/lib/textToHtml";
import SectionEditor from "./SectionEditor";
import CombinedNoteEditor from "./CombinedNoteEditor";

interface Props { userId: string; }

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build an HTML string for the combined editor.
 * Each section is preceded by a bold-heading paragraph used as an anchor.
 * Example:  <p><strong>AKTUELT</strong></p><p>Patient indlagt…</p>
 */
function buildCombined(fields: FieldDef[], sections: Record<string, string>): string {
  return fields.map(f => {
    const heading = `<p><strong>${f.label.toUpperCase()}</strong></p>`;
    const body    = ensureHtml(sections[f.key] ?? "");
    // If body is empty Tiptap HTML ("<p></p>") or blank, emit a single empty paragraph
    return heading + (body || "<p></p>");
  }).join("");
}

/**
 * Split the combined HTML back into per-section records.
 * Anchors on  <p><strong>LABEL</strong></p>  markers.
 */
function splitCombined(fields: FieldDef[], html: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (let i = 0; i < fields.length; i++) {
    const f       = fields[i];
    const heading = `<p><strong>${f.label.toUpperCase()}</strong></p>`;
    const hIdx    = html.indexOf(heading);
    if (hIdx === -1) { result[f.key] = ""; continue; }

    const bodyStart = hIdx + heading.length;
    let   bodyEnd   = html.length;

    for (let j = i + 1; j < fields.length; j++) {
      const nextH   = `<p><strong>${fields[j].label.toUpperCase()}</strong></p>`;
      const nextIdx = html.indexOf(nextH, bodyStart);
      if (nextIdx !== -1) { bodyEnd = nextIdx; break; }
    }
    result[f.key] = html.slice(bodyStart, bodyEnd).trim();
  }
  return result;
}

function notePreview(note: SupabaseNote): string {
  const fields = NOTE_TYPE_FIELDS[note.note_type] ?? [];
  for (const f of fields) {
    const v = (note.sections[f.key] ?? "").trim();
    if (v && !isBlank(v)) {
      // Strip HTML tags before building preview text
      const plain = htmlToPlain(v);
      const lines = plain.split("\n").filter(l => l.trim()).slice(0, 2);
      const preview = lines.join(" · ");
      return preview.length > 90 ? preview.slice(0, 90) + "…" : preview;
    }
  }
  return "—";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
}

function formatExpiry(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Udløbet";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h} t ${m} min` : `${m} min`;
}

// ── Clipboard ──────────────────────────────────────────────────────────────────
async function copyWholeNote(fields: FieldDef[], sections: Record<string, string>): Promise<void> {
  const nonBlank = fields.filter(f => !isBlank(sections[f.key]));
  if (nonBlank.length === 0) return;
  const htmlSections = nonBlank
    .map(f =>
      `<p><strong>${f.label.toUpperCase()}</strong></p>` +
      // ensureHtml: sections may be plain text (old notes) or HTML (new notes)
      `<div style="margin-left:1.5em">${ensureHtml(sections[f.key] ?? "")}</div>`
    ).join("\n");
  const plain = nonBlank
    .map(f => `${f.label.toUpperCase()}\n${htmlToPlain(sections[f.key] ?? "")}`)
    .join("\n\n");
  try {
    await navigator.clipboard.write([new ClipboardItem({
      "text/html":  new Blob([`<div>${htmlSections}</div>`], { type: "text/html" }),
      "text/plain": new Blob([plain],                        { type: "text/plain" }),
    })]);
  } catch { await navigator.clipboard.writeText(plain); }
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function NoteViewer({ userId }: Props) {
  const [allNotes, setAllNotes]         = useState<SupabaseNote[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [loadState, setLoadState]       = useState<"loading" | "ready" | "empty" | "error">("loading");

  // Editing state for the selected note
  const [sections, setSections]         = useState<Record<string, string>>({});
  const [combinedText, setCombinedText] = useState("");
  const [savedSections, setSavedSections] = useState<Record<string, string>>({});

  // UI state
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState<string | null>(null);
  const [noteCopied, setNoteCopied] = useState(false);

  // Refs to avoid stale closures in timers
  const sectionsRef     = useRef(sections);
  const savedSecRef     = useRef(savedSections);
  const selectedIdRef   = useRef(selectedId);
  useEffect(() => { sectionsRef.current   = sections;      }, [sections]);
  useEffect(() => { savedSecRef.current   = savedSections; }, [savedSections]);
  useEffect(() => { selectedIdRef.current = selectedId;    }, [selectedId]);

  const saveMsgTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived
  const selectedNote = allNotes.find(n => n.id === selectedId) ?? null;
  const isDirty = selectedNote
    ? JSON.stringify(sections) !== JSON.stringify(savedSections)
    : false;

  // ── fetchList ──────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .eq("app_variant", "clinlog_icu")
      .gt("expires_at", new Date().toISOString())
      .order("updated_at", { ascending: false });

    if (error) { setLoadState("error"); return; }
    const notes = (data ?? []) as SupabaseNote[];
    setAllNotes(notes);
    setLoadState(notes.length === 0 ? "empty" : "ready");

    // Auto-select latest note if nothing is selected yet
    setSelectedId(prev => (prev === null && notes.length > 0) ? notes[0].id : prev);
  }, [userId]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel("notes-list-rt")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "notes",
        filter: `user_id=eq.${userId}`,
      }, () => fetchList())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, fetchList]);

  // ── Init editing state when selected note changes ──────────────────────────
  const prevSelectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedId === prevSelectedIdRef.current) return;
    prevSelectedIdRef.current = selectedId;
    if (!selectedId) return;

    const note = allNotes.find(n => n.id === selectedId);
    if (!note) return;

    setSections(note.sections);
    setSavedSections(note.sections);
    if (note.note_type !== "stuegang") {
      const fields = NOTE_TYPE_FIELDS[note.note_type] ?? [];
      setCombinedText(buildCombined(fields, note.sections));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]); // allNotes intentionally omitted — only reset on ID change

  // ── Save ───────────────────────────────────────────────────────────────────
  const doSave = useCallback(async (silent = false) => {
    const id  = selectedIdRef.current;
    const sec = sectionsRef.current;
    const saved = savedSecRef.current;
    if (!id || JSON.stringify(sec) === JSON.stringify(saved)) return;

    setSaving(true);
    const { error } = await supabase
      .from("notes").update({ sections: sec })
      .eq("id", id).eq("user_id", userId);
    setSaving(false);

    if (!error) {
      setSavedSections({ ...sec });
      if (!silent) {
        if (saveMsgTimer.current) clearTimeout(saveMsgTimer.current);
        setSaveMsg("Gemt ✓");
        saveMsgTimer.current = setTimeout(() => setSaveMsg(null), 3000);
      }
      // fetchList will refresh via Realtime trigger — no need to call here
    } else if (!silent) {
      setSaveMsg("Kunne ikke gemme");
    }
  }, [userId]);

  const handleManualSave = () => doSave(false);

  // ── Auto-save: debounced 10 s after last keystroke ─────────────────────────
  useEffect(() => {
    if (!selectedId || !isDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => doSave(true), 10_000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, selectedId]); // doSave uses refs — intentionally stable

  // ── Editing handlers ───────────────────────────────────────────────────────
  const handleSectionChange = (key: string, value: string) => {
    setSections(prev => ({ ...prev, [key]: value }));
  };

  const handleCombinedChange = (text: string) => {
    setCombinedText(text);
    if (!selectedNote) return;
    const fields = NOTE_TYPE_FIELDS[selectedNote.note_type] ?? [];
    setSections(splitCombined(fields, text));
  };

  // ── Copy all ───────────────────────────────────────────────────────────────
  const handleCopyAll = async () => {
    if (!selectedNote) return;
    const fields = NOTE_TYPE_FIELDS[selectedNote.note_type] ?? [];
    await copyWholeNote(fields, sections);
    setNoteCopied(true);
    setTimeout(() => setNoteCopied(false), 2000);
  };

  // ── Note type badge colour ─────────────────────────────────────────────────
  const TYPE_COLOUR: Record<string, string> = {
    stuegang:     "bg-blue-50 text-blue-700",
    indlaeggelse: "bg-purple-50 text-purple-700",
    kontinuation: "bg-amber-50 text-amber-700",
    "mat-kald":   "bg-red-50 text-red-700",
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT SIDEBAR: note list ── */}
      <aside className="w-56 flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">

        <div className="px-3 py-3 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Dagens notater
          </h2>
        </div>

        <div className="overflow-y-auto flex-1">
          {loadState === "loading" && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {loadState === "empty" && (
            <p className="text-xs text-slate-400 text-center px-3 py-8">
              Ingen notater de seneste 24 timer
            </p>
          )}
          {loadState === "error" && (
            <p className="text-xs text-red-500 text-center px-3 py-8">
              Fejl ved hentning
            </p>
          )}
          {loadState === "ready" && allNotes.map(note => {
            const isSelected = note.id === selectedId;
            return (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={`w-full text-left px-3 py-3 border-b border-slate-100 transition-colors ${
                  isSelected
                    ? "bg-white border-l-2 border-l-brand shadow-sm"
                    : "hover:bg-white border-l-2 border-l-transparent"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    TYPE_COLOUR[note.note_type] ?? "bg-slate-100 text-slate-600"
                  }`}>
                    {NOTE_TYPE_LABELS[note.note_type] ?? note.note_type}
                  </span>
                  <span className="text-[10px] text-slate-400 tabular-nums">
                    {formatTime(note.updated_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-snug line-clamp-2">
                  {notePreview(note)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Disclaimer at bottom of sidebar */}
        <div className="px-3 py-3 border-t border-slate-200 flex-shrink-0">
          <p className="text-[10px] text-slate-400 leading-tight">
            Gemmes i 24 timer · Verificér output
          </p>
        </div>
      </aside>

      {/* ── MAIN PANEL: note editor ── */}
      <div className="flex-1 overflow-y-auto">
        {(loadState === "empty" || (!selectedNote && loadState === "ready")) && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 px-8">
            <p className="text-5xl mb-4">🎙</p>
            <p className="font-medium text-slate-600">Ingen aktive notater</p>
            <p className="text-sm mt-2">
              Diktér et notat i ClinLog-appen — det dukker op her automatisk.
            </p>
          </div>
        )}

        {selectedNote && (
          <div className="px-7 py-6 max-w-3xl">

            {/* ── Note header ── */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  TYPE_COLOUR[selectedNote.note_type] ?? "bg-slate-100 text-slate-600"
                }`}>
                  {NOTE_TYPE_LABELS[selectedNote.note_type] ?? selectedNote.note_type}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(selectedNote.created_at).toLocaleTimeString("da-DK", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                <span className="text-xs text-slate-300">·</span>
                <span className="text-xs text-slate-400">
                  Udløber om {formatExpiry(selectedNote.expires_at)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Autosave status */}
                {saving && (
                  <span className="text-xs text-slate-400">Gemmer…</span>
                )}
                {saveMsg && !saving && (
                  <span className={`text-xs ${saveMsg.startsWith("Kunne") ? "text-red-500" : "text-green-600"}`}>
                    {saveMsg}
                  </span>
                )}
                {/* Manual save — shown when dirty */}
                {isDirty && !saving && (
                  <button
                    onClick={handleManualSave}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand transition-colors"
                  >
                    Gem nu
                  </button>
                )}
                <button
                  onClick={handleCopyAll}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    noteCopied
                      ? "border-green-200 bg-green-50 text-green-600"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand"
                  }`}
                >
                  {noteCopied ? "✓ Kopieret" : "📋 Kopier alt"}
                </button>
              </div>
            </div>

            {/* ── Note body ── */}
            {selectedNote.note_type === "stuegang" ? (
              (NOTE_TYPE_FIELDS[selectedNote.note_type] ?? []).map(field => (
                <SectionEditor
                  key={field.key}
                  field={field}
                  value={sections[field.key] ?? ""}
                  onChange={handleSectionChange}
                />
              ))
            ) : (
              <CombinedNoteEditor
                key={selectedNote.id}
                value={combinedText}
                onChange={handleCombinedChange}
              />
            )}

          </div>
        )}
      </div>
    </div>
  );
}
