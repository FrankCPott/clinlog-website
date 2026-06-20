"use client";

/**
 * SectionEditor — used for stuegang sections only.
 * Always in edit mode (no Rediger toggle). Uses the WYSIWYG RichTextEditor.
 * Includes a per-section Kopiér button.
 */

import { useState } from "react";
import type { FieldDef } from "@/lib/noteTypes";
import { isBlank } from "@/lib/noteTypes";
import { ensureHtml, htmlToPlain } from "@/lib/textToHtml";
import RichTextEditor from "./RichTextEditor";

interface Props {
  field:    FieldDef;
  value:    string;
  onChange: (key: string, value: string) => void;
}

async function copySection(label: string, value: string): Promise<void> {
  const bodyHtml = ensureHtml(value);
  const html =
    `<p><strong>${label.toUpperCase()}</strong></p>` +
    `<div style="margin-left:1.5em">${bodyHtml}</div>`;
  const plain = `${label.toUpperCase()}\n${htmlToPlain(value)}`;
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html":  new Blob([html],  { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
  } catch {
    await navigator.clipboard.writeText(plain);
  }
}

export default function SectionEditor({ field, value, onChange }: Props) {
  const [copied, setCopied] = useState(false);
  const empty = isBlank(value);

  const handleCopy = async () => {
    if (empty) return;
    await copySection(field.label, value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-5">
      {/* Section heading row — bold, no indent */}
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <span>{field.icon}</span>
          <span>{field.label}</span>
        </h3>
        {!empty && (
          <button
            onClick={handleCopy}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              copied ? "text-green-600" : "text-slate-400 hover:text-brand"
            }`}
          >
            {copied ? "✓ Kopieret" : "Kopiér"}
          </button>
        )}
      </div>

      {/* WYSIWYG editor */}
      <RichTextEditor
        content={ensureHtml(empty ? "" : value)}
        onChange={v => onChange(field.key, v)}
        placeholder="Ikke angivet"
        minHeight="72px"
      />
    </div>
  );
}
