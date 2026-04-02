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

/**
 * Check if cursor/selection is inside markdown link parentheses
 * Prevents double-wrapping: [text]() cursor here
 *
 * @param view - The CodeMirror EditorView
 * @param pos - Position to check
 * @returns true if inside markdown link parentheses
 */
export function isInMarkdownLink(view: EditorView, pos: number): boolean {
  const line = view.state.doc.lineAt(pos);
  const lineText = line.text;
  const cursorPos = pos - line.from;

  let openParenIndex = -1;
  let depth = 0;

  for (let i = cursorPos - 1; i >= 0; i--) {
    if (lineText[i] === ")" && i < cursorPos) {
      depth++;
    } else if (lineText[i] === "(") {
      if (depth === 0) {
        openParenIndex = i;
        break;
      }
      depth--;
    }
  }

  if (openParenIndex === -1) return false;

  if (openParenIndex > 0 && lineText[openParenIndex - 1] === "]") {
    let bracketDepth = 0;
    for (let i = openParenIndex - 2; i >= 0; i--) {
      if (lineText[i] === "]") {
        bracketDepth++;
      } else if (lineText[i] === "[") {
        if (bracketDepth === 0) {
          return true;
        }
        bracketDepth--;
      }
    }
  }

  return false;
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
