"use client";

import { useState } from "react";
import type { FieldDef } from "@/lib/noteTypes";
import { isBlank } from "@/lib/noteTypes";
import { textToHtml } from "@/lib/textToHtml";

interface Props {
  field:    FieldDef;
  value:    string;
  onChange: (key: string, value: string) => void;
}

async function copySectionToClipboard(value: string): Promise<void> {
  const htmlBody = textToHtml(value);

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html":  new Blob([htmlBody], { type: "text/html" }),
        "text/plain": new Blob([value],    { type: "text/plain" }),
      }),
    ]);
  } catch {
    // Fallback: plain-text only
    await navigator.clipboard.writeText(value);
  }
}

export default function SectionCard({ field, value, onChange }: Props) {
  const [editing, setEditing]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const empty = isBlank(value);

  const handleCopy = async () => {
    if (empty) return;
    await copySectionToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      {!field.omitLabel && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span>{field.icon}</span>
            <span className="text-sm font-medium text-slate-700">{field.label}</span>
          </div>
          <div className="flex items-center gap-1">
            {!empty && (
              <button
                onClick={handleCopy}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  copied
                    ? "text-green-600"
                    : "text-slate-400 hover:text-brand"
                }`}
              >
                {copied ? "✓ Kopieret" : "Kopiér"}
              </button>
            )}
            <button
              onClick={() => setEditing(v => !v)}
              className="text-xs text-slate-400 hover:text-brand transition-colors px-2 py-1 rounded"
            >
              {editing ? "Luk" : "Rediger"}
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="px-4 py-3">
        {editing ? (
          <textarea
            className="w-full text-sm text-slate-800 leading-relaxed focus:outline-none resize-none min-h-[80px]"
            value={value}
            onChange={e => onChange(field.key, e.target.value)}
            autoFocus
          />
        ) : (
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm leading-relaxed whitespace-pre-wrap flex-1 ${
                empty ? "text-slate-400 italic" : "text-slate-800"
              }`}
            >
              {empty ? "Ikke angivet" : value}
            </p>
            {/* For omitLabel sections: show Kopiér + Rediger in body */}
            {field.omitLabel && (
              <div className="flex items-center gap-1 shrink-0">
                {!empty && (
                  <button
                    onClick={handleCopy}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      copied
                        ? "text-green-600"
                        : "text-slate-400 hover:text-brand"
                    }`}
                  >
                    {copied ? "✓ Kopieret" : "Kopiér"}
                  </button>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-slate-400 hover:text-brand transition-colors px-2 py-1 rounded"
                >
                  Rediger
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
