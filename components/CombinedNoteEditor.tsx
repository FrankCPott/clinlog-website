"use client";

/**
 * CombinedNoteEditor — used for all non-stuegang note types.
 * Renders the entire note (with section headings) in a single WYSIWYG editor.
 */

import RichTextEditor from "./RichTextEditor";

interface Props {
  value:    string;   // HTML string produced by buildCombined()
  onChange: (v: string) => void;
}

export default function CombinedNoteEditor({ value, onChange }: Props) {
  return (
    <RichTextEditor
      content={value}
      onChange={onChange}
      placeholder="Ikke angivet"
      minHeight="360px"
    />
  );
}
