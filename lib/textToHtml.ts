/**
 * Convert plain text (possibly with light Markdown-style formatting) to HTML
 * suitable for pasting into SP (Sundhedsplatformen) and similar rich-text editors.
 *
 * Supported patterns:
 *  - Lines starting with "- " or "• "  → <ul><li>…</li></ul>
 *  - **text**                           → <strong>text</strong>
 *  - ++text++                           → <u>text</u>  (underline)
 *  - _text_                             → <em>text</em>
 *  - Blank line                         → paragraph break
 *  - Single \n within a paragraph       → <br>
 *
 * Additional helpers:
 *  - ensureHtml(text)   — convert only if not already HTML
 *  - htmlToPlain(html)  — strip tags for plain-text use
 *  - isBlankHtml(html)  — true when the HTML represents empty content
 */

/** Escape HTML entities in a raw string (no interpretation). */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Apply inline Markdown patterns to an already-HTML-escaped line. */
function inlineFormat(escaped: string): string {
  return escaped
    // ++underline++ (process before _italic_ to avoid confusion)
    .replace(/\+\+(.+?)\+\+/g, "<u>$1</u>")
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // _italic_  (not preceded/followed by word char to avoid false matches)
    .replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>");
}

/** Convert a single line: escape + inline formatting. */
function formatLine(raw: string): string {
  return inlineFormat(esc(raw));
}

/**
 * If the input already contains HTML markup, return it unchanged.
 * Otherwise run it through textToHtml() to produce HTML from plain/Markdown text.
 * Handles old notes stored as plain text alongside new notes stored as HTML.
 */
export function ensureHtml(text: string): string {
  if (!text || !text.trim()) return "";
  if (/<[a-zA-Z][^>]*>/.test(text)) return text;
  return textToHtml(text);
}

/**
 * Strip HTML tags and decode common entities to produce plain text.
 * Used for sidebar previews and plain-text clipboard fallback.
 */
export function htmlToPlain(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/ul>/gi, "")
    .replace(/<\/ol>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * True when the HTML string represents blank/empty content
 * (e.g. Tiptap's <p></p> or an actual empty string).
 */
export function isBlankHtml(html: string): boolean {
  if (!html) return true;
  return htmlToPlain(html).trim() === "";
}

/**
 * Convert a block of plain text to an HTML fragment.
 * The result is meant to be embedded inside a wrapper element.
 */
export function textToHtml(text: string): string {
  if (!text.trim()) return "";

  // Split into paragraphs on blank lines
  const paragraphs = text.split(/\n{2,}/);

  return paragraphs
    .map(para => {
      const lines = para.split("\n").filter(l => l !== undefined);

      // All (non-empty) lines start with "- " or "• " → list
      const nonEmpty = lines.filter(l => l.trim());
      const isList = nonEmpty.length > 0 && nonEmpty.every(l => /^[-•]\s/.test(l.trim()));

      if (isList) {
        const items = lines
          .filter(l => l.trim())
          .map(l => `<li>${formatLine(l.replace(/^[-•]\s*/, "").trim())}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }

      // Regular paragraph: join lines with <br>
      const content = lines.map(formatLine).join("<br>");
      return `<p>${content}</p>`;
    })
    .join("");
}
