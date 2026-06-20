"use client";

import type { RefObject } from "react";

interface Props {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value:       string;
  onChange:    (v: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function wrapSelection(
  ta: HTMLTextAreaElement,
  value: string,
  prefix: string,
  suffix: string,
  onChange: (v: string) => void,
) {
  const { selectionStart: s, selectionEnd: e } = ta;
  const selected = value.slice(s, e);
  const before   = value.slice(0, s);
  const after    = value.slice(e);

  let newVal: string;
  let newS: number;
  let newE: number;

  if (before.endsWith(prefix) && after.startsWith(suffix)) {
    // Already wrapped — remove markers
    newVal = before.slice(0, -prefix.length) + selected + after.slice(suffix.length);
    newS = s - prefix.length;
    newE = e - prefix.length;
  } else {
    // Wrap selection
    newVal = before + prefix + selected + suffix + after;
    newS = s + prefix.length;
    newE = e + prefix.length;
  }

  onChange(newVal);
  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(newS, newE);
  });
}

function toggleList(
  ta: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
) {
  const { selectionStart: s, selectionEnd: e } = ta;

  // Expand to full lines
  const lineStart = value.lastIndexOf("\n", s - 1) + 1;
  const nextNl    = value.indexOf("\n", e);
  const lineEnd   = nextNl === -1 ? value.length : nextNl;

  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const allList = lines.filter(l => l.trim()).every(l => /^- /.test(l));

  const newLines = allList
    ? lines.map(l => l.replace(/^- /, ""))
    : lines.map(l => (/^- /.test(l) ? l : `- ${l}`));

  const newBlock = newLines.join("\n");
  onChange(value.slice(0, lineStart) + newBlock + value.slice(lineEnd));

  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(lineStart, lineStart + newBlock.length);
  });
}

// ── Toolbar definition ─────────────────────────────────────────────────────────

const TOOLS = [
  { key: "bold",      label: "B",  title: "Fed (Ctrl+B)",         cls: "font-bold"  },
  { key: "italic",    label: "I",  title: "Kursiv (Ctrl+I)",       cls: "italic"     },
  { key: "underline", label: "U",  title: "Understreget (Ctrl+U)", cls: "underline"  },
  { key: "list",      label: "≡",  title: "Punktliste",            cls: ""           },
] as const;

type ToolKey = typeof TOOLS[number]["key"];

// ── Component ──────────────────────────────────────────────────────────────────

export default function FormattingToolbar({ textareaRef, value, onChange }: Props) {
  const apply = (e: React.MouseEvent, key: ToolKey) => {
    e.preventDefault();          // keep textarea focused
    const ta = textareaRef.current;
    if (!ta) return;
    switch (key) {
      case "bold":      return wrapSelection(ta, value, "**", "**", onChange);
      case "italic":    return wrapSelection(ta, value, "_",  "_",  onChange);
      case "underline": return wrapSelection(ta, value, "++", "++", onChange);
      case "list":      return toggleList(ta, value, onChange);
    }
  };

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-100">
      {TOOLS.map(t => (
        <button
          key={t.key}
          type="button"
          title={t.title}
          onMouseDown={e => apply(e, t.key)}
          className={
            `w-7 h-7 text-xs flex items-center justify-center rounded ` +
            `text-slate-500 hover:text-slate-800 hover:bg-white ` +
            `border border-transparent hover:border-slate-200 transition-colors ` +
            t.cls
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
