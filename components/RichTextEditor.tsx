"use client";

/**
 * RichTextEditor — WYSIWYG editor built on Tiptap / ProseMirror.
 *
 * Content is stored as HTML. The toolbar operates on the active selection
 * via editor.chain().focus().toggle*().run(), keeping cursor position intact.
 *
 * Placeholder is rendered as an absolutely-positioned overlay so we avoid
 * the need for @tiptap/extension-placeholder.
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect, useState } from "react";

interface Props {
  content:      string;                 // HTML string
  onChange:     (html: string) => void;
  placeholder?: string;
  minHeight?:   string;               // e.g. "72px", "280px"
}

// ── Toolbar config ─────────────────────────────────────────────────────────────
const TOOLS = [
  { key: "bold",       label: "B",  title: "Fed (Ctrl+B)",         cls: "font-bold"  },
  { key: "italic",     label: "I",  title: "Kursiv (Ctrl+I)",       cls: "italic"     },
  { key: "underline",  label: "U",  title: "Understreget (Ctrl+U)", cls: "underline"  },
  { key: "bulletList", label: "≡",  title: "Punktliste",            cls: ""           },
] as const;

type ToolKey = typeof TOOLS[number]["key"];

// ── Component ──────────────────────────────────────────────────────────────────
export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Ikke angivet",
  minHeight = "72px",
}: Props) {
  const [isEmpty, setIsEmpty] = useState(!content || content === "<p></p>");

  const editor = useEditor({
    immediatelyRender: false,   // prevents SSR/hydration mismatch
    extensions: [
      StarterKit.configure({
        // Disable extensions we don't need
        heading:         false,
        codeBlock:       false,
        code:            false,
        blockquote:      false,
        horizontalRule:  false,
        strike:          false,
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => {
      setIsEmpty(editor.isEmpty);
      onChange(editor.getHTML());
    },
    onFocus: ({ editor }) => {
      setIsEmpty(editor.isEmpty);
    },
  });

  // Sync external content changes (e.g. user selects a different note)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.getHTML() === content) return;
    // setContent with emitUpdate:false keeps onUpdate silent → no loop
    editor.commands.setContent(content, { emitUpdate: false });
    setIsEmpty(editor.isEmpty);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]); // editor is stable after mount

  if (!editor) {
    // Skeleton while Tiptap hydrates on client
    return (
      <div
        className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-2.5 text-sm text-slate-400 italic"
        style={{ minHeight }}
      >
        {placeholder}
      </div>
    );
  }

  const apply = (e: React.MouseEvent, key: ToolKey) => {
    e.preventDefault(); // keep editor focus
    switch (key) {
      case "bold":       editor.chain().focus().toggleBold().run();       break;
      case "italic":     editor.chain().focus().toggleItalic().run();     break;
      case "underline":  editor.chain().focus().toggleUnderline().run();  break;
      case "bulletList": editor.chain().focus().toggleBulletList().run(); break;
    }
  };

  const active = (key: ToolKey): boolean => {
    switch (key) {
      case "bold":       return editor.isActive("bold");
      case "italic":     return editor.isActive("italic");
      case "underline":  return editor.isActive("underline");
      case "bulletList": return editor.isActive("bulletList");
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">

      {/* ── Formatting toolbar ── */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-100">
        {TOOLS.map(t => (
          <button
            key={t.key}
            type="button"
            title={t.title}
            onMouseDown={e => apply(e, t.key)}
            className={[
              "w-7 h-7 text-xs flex items-center justify-center rounded border transition-colors",
              active(t.key)
                ? "bg-brand text-white border-brand"
                : "text-slate-500 hover:text-slate-800 hover:bg-white border-transparent hover:border-slate-200",
              t.cls,
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Editor surface + placeholder overlay ── */}
      <div className="relative" style={{ minHeight }}>
        {/* Placeholder — visible only when editor is empty */}
        {isEmpty && (
          <div
            className="absolute inset-0 px-4 py-2.5 text-sm text-slate-400 pointer-events-none select-none"
            aria-hidden="true"
          >
            {placeholder}
          </div>
        )}
        <EditorContent
          editor={editor}
          className="tiptap-wrap"
          style={{ minHeight }}
        />
      </div>

    </div>
  );
}
