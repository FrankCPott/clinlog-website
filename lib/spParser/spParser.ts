/**
 * SP Smartphrase Parser
 *
 * Konverterer rå copy-paste output fra Sundhedsplatformens .allpatientdata
 * smartphrase til et kompakt, struktureret ICU stuegangsnotat.
 *
 * Regler:
 * - Kun dagens data medtages (referencedato = seneste dato fundet i teksten)
 * - Undtagelser: CRP, Leukocytter, Procalcitonin, Kreatinin, Karbamid viser
 *   også gårsdagens værdi i parentes: "CRP 125 (109)"
 * - (!) alert-flag bevares
 * - Tomme variable og "Uafklaret"-værdier udelades
 * - "Erstattet"-værdier udelades
 * - Lab-tabelhoveder fjernes
 * - Grupper af beslægtede værdier skrives kommasepareret på én linje
 *
 * Understøtter to lab-tabellformater fra SP:
 *   Format A (multilinjer):   KOMPONENTNAVN\n155 (H)\n14-06-2026
 *   Format B (enkeltlinje):   KOMPONENTNAVN 155 (H) 14-06-2026
 */

// ── Lab-komponentnavn → visningsnavn ──────────────────────────────────────────
const LAB_MAP: Record<string, string> = {
  KREATININP:   "Kreatinin",
  KARBAMIDP:    "Karbamid",
  KALIUMP:      "K+",
  NATRIUMP:     "Na+",
  KLORIDP:      "Cl-",
  CALCIUMIOTP:  "Ca++",
  FOSFATP:      "Fosfat",
  MAGNESIUMP:   "Magnesium",
  TROMBOCYTB:   "Trombocytter",
  INRP:         "INR",
  CRPP:         "CRP",
  LEUKOCYTTERB: "Leukocytter",
  HÆMOGLOBINB:  "Hb",
  LAKTATAB:     "Laktat",
  LAKTATP:      "Laktat",
  ALBUMINP:     "Albumin",
  BILIRUBINERP: "Bilirubin",
  ALATP:        "ALAT",
};

// Variabler der også viser gårsdagens værdi i parentes
const SHOW_YESTERDAY = new Set([
  "Kreatinin", "Karbamid", "CRP", "Leukocytter", "Procalcitonin",
]);

// Visningsnavne der afviger fra variabelnavnet
const LABEL_MAP: Record<string, string> = {
  URINTIMEDIURESETØMT: "Sidste TD",
  HUD:                 "Hud",
};

// Nøgler der kun viser værdien — intet variabelnavn i output
const VALUE_ONLY = new Set([
  // GI og hydreringsstatus
  "observ.afabdomen", "afføring", "hydr.status",
  // Ventilatorindstilling og hudstatus vises uden label
  "modus", "hud",
  // CNS — bevidsthedsniveau og orientering vises kun som værdien
  "bevidsthedsniveau", "orientering",
]);

// Kendte SP-nøgler med tekst-værdier (hjælper parseInlineValues med at adskille nøgle fra værdi)
const KNOWN_TEXT_KEYS: string[] = [
  // Respiratorisk
  "Modus", "Sekret", "Hostekraft", "NIV",
  // Cirkulatorisk
  "Rytme", "HUD", "HYDR.STATUS", "KAP.RESP.",
  // GI
  "OBSERV.AFABDOMEN", "OBSERV. AFABDOMEN", "KVALME", "OPKAST", "AFF.TYPE", "AFFØRING",
  // Renalt
  "URINUDSENDENDE",
  // CNS
  "Bevidsthedsniveau", "Orientering", "Smerter", "Søvn",
  "Synkefunktion", "Pupiller størrelse", "Reaktion hø.", "Reaktion ve.",
  "CNS observationer",
];

/** Matcher kendte tekst-nøgler som præfiks — returnerer [key, value] eller [null, null] */
function parseKnownTextKey(s: string): [string, string] | [null, null] {
  // Sortér efter længde (længste først) for at undgå delvise matches
  const sorted = [...KNOWN_TEXT_KEYS].sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    const kl = key.toLowerCase();
    if (s.toLowerCase().startsWith(kl + ": ")) {
      return [key, s.slice(key.length + 2).trim()];
    }
    if (s.toLowerCase().startsWith(kl + " ")) {
      return [key, s.slice(key.length).trim()];
    }
  }
  return [null, null];
}

// ── Hjælpefunktioner ──────────────────────────────────────────────────────────

/** Sand hvis værdien skal udelades fra output */
function isSkippable(value: string): boolean {
  return /^uafklaret/i.test(value.trim());
}

/**
 * Byg én output-streng fra nøgle, flag og værdi.
 * Anvender LABEL_MAP og VALUE_ONLY; returnerer null hvis værdien skal udelades.
 */
function buildLine(key: string, bang: boolean, val: string): string | null {
  if (isSkippable(val)) return null;
  const kl    = key.toLowerCase().replace(/\s*\(!\)\s*/g, "").trim();
  const bang$ = bang ? "(!) " : "";
  const label = LABEL_MAP[key.toUpperCase()] ?? key;
  if ([...VALUE_ONLY].some(v => kl.startsWith(v))) return `${bang$}${val}`;
  return `${label} ${bang$}${val}`;
}

/** Formatér et enkelt output-element med valgfri igårs-parentes */
function fmt(
  label:     string,
  value:     string,
  flagAlert  = false,
  yestValue: string | null = null,
): string {
  const flag = flagAlert ? "(!) " : "";
  const yest = yestValue && SHOW_YESTERDAY.has(label) ? ` (${yestValue})` : "";
  return `${label} ${flag}${value}${yest}`;
}

// ── Datohåndtering ────────────────────────────────────────────────────────────

function expandYear(yy: string): number {
  const n = parseInt(yy, 10);
  return n < 50 ? 2000 + n : 1900 + n;
}

/** Parse inline-dato "(DD-MM-YY HH:MM)" → "DD-MM-YYYY" */
function parseInlineDate(s: string): string | null {
  const m = s.match(/\((\d{2})-(\d{2})-(\d{2})\s+\d{2}:\d{2}\)/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${expandYear(m[3])}`;
}

/** Parse tabeldato "DD-MM-YYYY" */
function parseTableDate(s: string): string | null {
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function dateFromStr(s: string): Date {
  const [dd, mm, yyyy] = s.split("-");
  return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
}

function strFromDate(d: Date): string {
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("-");
}

/**
 * Find den seneste dato i teksten og brug den som "i dag".
 * Beregn "i går" som dagen før.
 */
function findReferenceDates(raw: string): { today: string; yesterday: string } {
  const dates: string[] = [];

  for (const m of raw.matchAll(/\(\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}\)/g)) {
    const d = parseInlineDate(m[0]);
    if (d) dates.push(d);
  }
  for (const m of raw.matchAll(/\b(\d{2}-\d{2}-\d{4})\b/g)) {
    const d = parseTableDate(m[1]);
    if (d) dates.push(d);
  }

  if (dates.length === 0) {
    const now  = new Date();
    return { today: strFromDate(now), yesterday: strFromDate(new Date(now.getTime() - 86_400_000)) };
  }

  const cutoff = Date.now() + 86_400_000;
  const sorted = dates
    .map(d => dateFromStr(d).getTime())
    .filter(ts => !isNaN(ts) && ts <= cutoff)
    .sort((a, b) => b - a);

  const todayTs = sorted[0] ?? Date.now();
  const todayD  = new Date(todayTs);
  const yestD   = new Date(todayTs - 86_400_000);
  return { today: strFromDate(todayD), yesterday: strFromDate(yestD) };
}

// ── Sektionsopdeling ──────────────────────────────────────────────────────────

const SECTION_HEADERS: Record<string, string> = {
  centralnervesystem: "Centralnervesystem",
  respiratorisk:      "Respiratorisk",
  cirkulatorisk:      "Cirkulatorisk",
  gastrointestinalt:  "Gastrointestinalt",
  renalt:             "Renalt",
  koagulation:        "Koagulation",
  systemisk:          "Systemisk",
  mikrobiologisk:     "MIKROBIOLOGISK",
};

function splitSections(raw: string): Record<string, string> {
  const stopIdx = raw.search(/SAMLET VURDERING|Medicinstatus/);
  const text    = stopIdx > 0 ? raw.slice(0, stopIdx) : raw;
  const result: Record<string, string> = {};
  const keys = Object.keys(SECTION_HEADERS);

  for (let i = 0; i < keys.length; i++) {
    const key    = keys[i];
    const header = SECTION_HEADERS[key];
    const start  = text.search(new RegExp(`${header}\\s*:?`, "i"));
    if (start === -1) continue;

    let end = text.length;
    for (let j = i + 1; j < keys.length; j++) {
      const nextRe  = new RegExp(`${SECTION_HEADERS[keys[j]]}\\s*:?`, "i");
      const nextIdx = text.slice(start + header.length).search(nextRe);
      if (nextIdx !== -1) { end = start + header.length + nextIdx; break; }
    }
    result[key] = text.slice(start, end);
  }
  return result;
}

// ── Lab-tabel parser ──────────────────────────────────────────────────────────

interface RawLabEntry {
  component: string;
  value:     string;
  date:      string;
}

/**
 * Parser lab-tabeller i begge formater:
 *   Format A (ældre): KOMPONENTNAVN på linje, VÆRDI på næste linje, DATO på linjen efter
 *   Format B (nyt):   KOMPONENTNAVN VÆRDI DATO på én linje
 */
function parseLabTables(text: string): RawLabEntry[] {
  const entries: RawLabEntry[] = [];

  // Split på "Lab-resultater" (begge formater har dette header)
  const parts = text.split(/Lab-resultater\s*/gi);

  for (let pi = 1; pi < parts.length; pi++) {
    const lines = parts[pi]
      .split(/[\r\n]+/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    let i = 0;
    // Skip header-linjer: "Komponent", "Værdi", "Dato" — kan stå på én linje eller tre
    while (i < lines.length && /^(Komponent|V[aæ]rdi|Dato)/i.test(lines[i])) i++;

    while (i < lines.length) {
      const line = lines[i];

      // ── Format B: KOMPONENTNAVN VÆRDI DD-MM-YYYY ──
      // Fx "KREATININP 166 (H) 14-06-2026"
      const singleM = line.match(
        /^([A-ZÆØÅ][A-ZÆØÅ0-9]+)\s+(.*?)\s+(\d{2}-\d{2}-\d{4})\s*$/
      );
      if (singleM) {
        const component = singleM[1];
        const rawVal    = singleM[2];
        const date      = singleM[3];
        if (rawVal !== "Erstattet") {
          const value = rawVal.replace(/\s*\([HL]\)\s*/g, "").trim();
          if (value && !isSkippable(value)) entries.push({ component, value, date });
        }
        i++;
        continue;
      }

      // ── Format A: komponentnavn alene på linjen ──
      if (/^[A-ZÆØÅ][A-ZÆØÅ0-9]+$/.test(line)) {
        const component = line;
        const valueLine = lines[i + 1] ?? "";
        const dateLine  = lines[i + 2] ?? "";
        if (valueLine === "Erstattet") { i += 3; continue; }
        const date = parseTableDate(dateLine);
        if (date) {
          const value = valueLine.replace(/\s*\([HL]\)\s*/g, "").trim();
          if (value && !isSkippable(value)) entries.push({ component, value, date });
          i += 3;
        } else {
          i++;
        }
        continue;
      }

      // Ikke genkendelig datalinje — stop dette blok
      break;
    }
  }
  return entries;
}

/** Parse Procalcitonin-blok — understøtter både ældre og nyt format. */
function parseProcalcitonin(text: string): RawLabEntry[] {
  const entries: RawLabEntry[] = [];
  const start = text.search(/Procalcitonin[;,]P/i);
  if (start === -1) return entries;

  const lines = text
    .slice(start)
    .split(/[\r\n]+/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let i = 1; // spring "Procalcitonin;P" over
  // Spring header-linjer over ("Dato", "Værdi", "Referenceinterval", "Status")
  while (i < lines.length && /^(Dato|V[aæ]rdi|Referenceinterval|Status)/i.test(lines[i])) i++;

  while (i < lines.length) {
    const line = lines[i];

    // ── Nyt format: "14-06-2026 26,9 (H) <0,50 µg/L Endelig" ──
    const newM = line.match(/^(\d{2}-\d{2}-\d{4})\s+([\d,]+)\s*(?:\([HL]\))?/);
    if (newM) {
      entries.push({ component: "PROCALCITONIN", value: newM[2], date: newM[1] });
      i++;
      // Spring Kommentar/Beslutningsgrænse over til næste dato
      while (i < lines.length && !/^\d{2}-\d{2}-\d{4}/.test(lines[i])) {
        if (/^[A-Z][a-z]/.test(lines[i]) && !/^(Kommentar|Beslutning)/i.test(lines[i])) break;
        i++;
      }
      continue;
    }

    // ── Ældre format: dato alene på linjen ──
    const date = parseTableDate(line);
    if (date) {
      const val = (lines[i + 1] ?? "").replace(/\s*\([HL]\)\s*/g, "").trim();
      if (val && val !== "Erstattet") entries.push({ component: "PROCALCITONIN", value: val, date });
      i += 2;
      while (i < lines.length && !/^\d{2}-\d{2}-\d{4}$/.test(lines[i])) {
        if (/^[A-Z][a-z]/.test(lines[i]) && !/^(Kommentar|Beslutning|Endelig)/i.test(lines[i])) break;
        i++;
      }
      continue;
    }

    i++;
  }
  return entries;
}

// ── Inline-parser ─────────────────────────────────────────────────────────────

interface InlineValue {
  key:       string;
  value:     string;
  flagAlert: boolean;
  date:      string;
}

/**
 * Udtrækker inline-værdier med tidsstempel:
 *   NØGLE værdi (DD-MM-YY HH:MM)
 *   NØGLE (!) værdi (DD-MM-YY HH:MM)
 *
 * Linjer uden (DD-MM-YY HH:MM) springes automatisk over — det filtrerer
 * lab-tabellinjer, header-linjer og andre ikke-inline-elementer.
 */
function parseInlineValues(text: string): InlineValue[] {
  const results: InlineValue[] = [];

  for (const line of text.split(/[\r\n]+/)) {
    const t = line.trim();
    if (!t) continue;

    // Kræv eksakt inline-tidsstempel-mønster
    const dateM = t.match(/^(.*?)\(\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}\)\s*\)?$/);
    if (!dateM) continue;

    const before   = dateM[1].trim();
    const dateStr  = parseInlineDate(t);
    if (!dateStr) continue;

    const flagAlert   = before.includes("(!)");
    const withoutFlag = before.replace(/\s*\(!?\)\s*/g, " ").trim();

    // Split nøgle og værdi.
    // Nøglen må indeholde tal, +, (, ), /, :, - (fx pCO2, Ca++, RF (fra monitor), inv. BT).
    // Værdien skal starte med tal eller -, +, <, >.
    const kvM = withoutFlag.match(
      /^([A-ZÆØÅa-zæøå][A-Za-z0-9ÆØÅæøå\s+.()/:-]*?)\s+(-?[0-9,./+%°<>].*)/
    );
    if (!kvM) {
      // Prøv known-key prefix (tekst-værdier som "Modus VC-MMV", "Rytme Sinusrytme"):
      const [kk, kv] = parseKnownTextKey(withoutFlag);
      if (kk && kv && !isSkippable(kv)) {
        results.push({ key: kk, value: kv, flagAlert, date: dateStr });
      } else {
        // Descriptive path (ingen key/value-opdeling, fx "Reaktion hø. Træg"):
        const descKey = withoutFlag.replace(/[,.]$/, "").trim();
        if (descKey.length > 1 && !isSkippable(descKey)) {
          results.push({ key: descKey, value: descKey, flagAlert, date: dateStr });
        }
      }
      continue;
    }

    // Strip trailing ':' (fx "RF (fra monitor):" → "RF (fra monitor)")
    const key   = kvM[1].trimEnd().replace(/:$/, "").trim();
    const value = kvM[2].replace(/\s*\([HL]\)\s*$/, "").trimEnd();

    if (key && value && !isSkippable(value)) {
      results.push({ key, value, flagAlert, date: dateStr });
    }
  }
  return results;
}

// ── Lab-resultat-map ──────────────────────────────────────────────────────────

interface LabResultEntry {
  today:     string | null;
  yesterday: string | null;
  flagAlert: boolean;
}
type LabResultMap = Record<string, LabResultEntry>;

function buildLabResultMap(
  entries:  RawLabEntry[],
  today:    string,
  yesterday: string,
): LabResultMap {
  const map: LabResultMap = {};

  for (const e of entries) {
    const name = LAB_MAP[e.component] ?? e.component;
    if (!map[name]) map[name] = { today: null, yesterday: null, flagAlert: false };
    if (e.date === today     && !map[name].today)     map[name].today     = e.value;
    if (e.date === yesterday && !map[name].yesterday) map[name].yesterday = e.value;
  }
  return map;
}

function buildLabGroup(labels: string[], labMap: LabResultMap): string {
  return labels
    .map(label => {
      const r = labMap[label];
      if (!r?.today) return null;
      return fmt(label, r.today, r.flagAlert, SHOW_YESTERDAY.has(label) ? r.yesterday : null);
    })
    .filter(Boolean)
    .join(", ");
}

// ── Sektionsbyggere ───────────────────────────────────────────────────────────

function buildCNS(text: string, today: string): string[] {
  const iv = parseInlineValues(text).filter(v => v.date === today);

  // Reaktion hø. og ve. — slå op separat til bilateral-check
  const rHoe = iv.find(v => v.key === "Reaktion hø.");
  const rVe  = iv.find(v => v.key === "Reaktion ve.");
  const bilatNormal =
    rHoe?.value.toLowerCase().startsWith("normal") &&
    rVe?.value.toLowerCase().startsWith("normal");

  const seenValues = new Set<string>(); // til deduplikering

  const items = iv
    .filter(v => ![
      "KOMM.", "SYNKEFUNKTION", "CNS observationer",
      "Reaktion hø.", "Reaktion ve.",
    ].includes(v.key))
    .filter(v => !isSkippable(v.value))
    .map(v => {
      const kl          = v.key.toLowerCase().trim();
      const isValueOnly = [...VALUE_ONLY].some(k => kl.startsWith(k));
      // (!) kun for talværdier — fjernes fra tekstobservationer
      const isNumeric   = /^-?[0-9]/.test(v.value);
      const bang        = v.flagAlert && isNumeric ? "(!) " : "";

      let result: string;

      if (isValueOnly) {
        // Smerter-transform
        if (kl === "smerter") {
          if (/^nej$|^ingen$/i.test(v.value)) result = "Ingen smerter";
          else if (/^ja$/i.test(v.value))     result = "Smerter";
          else                                 result = v.value;
        } else {
          result = v.value; // Bevidsthedsniveau, Orientering, Modus: kun værdien
        }
      } else if (v.key === v.value) {
        // Descriptive fritekst (ingen known-key match)
        result = v.key;
      } else {
        result = `${v.key} ${bang}${v.value}`;
      }

      if (seenValues.has(result)) return null;
      seenValues.add(result);
      return result;
    })
    .filter((x): x is string => x !== null);

  // Tilføj bilateral pupilreaktion til sidst
  if (bilatNormal) {
    items.push("Bilat. normal pupilreaktion");
  } else {
    if (rHoe && !isSkippable(rHoe.value)) items.push(`Reaktion hø. ${rHoe.value}`);
    if (rVe  && !isSkippable(rVe.value))  items.push(`Reaktion ve. ${rVe.value}`);
  }

  return items.length > 0 ? [items.join(", ")] : [];
}

function buildRespiratory(text: string, today: string): string[] {
  const out:  string[] = [];
  const iv    = parseInlineValues(text);
  const iMap  = Object.fromEntries(iv.map(v => [v.key, v]));
  const get   = (k: string) => iMap[k]?.date === today ? iMap[k] : undefined;

  // Linje 1: Modus/NIV (VALUE_ONLY — kun værdien) + FiO2
  const firstVar = get("Modus") ?? get("NIV");
  const fiO2     = get("FiO2") ?? get("FiO2 NIV");

  const respLine1: string[] = [];
  if (firstVar) respLine1.push(firstVar.value);
  if (fiO2)     respLine1.push(fmt("FiO2", fiO2.value, fiO2.flagAlert));
  if (respLine1.length > 0) out.push(respLine1.join(", "));

  // Linje 2: Ventilatorindstillinger (præcist opslag — ingen fallback)
  const settingKeys: [string, string][] = [
    ["PS",               "PS"],
    ["PEEP",             "PEEP"],
    ["TV",               "TV"],
    ["MV",               "MV"],
    ["RF (fra monitor)", "RF"],
    ["Peaktryk",         "Peaktryk"],
  ];
  const settingParts: string[] = [];
  for (const [key, label] of settingKeys) {
    const v = get(key);
    if (v) settingParts.push(fmt(label, v.value, v.flagAlert));
  }
  if (settingParts.length > 0) out.push(settingParts.join(", "));

  // Saturation (pulsoksimeter) — separat linje
  for (const k of ["Saturation:", "Saturation", "SaO2"]) {
    const v = get(k);
    if (v) { out.push(`Saturation ${v.value}`); break; }
  }

  // Blodgas: pH, pCO2, pO2, BE, SAT
  const gasParts: string[] = [];
  for (const [key, label] of [["pH","pH"],["pCO2","pCO2"],["pO2","pO2"],["BE","BE"],["SAT","SAT"]] as [string,string][]) {
    const v = get(key);
    if (v) gasParts.push(fmt(label, v.value, v.flagAlert));
  }
  if (gasParts.length > 0) out.push(gasParts.join(", "));

  return out;
}

function buildCirculatory(text: string, today: string, labMap: LabResultMap): string[] {
  const out:  string[] = [];
  const iv    = parseInlineValues(text);
  const iMap  = Object.fromEntries(iv.map(v => [v.key, v]));
  const get   = (k: string) => iMap[k]?.date === today ? iMap[k] : undefined;

  // ── Linje 1: BT/inv.BT, MAP/inv.MAP, Puls (eller HF), HUD ──────────────
  const line1: string[] = [];

  const invBt  = get("inv. BT");
  const regBt  = get("BT");
  const bt     = invBt ?? regBt;
  if (bt) line1.push(fmt(invBt ? "inv. BT" : "BT", bt.value, bt.flagAlert));

  const invMap = get("inv. MAP");
  const regMap = get("MAP");
  const mapV   = invMap ?? regMap;
  if (mapV) line1.push(fmt(invMap ? "inv. MAP" : "MAP", mapV.value, mapV.flagAlert));

  const puls = get("Puls");
  if (puls) {
    line1.push(fmt("Puls", puls.value, puls.flagAlert));
  } else {
    const hf = get("HF");
    if (hf) line1.push(fmt("HF", hf.value, hf.flagAlert));
  }

  // HUD — VALUE_ONLY: kun værdien (fx "Varm, Tør")
  const hud = get("HUD");
  if (hud && !isSkippable(hud.value)) line1.push(hud.value);

  if (line1.length > 0) out.push(line1.join(", "));

  // ── Linje 2: Hb, Laktat, Ca++, Hct ──────────────────────────────────────
  const line2: string[] = [];

  const hbInline = get("Hb");
  const hbLab    = labMap["Hb"];
  const hbEntry  = hbInline ?? (hbLab?.today ? { value: hbLab.today, flagAlert: hbLab.flagAlert } : null);
  if (hbEntry) line2.push(fmt("Hb", hbEntry.value, hbEntry.flagAlert));

  const lak = labMap["Laktat"];
  if (lak?.today) line2.push(fmt("Laktat", lak.today));

  const caInline = get("Ca++");
  const caLab    = labMap["Ca++"];
  const caEntry  = caInline ?? (caLab?.today ? { value: caLab.today, flagAlert: caLab.flagAlert } : null);
  if (caEntry) line2.push(fmt("Ca++", caEntry.value, caEntry.flagAlert));

  const hctInline = get("Hct");
  const hctLab    = labMap["Hct"];
  const hctEntry  = hctInline ?? (hctLab?.today ? { value: hctLab.today, flagAlert: hctLab.flagAlert } : null);
  if (hctEntry) line2.push(fmt("Hct", hctEntry.value, hctEntry.flagAlert));

  if (line2.length > 0) out.push(line2.join(", "));

  // ── Ekstra: Rytme, HYDR.STATUS, KAP.RESP. (PERFIDX udelades) ────────────
  const extraParts: string[] = [];
  for (const key of ["Rytme", "HYDR.STATUS", "KAP.RESP."]) {
    const v = get(key);
    if (!v || isSkippable(v.value)) continue;
    const line = buildLine(key, v.flagAlert, v.value);
    if (line) extraParts.push(line);
  }
  if (extraParts.length > 0) out.push(extraParts.join(", "));

  return out;
}

function buildGI(text: string, today: string, labMap: LabResultMap): string[] {
  const out:  string[] = [];
  const iv    = parseInlineValues(text);
  const iMap  = Object.fromEntries(iv.map(v => [v.key, v]));
  const get   = (k: string) => iMap[k]?.date === today ? iMap[k] : undefined;

  // Observationer
  const obsParts: string[] = [];

  // Afføring — særlig formateringsregel (præcis AFFØRING-nøgle, ikke "Afføring (ml) (I/U):")
  const affoering = iv.find(v =>
    v.date === today && /^AFFØRING$/i.test(v.key)
  );
  if (affoering) {
    const val    = affoering.value;
    const mlM    = val.match(/(\d[\d.,]*)\s*ml/i);
    const hasNej = /\bnej\b|ingen/i.test(val);
    const hasJa  = /\bja\b/i.test(val);
    if (hasNej)     obsParts.push("Ingen afføring");
    else if (mlM)   obsParts.push(`+afføring ${mlM[1]} ml`);
    else if (hasJa) obsParts.push("+afføring");
    else            obsParts.push(`+afføring`);
  }

  // Øvrige GI-observationer (Afføring udeladt — håndteres ovenfor)
  for (const key of [
    "OBSERV.AFABDOMEN", "OBSERV. AFABDOMEN",
    "KVALME", "OPKAST",
  ]) {
    const v = get(key);
    if (!v || v.key === v.value || isSkippable(v.value)) continue;
    const line = buildLine(key, v.flagAlert, v.value);
    if (line) obsParts.push(line);
  }
  if (obsParts.length > 0) out.push(obsParts.join(", "));

  // Lab: Albumin, Bilirubin, ALAT
  const labLine = buildLabGroup(["Albumin","Bilirubin","ALAT"], labMap);
  if (labLine) out.push(labLine);

  return out;
}

function buildRenal(text: string, today: string, labMap: LabResultMap): string[] {
  const out:  string[] = [];
  const iv    = parseInlineValues(text);
  const iMap  = Object.fromEntries(iv.map(v => [v.key, v]));
  const get   = (k: string) => iMap[k]?.date === today ? iMap[k] : undefined;

  // Diurese — LABEL_MAP giver "Sidste TD"
  for (const key of ["URINTIMEDIURESETØMT","URIN(POSETØMT)","URINUDSENDENDE","URIN"]) {
    const v = get(key);
    if (v) {
      const label = LABEL_MAP[key] ?? key;
      out.push(`${label} ${v.value}`);
      break;
    }
  }

  // Renale blodværdier (Kreatinin og Karbamid med igårs-parentes)
  const renalLine = buildLabGroup(["Kreatinin","Karbamid","Fosfat","Magnesium"], labMap);
  if (renalLine) out.push(renalLine);

  // Elektrolytter — foretrækker inline (har (!) flag)
  const electParts: string[] = [];
  for (const key of ["K+","Na+","Ca++","Cl-"]) {
    const v = get(key);
    if (v) {
      electParts.push(fmt(key, v.value, v.flagAlert));
    } else {
      const r = labMap[key];
      if (r?.today) electParts.push(fmt(key, r.today, r.flagAlert));
    }
  }
  if (electParts.length > 0) out.push(electParts.join(", "));

  return out.filter(Boolean);
}

function buildCoagulation(_text: string, _today: string, labMap: LabResultMap): string[] {
  const line = buildLabGroup(["Trombocytter","INR"], labMap);
  return line ? [line] : [];
}

function buildSystemic(text: string, today: string): string[] {
  const iv   = parseInlineValues(text);
  const iMap = Object.fromEntries(iv.map(v => [v.key, v]));
  const bs   = iMap["BS"];
  if (bs && bs.date === today) return [fmt("BS", bs.value, bs.flagAlert)];
  return [];
}

function buildMicro(
  text:      string,
  today:     string,
  yesterday: string,
  labMap:    LabResultMap,
): string[] {
  const out:  string[] = [];
  const iv    = parseInlineValues(text);
  const iMap  = Object.fromEntries(iv.map(v => [v.key, v]));

  // Temperatur altid øverst — strip eventuel °C fra value (den tilføjes nedenfor)
  for (const k of ["Temperatur:","Temperatur","TEMP"]) {
    const v = iMap[k];
    if (v && v.date === today) {
      const tempVal = v.value.replace(/\s*°C\s*$/, "").trim();
      out.push(`Temperatur ${tempVal} °C`);
      break;
    }
  }

  // Procalcitonin fra særlig parser
  const pct      = parseProcalcitonin(text);
  const pctToday = pct.find(e => e.date === today);
  const pctYest  = pct.find(e => e.date === yesterday);
  if (pctToday) {
    labMap["Procalcitonin"] = {
      today:     pctToday.value,
      yesterday: pctYest?.value ?? null,
      flagAlert: false,
    };
  }

  // Infektionstal med igårs-parentes
  const infLine = buildLabGroup(["CRP","Leukocytter","Procalcitonin"], labMap);
  if (infLine) out.push(infLine);

  return out;
}

// ── Medicinstatus-parser ──────────────────────────────────────────────────────

const WEEKDAY_MAP: Record<string, string> = {
  mandag: "ma", tirsdag: "ti", onsdag: "on",
  torsdag: "to", fredag: "fr", lørdag: "lø", søndag: "sø",
};

function extractGeneric(namePart: string): string {
  const m = namePart.match(
    /^([A-Za-zÆØÅæøå][A-Za-zÆØÅæøå\s\-+,]+?)(?:\s*\(|\s+\d|\s+")/
  );
  return m ? m[1].trim() : namePart.split("(")[0].trim();
}

function extractStrength(namePart: string, generic: string): string {
  const m = namePart.slice(generic.length).match(
    /(\d[\d.,]*)\s*(mg|mikrog|µg|ml|g)\b/i
  );
  return m ? `${m[1]} ${m[2].toLowerCase()}` : "";
}

function extractVolumeMed(dosing: string): string {
  const m = dosing.match(/(\d[\d.,]*)\s*(ml|l)\b/i);
  return m ? `${m[1]} ${m[2].toLowerCase()}` : "";
}

function compactDosing(dosing: string, strength: string): string {
  const d = dosing.toLowerCase();

  // ── PN ──
  if (/efter behov|ved behov|p\.n\./.test(d)) {
    const maxM   = d.match(/højst\s+(\d+)\s+gang/);
    const countM = dosing.match(/^(\d+)\s+(?:tablet|stk|kap)/i);
    let doseStr  = strength;
    if (countM) {
      const n  = parseInt(countM[1], 10);
      const sM = strength.match(/^(\d+[\d.,]*)\s*(\S+)/);
      if (sM && n > 1) {
        const total = n * parseFloat(sM[1].replace(",", "."));
        doseStr = `${Number.isInteger(total) ? total : total.toFixed(0)} ${sM[2]}`;
      }
    }
    return maxM ? `${doseStr} p.n. max ${maxM[1]}x/dgl` : `${doseStr} p.n.`;
  }

  // ── Ugedage ──
  const foundDays = Object.keys(WEEKDAY_MAP).filter(day => d.includes(day));
  if (foundDays.length > 0 || /hver uge/.test(d)) {
    const vol    = extractVolumeMed(dosing);
    const prefix = vol || strength;
    if (foundDays.length === 0) return `${prefix} x 1/uge`;
    const abbrs = foundDays.map(day => WEEKDAY_MAP[day]);
    return abbrs.length === 1
      ? `${prefix} x 1/uge (${abbrs[0]})`
      : `${prefix} x ${abbrs.length}/uge (${abbrs.join("+")})`;
  }

  // ── Varierende doser pr. tidspunkt ("2 tabl morgen og 2 tabl middag") ──
  const splitDoseM = dosing.match(
    /(\d+)\s+(?:tablet|stk)[a-z]*\s+\w+\s+og\s+(\d+)\s+(?:tablet|stk)[a-z]*\s+\w+/i
  );
  if (splitDoseM) {
    const n1 = parseInt(splitDoseM[1], 10);
    const n2 = parseInt(splitDoseM[2], 10);
    const sM = strength.match(/^(\d+[\d.,]*)\s*(\S+)/);
    if (sM) {
      const s    = parseFloat(sM[1].replace(",", "."));
      const u    = sM[2];
      const dose = n1 === n2 ? `${n1 * s} ${u}` : `${n1 * s}+${n2 * s} ${u}`;
      return `${dose} x 2 dgl`;
    }
  }

  // ── Daglige tidspunkter ──
  const times: string[] = [];
  if (/\b(morgen|morgenmad|om morgenen)\b/i.test(dosing)) times.push("morgen");
  if (/\b(middag|til middag)\b/i.test(dosing))            times.push("middag");
  if (/\b(aften|til aften)\b/i.test(dosing))              times.push("aften");
  if (/\b(nat|natten|til natten)\b/i.test(dosing))        times.push("nat");

  if (times.length === 0) return strength ? `${strength} ${dosing}` : dosing;
  const freq = times.length === 1 ? `x 1 dgl (${times[0]})` : `x ${times.length} dgl`;
  return `${strength} ${freq}`;
}

function parseMedEntries(block: string): string[] {
  const results: string[] = [];

  // KRITISK: normaliser linjeskift (håndterer \r\n fra Citrix/Windows)
  // og split på BLANK LINJE — hvert præparat er én paragraf
  const normalized = block.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const paragraphs = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  for (const para of paragraphs) {
    // Format: "navn (HANDELSNAVN) styrke form; dosering; indikation, Doseringsstart: dato"
    const semicolonIdx = para.indexOf(";");
    if (semicolonIdx === -1) continue;

    const namePart  = para.slice(0, semicolonIdx).trim();
    const rest      = para.slice(semicolonIdx + 1);
    const nextSemi  = rest.indexOf(";");
    // Kun doserings-feltet (mellem 1. og 2. semikolon) — ikke indikation/dato
    const dosingRaw = (nextSemi > -1 ? rest.slice(0, nextSemi) : rest).trim();

    if (!namePart || !dosingRaw) continue;

    const dosing = dosingRaw
      .replace(/,?\s*Doseringsstart:\s*\d{2}-\d{2}-\d{4}/gi, "")
      .replace(/,\s*Pose\s*\d+/gi, "")
      .trim();

    const generic  = extractGeneric(namePart);
    const strength = extractStrength(namePart, generic) || extractVolumeMed(dosing);
    const compact  = compactDosing(dosing, strength);

    results.push(`  ${generic} ${compact}`);
  }
  return results;
}

/**
 * Parser medicinstatus-blokken (raw = tekst fra "Medicinstatus" og frem).
 * Deler i "Fast medicin:" og "Efter behov:" (PN).
 */
export function parseMedicationBlock(raw: string): string {
  const fastIdx = raw.search(/Fast medicin:/i);
  const pnIdx   = raw.search(/Efter behov:/i);
  if (fastIdx === -1) return "";

  const fastBlock = pnIdx > fastIdx
    ? raw.slice(fastIdx + "Fast medicin:".length, pnIdx)
    : raw.slice(fastIdx + "Fast medicin:".length);
  const pnBlock = pnIdx > -1
    ? raw.slice(pnIdx + "Efter behov:".length)
    : "";

  const out: string[] = ["Medicinstatus:"];

  const fastLines = parseMedEntries(fastBlock);
  if (fastLines.length > 0) {
    out.push("Fast medicin:");
    out.push(...fastLines);
  }
  const pnLines = parseMedEntries(pnBlock);
  if (pnLines.length > 0) {
    out.push("PN:");
    out.push(...pnLines);
  }
  return out.join("\n");
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface ParseOptions {
  /** Inkludér medicinstatus i output (default: true) */
  includeMedications?: boolean;
}

// ── Hoved-indgang ─────────────────────────────────────────────────────────────

export function parseSPSmartphrase(raw: string, options: ParseOptions = {}): string {
  const { includeMedications = true } = options;
  const { today, yesterday } = findReferenceDates(raw);
  const sections             = splitSections(raw);

  // Saml alle lab-tabelopslag på tværs af sektioner
  const labEntries = Object.values(sections).flatMap(parseLabTables);
  const labMap     = buildLabResultMap(labEntries, today, yesterday);

  const microText = sections["mikrobiologisk"] ?? "";
  const output:   string[] = [];

  const push = (header: string, lines: string[]) => {
    const nonEmpty = lines.filter(Boolean);
    if (nonEmpty.length > 0) output.push(`${header}:\n${nonEmpty.join("\n")}`);
  };

  push("Centralnervesystem",
    buildCNS(sections["centralnervesystem"] ?? "", today));

  push("Respiratorisk",
    buildRespiratory(sections["respiratorisk"] ?? "", today));

  push("Cirkulatorisk",
    buildCirculatory(sections["cirkulatorisk"] ?? "", today, labMap));

  push("Gastrointestinalt",
    buildGI(sections["gastrointestinalt"] ?? "", today, labMap));

  push("Renalt",
    buildRenal(sections["renalt"] ?? "", today, labMap));

  push("Koagulation",
    buildCoagulation(sections["koagulation"] ?? "", today, labMap));

  push("Systemisk",
    buildSystemic(sections["systemisk"] ?? "", today));

  push("Mikrobiologisk",
    buildMicro(microText, today, yesterday, labMap));

  // Medicinstatus — valgfri (opt-out; default: inkluderet)
  if (includeMedications) {
    const medIdx = raw.search(/Medicinstatus/i);
    if (medIdx !== -1) {
      const medSection = parseMedicationBlock(raw.slice(medIdx));
      if (medSection) output.push(medSection);
    }
  }

  return output.join("\n\n");
}
