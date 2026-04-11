import { EditorView } from "@codemirror/view";

/**
 * Represents a text selection in the editor
 */
export interface Selection {
  text: string;
  from: number;
  to: number;
}

/**
 * Check if editor has text selection
 *
 * @param view - The CodeMirror EditorView
 * @returns true if text is selected
 */
export function hasSelection(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  return from !== to;
}

/**
 * Get selected text and range
 *
 * @param view - The CodeMirror EditorView
 * @returns Selection object with text and positions, or null if no selection
 */
export function getSelection(view: EditorView): Selection | null {
  const { from, to } = view.state.selection.main;

  if (from === to) {
    return null;
  }

  const text = view.state.doc.sliceString(from, to);

  return {
    text: text,
    from: from,
    to: to,
  };
}

export function isEditorCursorInLink(view: EditorView): boolean {
  const pos = view.state.selection.main.from;
  const line = view.state.doc.lineAt(pos);
  const lineText = line.text;
  const cursorPos = pos - line.from;
  return isInLink(lineText, cursorPos);
}

export function isInLink(lineText: string, cursorPos: number): boolean {
  const allLinks = [...extractMarkdownLinks(lineText), ...extractWikilinks(lineText)];
  return allLinks.some(
    (link) => cursorPos > link.start && cursorPos <= link.end
  );
}
interface LinkBounds {
  start: number;
  end: number;
}

/**
 * Extract all markdown link boundaries from a line
 * Pattern: [text](url)
 */
function extractMarkdownLinks(lineText: string): LinkBounds[] {
  const matches: LinkBounds[] = [];
  const regex = /\[[^\]]*\]\([^)]*\)/g;
  let match;

  while ((match = regex.exec(lineText)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length - 1 });
  }

  return matches;
}

/**
 * Extract all wikilink boundaries from a line
 * Pattern: [[content]]
 */
function extractWikilinks(lineText: string): LinkBounds[] {
  const matches: LinkBounds[] = [];
  const regex = /\[\[.*?\]\]/g;
  let match;

  while ((match = regex.exec(lineText)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length - 1 });
  }

  return matches;
}

/**
 * Check if cursor/selection is at a position where URL insertion makes sense
 * (not inside code blocks, etc.)
 *
 * @param view - The CodeMirror EditorView
 * @returns true if safe to insert link
 */
export function isSafeInsertPosition(view: EditorView): boolean {
  const pos = view.state.selection.main.from;
  const line = view.state.doc.lineAt(pos);
  const lineText = line.text;

  const backtickCount = (lineText.match(/`/g) || []).length;
  if (backtickCount % 2 === 1) {
    return false;
  }

  return true;
}

/**
 * Escape special characters in title for markdown link
 *
 * @param title - The title text to escape
 * @returns Escaped title safe for markdown
 */
export function escapeMarkdownTitle(title: string): string {
  let escaped = title;

  escaped = escaped.replace(/\[/g, "\\[");
  escaped = escaped.replace(/\]/g, "\\]");

  escaped = escaped.replace(/\n/g, " ");

  escaped = escaped.replace(/\s{2,}/g, " ");

  return escaped.trim();
}
