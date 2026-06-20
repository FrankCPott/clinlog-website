/**
 * Section display configuration — mirrors NOTE_TYPE_FIELDS in the Expo app
 * (src/services/structure.ts). Update both if section keys change.
 */

import type { NoteType } from "./supabase";

export interface FieldDef {
  key:       string;
  label:     string;
  short:     string;
  icon:      string;
  omitLabel?: boolean;
}

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  stuegang:     "Stuegang",
  indlaeggelse: "Indlæggelse",
  kontinuation: "Kontinuation",
  "mat-kald":   "MAT-kald",
};

export const NOTE_TYPE_FIELDS: Record<NoteType, FieldDef[]> = {
  // Keys match the 'Stuegangsnotat ICU' Corti Guided Documents template.
  // Template UUID: 749ba352-00e0-4952-b8b6-c3810c3872bd
  // Must stay in sync with NOTE_TYPE_FIELDS.stuegang in clinlog-icu/src/services/structure.ts
  stuegang: [
    { key: "CNS",              label: "CNS",              short: "CNS",   icon: "🧠" },
    { key: "RESPIRATORISK",    label: "Respiratorisk",    short: "RESP",  icon: "🫁" },
    { key: "CIRKULATORISK",    label: "Cirkulatorisk",    short: "CIR",   icon: "❤️" },
    { key: "GASTROINTESTINALT", label: "Gastrointestinalt", short: "GI",  icon: "🫃" },
    { key: "RENALT",           label: "Renalt",           short: "REN",   icon: "🫘" },
    { key: "SYSTEMISK",        label: "Systemisk",        short: "SYS",   icon: "🌡️" },
    { key: "KOAGULATION",      label: "Koagulation",      short: "KOAG",  icon: "🩸" },
    { key: "MIKROBIOLOGISK",   label: "Mikrobiologisk",   short: "MIKRO", icon: "🦠" },
    { key: "VURDERING",        label: "Vurdering",        short: "VURD",  icon: "✅" },
    { key: "PLAN",             label: "Plan",             short: "PLAN",  icon: "📅" },
  ],
  // Keys match the 'corti-h-and-p' Corti template.
  indlaeggelse: [
    { key: "corti-chief-complaint",           label: "Henvendelsesårsag",     short: "ÅRSAG",      icon: "🏥", omitLabel: true },
    { key: "corti-hpi",                       label: "Aktuelt",               short: "AKTUELT",    icon: "📋" },
    { key: "corti-past-medical-history",      label: "Tidligere",             short: "TIDLIGERE",  icon: "📜" },
    { key: "corti-family-history",            label: "Familiehistorik",       short: "FAMILIE",    icon: "👨‍👩‍👧" },
    { key: "corti-social-history",            label: "Socialt",               short: "SOC",        icon: "🚬" },
    { key: "corti-medications",               label: "Medicinstatus",         short: "MEDICIN",    icon: "💊" },
    { key: "corti-allergies",                 label: "Allergi",               short: "ALLERGI",    icon: "⚠️" },
    { key: "corti-review-of-systems",         label: "Systemgennemgang",      short: "SYSTEMER",   icon: "🔄" },
    { key: "corti-physical-exam-with-vitals", label: "Objektiv undersøgelse", short: "OBJ",        icon: "🔬" },
    { key: "corti-diagnostic-results",        label: "Paraklinik",            short: "PARA",       icon: "🧪" },
    { key: "corti-assessment",                label: "Vurdering",             short: "VURDERING",  icon: "✅" },
    { key: "corti-plan",                      label: "Plan",                  short: "PLAN",       icon: "📅" },
  ],
  // Key matches the 'corti-brief-clinical-note' template.
  kontinuation: [
    { key: "corti-brief-clinical-note", label: "Notat", short: "NOTAT", icon: "📝", omitLabel: true },
  ],
  // Keys match the 'corti-soap' template.
  "mat-kald": [
    { key: "corti-subjective", label: "Anamnese og årsag",      short: "ANAMNESE",  icon: "📋" },
    { key: "corti-objective",  label: "ABCDE og objektive fund", short: "ABCDE",     icon: "🔍" },
    { key: "corti-assessment", label: "Vurdering",               short: "VURDERING", icon: "✅" },
    { key: "corti-plan",       label: "Plan",                    short: "PLAN",      icon: "📅" },
  ],
};

/** Values treated as "empty" for display purposes. */
const BLANK = new Set(["ikke angivet", "ikke oplyst", "ikke oplyst."]);

/**
 * Returns true if the value is empty, whitespace-only, an HTML-empty fragment
 * (e.g. Tiptap's "<p></p>"), or a known "blank" placeholder string.
 */
export function isBlank(v: string | undefined): boolean {
  if (!v) return true;
  // Strip HTML tags and entities before comparing, so "<p></p>" counts as blank
  const stripped = v
    .replace(/<[^>]+>/g, "")
    .replace(/&\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!stripped) return true;
  return BLANK.has(stripped);
}
