# Implementation Plan: Enhanced URL Formatting Features

## Overview

Enhance URL Formatter plugin with two new features:
1. **Selection-based pasting**: Use selected text as link title when pasting URLs
2. **Title fetching**: Optionally fetch page title when no regex matches

---

## Behavior Flow

```
User Pastes URL
      │
      ▼
┌─────────────────┐
│ Has Selection?  │
└────────┬────────┘
         │
    YES  │  NO
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌─────────────┐
│Use sel │ │Match Regex? │
│as title│ └──────┬──────┘
└────────┘        │
             YES  │  NO
             ┌────┴────┐
             ▼         ▼
        ┌────────┐ ┌──────────────┐
        │Format   │ │Title Fetch   │
        │w/ regex │ │Enabled?      │
        └────────┘ └──────┬───────┘
                           │
                      YES  │  NO
                      ┌────┴────┐
                      ▼         ▼
                ┌──────────┐ ┌────────┐
                │Fetch URL │ │Paste   │
                │Title     │ │bare URL│
                └──────────┘ └────────┘
```

## Priority Rules

1. **Selection overrides all** - If text is selected, use it as link title
2. **Regex patterns checked next** - If no selection, try patterns
3. **Title fetch as fallback** - If no match and enabled, fetch title
4. **Bare URL last resort** - If all else fails, paste URL as-is

---

## Phase 1: Core Infrastructure Changes

### 1.1 Update Types (`src/types.ts`)

Add new settings:

```typescript
export interface UrlFormatterSettings {
    urlPatterns: UrlPattern[];
    // New settings
    enableTitleFetch: boolean;       // Enable/disable title fetching
    titleFetchTimeout: number;       // Timeout in ms (default: 5000)
}

export const DEFAULT_SETTINGS: UrlFormatterSettings = {
    urlPatterns: [
        // ... existing patterns
    ],
    enableTitleFetch: false,         // Default to disabled
    titleFetchTimeout: 5000,         // 5 second timeout
};
```

**Changes:**
- Add `enableTitleFetch: boolean` - toggle for title fetching feature
- Add `titleFetchTimeout: number` - configurable timeout for HTTP requests
- Update `DEFAULT_SETTINGS` with new fields

---

### 1.2 Create New Utility Module (`src/utils/title-fetcher.ts`)

New file for title fetching logic:

```typescript
import { requestUrl, RequestUrlParam } from 'obsidian';

/**
 * Fetches the HTML title from a URL
 * Uses Obsidian's requestUrl API for proper CORS handling
 *
 * @param url - The URL to fetch title from
 * @param timeout - Maximum time to wait in milliseconds
 * @returns The page title, or null if fetch failed
 */
export async function fetchUrlTitle(
    url: string,
    timeout: number
): Promise<string | null> {
    try {
        const options: RequestUrlParam = {
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ObsidianURLFormatter/1.0)'
            },
            timeout: timeout
        };

        const response = await requestUrl(options);
        const html = response.text;

        // Extract title from HTML
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
        if (!titleMatch || !titleMatch[1]) {
            return null;
        }

        // Decode HTML entities and clean up
        let title = titleMatch[1].trim();
        title = decodeHtmlEntities(title);

        return title || null;
    } catch (error) {
        console.error('URL Formatter: Failed to fetch title:', error);
        return null;
    }
}

/**
 * Decodes common HTML entities
 */
function decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
        '&#39;': "'",
        '&nbsp;': ' ',
        // Add more as needed
    };

    return text.replace(/&[^;]+;/g, entity => {
        return entities[entity] || entity;
    });
}
```

**Key Implementation Details:**
- Use Obsidian's `requestUrl` API (handles CORS properly)
- Timeout configurable via settings
- Parse `<title>` tag using regex
- Decode HTML entities (`&amp;` → `&`, etc.)
- Handle errors gracefully, return null on failure
- Log errors to console for debugging

---

### 1.3 Create Selection Handler Module (`src/utils/selection.ts`)

Adapt logic from vendor plugin for CodeMirror 6:

```typescript
import { EditorView } from '@codemirror/view';

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
        return null; // No selection
    }

    const text = view.state.doc.sliceString(from, to);

    return {
        text: text,
        from: from,
        to: to
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

    // Look backwards for opening parenthesis preceded by ]
    let openParenIndex = -1;
    let depth = 0;

    // First, check if we're inside parentheses
    for (let i = cursorPos - 1; i >= 0; i--) {
        if (lineText[i] === ')' && i < cursorPos) {
            depth++;
        } else if (lineText[i] === '(') {
            if (depth === 0) {
                openParenIndex = i;
                break;
            }
            depth--;
        }
    }

    if (openParenIndex === -1) return false;

    // Now check if this parenthesis is preceded by ']'
    if (openParenIndex > 0 && lineText[openParenIndex - 1] === ']') {
        // Look for matching '[' or '!['
        let bracketDepth = 0;
        for (let i = openParenIndex - 2; i >= 0; i--) {
            if (lineText[i] === ']') {
                bracketDepth++;
            } else if (lineText[i] === '[') {
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
    // Basic check - can be expanded later
    const pos = view.state.selection.main.from;
    const line = view.state.doc.lineAt(pos);
    const lineText = line.text;

    // Don't insert inside code blocks (backticks)
    // This is a simple check; could be enhanced
    const backtickCount = (lineText.match(/`/g) || []).length;
    if (backtickCount % 2 === 1) {
        return false; // Inside inline code
    }

    return true;
}
```

**Key Implementation Details:**
- Adapt vendor's logic to work with CodeMirror 6 API
- `EditorView` instead of `Editor`
- State access via `view.state` and `view.state.doc`
- Selection via `view.state.selection.main`
- Handle edge cases: empty selection, multi-line selection, etc.

---

### 1.4 Create HTML Entity Decoder (`src/utils/html-entities.ts`)

```typescript
/**
 * Complete HTML entity decoder
 * Handles both named entities and numeric entities
 */

const NAMED_ENTITIES: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&lsquo;': ''',
    '&rsquo;': ''',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&bull;': '•',
    '&middot;': '·',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&cent;': '¢',
    // Add more entities as needed
};

/**
 * Decode HTML entities in text
 *
 * @param text - Text containing HTML entities
 * @returns Decoded text
 */
export function decodeHtmlEntities(text: string): string {
    return text
        // Decode named entities
        .replace(/&[^;]+;/g, entity => {
            return NAMED_ENTITIES[entity] || entity;
        })
        // Decode numeric entities (decimal)
        .replace(/&#(\d+);/g, (match, num) => {
            return String.fromCharCode(parseInt(num, 10));
        })
        // Decode numeric entities (hexadecimal)
        .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
}
```

---

## Phase 2: Main Plugin Logic Changes

### 2.1 Refactor `main.ts` - Paste Handler

**Current implementation (simplified):**
```typescript
createPasteHandler(): Extension {
    return EditorView.domEventHandlers({
        paste: (event, view) => {
            const pastedText = event.clipboardData?.getData('text');
            if (pastedText && isUrl(pastedText)) {
                const formatted = formatUrl(pastedText);
                if (formatted) {
                    event.preventDefault();
                    view.dispatch({ ... });
                }
            }
        }
    });
}
```

**New implementation (simplified):**
```typescript
import { fetchUrlTitle } from './src/utils/title-fetcher';
import { getSelection, isInMarkdownLink } from './src/utils/selection';

createPasteHandler(): Extension {
    const plugin = this;

    return EditorView.domEventHandlers({
        paste: async (event: ClipboardEvent, view: EditorView) => {
            try {
                const pastedText = event.clipboardData?.getData('text');

                if (!pastedText || !plugin.isUrl(pastedText)) {
                    return false; // Not a URL, let default paste happen
                }

                const url = pastedText.trim();

                // PRIORITY 1: Check for text selection
                const selection = getSelection(view);

                if (selection) {
                    // Selection takes priority - use selected text as link title
                    event.preventDefault();

                    // Check if we're inside markdown link parentheses
                    if (isInMarkdownLink(view, selection.from)) {
                        // Inside []() - just insert URL
                        view.dispatch({
                            changes: { from: selection.from, to: selection.to, insert: url },
                            selection: { anchor: selection.from + url.length }
                        });
                    } else {
                        // Normal case: wrap selection with URL
                        const markdownLink = `[${selection.text}](${url})`;
                        view.dispatch({
                            changes: { from: selection.from, to: selection.to, insert: markdownLink },
                            selection: { anchor: selection.from + markdownLink.length }
                        });
                    }

                    return true;
                }

                // PRIORITY 2: Try regex patterns
                const formatted = plugin.formatUrl(url);

                if (formatted) {
                    event.preventDefault();

                    const { from, to } = view.state.selection.main;
                    view.dispatch({
                        changes: { from, to, insert: formatted },
                        selection: { anchor: from + formatted.length }
                    });

                    return true;
                }

                // PRIORITY 3: Try title fetch if enabled
                if (plugin.settings.enableTitleFetch) {
                    const title = await fetchUrlTitle(url, plugin.settings.titleFetchTimeout);

                    if (title) {
                        event.preventDefault();

                        const { from, to } = view.state.selection.main;
                        const markdownLink = `[${title}](${url})`;

                        view.dispatch({
                            changes: { from, to, insert: markdownLink },
                            selection: { anchor: from + markdownLink.length }
                        });

                        return true;
                    }
                }

                // PRIORITY 4: Fallback - let default paste happen
                // URL is valid but no formatting applies
                return false;

            } catch (error) {
                console.error('URL Formatter Plugin: Error in paste handler:', error);
                return false;
            }
        }
    });
}
```

**Key Changes:**
- Changed from synchronous to `async` paste handler
- Added priority-based decision tree
- Selection handling with `isInMarkdownLink` check
- Title fetching with async/await
- Proper event.preventDefault() placement

---

### 2.2 Update Default Settings (`src/types.ts`)

```typescript
export const DEFAULT_SETTINGS: UrlFormatterSettings = {
    urlPatterns: [
        {
            name: 'Tickets per company',
            pattern: 'https:\\/\\/([A-Za-z0-9-]+)\\.example\\.com\\/([A-Z0-9-]+)',
            formatString: '$2 ($1)',
            patternEnabled: true,
        },
    ],
    enableTitleFetch: false,      // NEW: Disabled by default
    titleFetchTimeout: 5000,      // NEW: 5 seconds default
};
```

---

### 2.3 Update Settings Loading (`main.ts`)

```typescript
async loadSettings() {
    const loadedData = await this.loadData();

    this.settings = {
        urlPatterns: loadedData?.urlPatterns ?? DEFAULT_SETTINGS.urlPatterns.map(p => ({ ...p })),
        enableTitleFetch: loadedData?.enableTitleFetch ?? DEFAULT_SETTINGS.enableTitleFetch,
        titleFetchTimeout: loadedData?.titleFetchTimeout ?? DEFAULT_SETTINGS.titleFetchTimeout,
    };

    // Ensure backward compatibility
    this.settings.urlPatterns = this.settings.urlPatterns.map(pattern => ({
        ...pattern,
        patternEnabled: pattern.patternEnabled ?? true
    }));
}
```

---

## Phase 3: Settings UI Updates

### 3.1 Update Settings Tab (`src/settings-tab.ts`)

Add new settings section after the "Add new pattern" button:

```typescript
display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ... existing pattern settings ...

    // =========================================================
    // Title Fetching Settings
    // =========================================================
    new Setting(containerEl).setName("Title Fallback").setHeading();

    containerEl.createEl('p', {
        text: 'When no pattern matches, you can optionally fetch the page title from the URL.'
    });

    new Setting(containerEl)
        .setName('Enable title fetching')
        .setDesc('Automatically fetch page title when no pattern matches')
        .addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableTitleFetch)
            .onChange(async (value) => {
                this.plugin.settings.enableTitleFetch = value;
                await this.plugin.saveSettings();
            }));

    new Setting(containerEl)
        .setName('Fetch timeout (seconds)')
        .setDesc('Maximum time to wait for title fetch (1-30 seconds)')
        .addText(text => text
            .setValue(String(this.plugin.settings.titleFetchTimeout / 1000))
            .setPlaceholder('5')
            .onChange(async (value) => {
                const seconds = Math.max(1, Math.min(30, parseInt(value) || 5));
                this.plugin.settings.titleFetchTimeout = seconds * 1000;
                await this.plugin.saveSettings();
            }));

    // ... existing BMC button ...
}
```

### 3.2 Add Behavior Documentation in Settings

Add informational text explaining the paste priority order:

```typescript
// In settings tab, after title fetch settings
const infoDiv = containerEl.createDiv('url-formatter-info-box');
infoDiv.createEl('h4', { text: 'Paste Behavior' });

const ol = infoDiv.createEl('ol');
ol.createEl('li', { text: 'If text is selected → URL is wrapped with selection as link title' });
ol.createEl('li', { text: 'If no selection and pattern matches → URL is formatted using pattern' });
ol.createEl('li', { text: 'If no match and title fetch enabled → Title is fetched from URL' });
ol.createEl('li', { text: 'Otherwise → URL is pasted as-is' });

containerEl.createEl('p', {
    text: 'Note: Selection always takes priority over pattern matching.',
    cls: 'url-formatter-note'
});
```

### 3.3 Add CSS for Info Box (`styles.css`)

```css
/* Information box styling */
.url-formatter-info-box {
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-m);
    padding: var(--size-4-3);
    margin: var(--size-4-4) 0;
    background-color: var(--background-secondary);
}

.url-formatter-info-box h4 {
    margin-top: 0;
    margin-bottom: var(--size-4-2);
}

.url-formatter-info-box ol {
    margin: 0;
    padding-left: var(--size-4-4);
}

.url-formatter-note {
    font-style: italic;
    color: var(--text-muted);
    margin-top: var(--size-4-2);
}
```

---

## Phase 4: Dependencies

### 4.1 No New NPM Dependencies

All functionality uses built-in Obsidian APIs:
- `requestUrl` - for fetching URLs (handles CORS)
- `EditorView` - for selection handling (CodeMirror 6)

### 4.2 Update Imports in `main.ts`

```typescript
import { Plugin } from 'obsidian';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { UrlFormatterSettingTab } from './src/settings-tab';
import { UrlFormatterSettings, DEFAULT_SETTINGS } from './src/types';
import { fetchUrlTitle } from './src/utils/title-fetcher';
import { getSelection, isInMarkdownLink, Selection } from './src/utils/selection';
```

---

## Phase 5: Edge Cases & Error Handling

### 5.1 Comprehensive Edge Cases

| Case | Behavior | Implementation |
|------|----------|----------------|
| Empty clipboard | Do nothing | Check `!pastedText` early |
| Invalid URL | Do nothing | Check `!isUrl()` |
| Selection + invalid URL | Do nothing | Check `isUrl()` before selection check |
| Multi-line selection | Encode newlines in link title | Replace `\n` with ` ` in selection |
| Title fetch timeout | Paste bare URL | `try/catch` with timeout |
| Title fetch CORS error | Paste bare URL | `try/catch` around `requestUrl` |
| Empty `<title>` tag | Paste bare URL | Check `!title` before insert |
| Title with HTML entities | Decode entities | Use `decodeHtmlEntities()` |
| Very long title (500+ chars) | Truncate title | `title.slice(0, 500)` |
| Title with special chars | Escape for markdown | Escape `[]` in title |
| Inside markdown link `[]()` | Insert URL only | `isInMarkdownLink()` check |
| Selection inside code block | Still insert | Basic check, can enhance |
| URL with spaces | Wrap in `<>` | Use angle brackets |
| Image URL (`.png`, `.jpg`) | Option: `![](url)` | Feature for future |

### 5.2 Enhanced Error Handling in `title-fetcher.ts`

```typescript
export async function fetchUrlTitle(
    url: string,
    timeout: number
): Promise<string | null> {
    // Validate URL
    if (!url || typeof url !== 'string') {
        return null;
    }

    // Check if URL protocol is fetchable
    const validProtocols = ['http:', 'https:'];
    try {
        const urlObj = new URL(url);
        if (!validProtocols.includes(urlObj.protocol)) {
            return null; // Don't fetch file://, obsidian://, etc.
        }
    } catch {
        return null;
    }

    try {
        const response = await requestUrl({
            url: url,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ObsidianURLFormatter/1.0)'
            },
            timeout: timeout
        });

        // Check content type
        const contentType = response.headers?.['content-type'] || '';
        if (!contentType.includes('text/html')) {
            return null; // Not HTML
        }

        const html = response.text;

        // Extract title
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
        if (!titleMatch || !titleMatch[1]) {
            return null;
        }

        let title = titleMatch[1].trim();

        // Clean up title
        title = decodeHtmlEntities(title);
        title = title.replace(/\s+/g, ' '); // Normalize whitespace

        // Truncate if too long
        if (title.length > 500) {
            title = title.substring(0, 500) + '...';
        }

        return title || null;
    } catch (error) {
        // Log for debugging but don't throw
        if (error instanceof Error) {
            console.warn('URL Formatter: Title fetch failed:', error.message);
        }
        return null;
    }
}
```

### 5.3 Title Character Escaping

Titles might contain characters that interfere with Markdown:

```typescript
function escapeMarkdownTitle(title: string): string {
    // Escape square brackets
    title = title.replace(/\[/g, '\\[');
    title = title.replace(/\]/g, '\\]');

    // Replace newlines with spaces
    title = title.replace(/\n/g, ' ');

    // Collapse multiple spaces
    title = title.replace(/\s{2,}/g, ' ');

    return title.trim();
}
```

Update title fetching to useescape:

```typescript
const title = await fetchUrlTitle(url, timeout);
if (title) {
    const escapedTitle = escapeMarkdownTitle(title);
    const markdownLink = `[${escapedTitle}](${url})`;
    // ...insert
}
```

---

## Phase 6: Testing Plan

### 6.1 Manual Testing Checklist

#### Selection Behavior

- [ ] Paste URL with single word selected → `[word](url)`
- [ ] Paste URL with multiple words selected → `[multiple words](url)`
- [ ] Paste URL with multi-line selection → newlines replaced with spaces
- [ ] Paste URL with selection containing `[]` characters → escaped properly
- [ ] Paste URL when cursor inside `[]()` → URL inserted without wrapping
- [ ] Paste non-URL with text selected → default paste behavior

#### Pattern Matching

- [ ] Existing regex patterns still work
- [ ] Pattern matching ignored when text is selected
- [ ] Pattern matching works when no selection

#### Title Fetching

- [ ] Title fetch disabled → bare URL pasted when no pattern matches
- [ ] Title fetch enabled → `[Page Title](url)` when no pattern matches
- [ ] Title fetch timeout (set to 1s, use slow URL) → bare URL pasted
- [ ] Title fetch on 404 URL → bare URL pasted
- [ ] Title fetch on non-HTML (PDF, image) → bare URL pasted
- [ ] Title with HTML entities (`&amp;`) properly decoded
- [ ] Title with special characters properly escaped
- [ ] Title longer than 500 chars truncated

#### Integration

- [ ] All three features work together correctly
- [ ] Settings saved and loaded properly
- [ ] No console errors in normal operation
- [ ] Plugin loads/unloads cleanly

### 6.2 Test URLs

| URL | Expected Behavior |
|-----|------------------|
| `https://github.com` | Title: "GitHub: Let's build from here" or similar |
| `https://obsidian.md` | Title: "Obsidian - Sharpen your thinking" |
| `https://example.com` | Title: "Example Domain" |
| `https://httpstat.us/404` | Fetch fails → bare URL |
| `https://httpstat.us/200?sleep=10000` | Timeout → bare URL |
| `file:///local/file.html` | Invalid protocol → no fetch |
| `https://test.com/<script>` | Invalid URL → no processing |

---

## Phase 7: Migration & Backward Compatibility

### 7.1 Settings Migration

```typescript
async loadSettings() {
    const loadedData = await this.loadData();

    this.settings = {
        // Existing settings with defaults
        urlPatterns: loadedData?.urlPatterns ?? DEFAULT_SETTINGS.urlPatterns.map(p => ({ ...p })),

        // New settings with defaults
        enableTitleFetch: loadedData?.enableTitleFetch ?? DEFAULT_SETTINGS.enableTitleFetch,
        titleFetchTimeout: loadedData?.titleFetchTimeout ?? DEFAULT_SETTINGS.titleFetchTimeout,
    };

    // Ensure patternEnabled exists (backward compat)
    this.settings.urlPatterns = this.settings.urlPatterns.map(pattern => ({
        ...pattern,
        patternEnabled: pattern.patternEnabled ?? true
    }));
}
```

### 7.2 No Breaking Changes

- New features are opt-in (`enableTitleFetch: false` by default)
- Existing pattern functionality unchanged
- Selection handling is transparent addition
- Settings format backward compatible

---

## Phase 8: Performance Considerations

### 8.1 Synchronous vsAsynchronous Operations

| Operation | Type | Impact |
|-----------|------|--------|
| Selection check | Synchronous | Negligible |
| URL validation | Synchronous | Negligible (uses `new URL()`) |
| Regex matching | Synchronous | Fast, existing behavior |
| Title fetching | Asynchronous | Network request, timeouts handled |

### 8.2 Optimization Opportunities

- Title fetching is fire-and-forget (await but no caching)
- No blocking of editor UI during fetch
- Timeout prevents indefinite waiting
- Failed fetch doesn't interrupt paste

### 8.3 Future Enhancements

- Title caching (optional)
- Background pre-fetching (optional)
- Batch title fetching (if multiple URLs)
- Custom headers for title fetch

---

## Phase 9: Documentation Updates

### 9.1 Update README.md

Add sections:

```markdown
## Features

### Pattern-Based Formatting
Automatically format URLs using custom regex patterns.

### Selection-Based Links
Select text and paste a URL to create a link with your selection as the title.

### Title Fallback
Optionally fetch page titles when no pattern matches.

## Paste Behavior Priority

1. **Text selected** → `[selection](url)`
2. **Pattern matches** → formatted per pattern
3. **Title fetch enabled** → `[fetched title](url)`
4. **No matches** → pastes URL as-is

## Settings

### URL Patterns
Define custom regex patterns for formatting specific URLs.

### Title Fallback
- **Enable title fetching**: Fetch page titles when no pattern matches
- **Fetch timeout**: Maximum wait time for title fetch (1-30 seconds)
```

### 9.2 Update docs/architecture.md

Add new files to file structure:

```
├── src/
│   ├── types.ts
│   ├── settings-tab.ts
│   └── utils/
│       ├── title-fetcher.ts    # NEW
│       ├── selection.ts        # NEW
│       └── html-entities.ts    # NEW
```

Update flow diagram to reflect new behavior.

### 9.3 Add docs/utilities.md

Document new utility modules:

```markdown
# Utility Modules

## title-fetcher.ts

Handles fetching page titles from URLs using Obsidian's requestUrl API.

### Functions

- `fetchUrlTitle(url: string, timeout: number): Promise<string | null>`

...

## selection.ts

Handles text selection detection in CodeMirror 6 editor.

### Functions

- `hasSelection(view: EditorView): boolean`
- `getSelection(view: EditorView): Selection | null`
- `isInMarkdownLink(view: EditorView, pos: number): boolean`

...
```

---

## Phase 10: Release Checklist

### Pre-Release

- [ ] All manual tests pass
- [ ] No console errors in testing
- [ ] Documentation updated
- [ ] Version bumped in `manifest.json` and `package.json`
- [ ] CHANGELOG updated with new features
- [ ] Tested on Windows, macOS, Linux (if possible)

### Version Bump

```json
// manifest.json
{
  "version": "1.2.0"  // Minor bump for new features
}

// package.json
{
  "version": "1.2.0"
}
```

### CHANGELOG.md

```markdown
## 1.2.0

### Added

- **Selection-based pasting**: Select text and paste URL to create `[selection](url)`
- **Title fallback**: Optionally fetch page title when no pattern matches
- **Title fetch timeout**: Configurable timeout (1-30 seconds)

### Changed

- Paste handler now respects priority: selection > pattern > title fetch > bare URL
- Settings UI reorganized with clearer sections

### Fixed

- Improved error handling for failed title fetches
- Better handling of special characters in titles
```

---

## Implementation Order

### Recommended Sequence

1. **Create utility files** (`src/utils/`)
   - `selection.ts` - foundation for selection handling
   - `html-entities.ts` - simple, no dependencies
   - `title-fetcher.ts` - requires `html-entities.ts`

2. **Update types** (`src/types.ts`)
   - Add new settings fields
   - Update `DEFAULT_SETTINGS`

3. **Refactor main.ts**
   - Add imports
   - Rewrite paste handler with priority flow
   - Update `loadSettings()`

4. **Update settings UI** (`src/settings-tab.ts`)
   - Add title fetch settings
   - Add informational text

5. **Update styles** (`styles.css`)
   - Add info box styles

6.**Test thoroughly**
   - Run through entire testing checklist
   - Test edge cases
   - Verify no regressions

7. **Update documentation**
   - README.md
   - docs/ files

8. **Version bump and release prep**

---

## Code Quality Checklist

- [ ] TypeScript strict mode compliant
- [ ] No `any` types without justification
- [ ] All async functions have proper error handling
- [ ] Console logging for debugging (not user-facing)
- [ ] No hardcoded values (use constants/config)
- [ ] Functions documented with JSDoc comments
- [ ] Complex logic has inline comments
- [ ] No unused imports or variables
- [ ] Consistent code formatting (match existing style)

---

## Estimated Effort

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Infrastructure | 2-3 hours |
| Phase 2: Main Logic | 2-3 hours |
| Phase 3: Settings UI | 1 hour |
| Phase 4: Dependencies | 30 mins |
| Phase 5: Edge Cases | 2 hours |
| Phase 6:Testing | 2-3 hours |
| Phase 7: Migration | 30 mins |
| Phase 8: Performance | 30 mins |
| Phase 9: Documentation | 1 hour |
| Phase 10: Release | 30 mins |
| **Total** | **12-14 hours** |

---

## Risk Assessment

### Low Risk
- Selection handling (well-defined scope)
- Settings UI additions (isolated changes)
- Type updates (backward compatible)

### Medium Risk
- Title fetching (network operations, potential failures)
- Async paste handler (proper event handling)

### Mitigation Strategies
- Comprehensive error handling with try/catch
- Timeouts for all network operations
- Fallback to bare URL on any failure
- Extensive testing across scenarios

---

## Future Enhancements (Out of Scope)

- Title caching for repeated URLs
- Image URL detection → `![](url)` formatting
- Custom title extraction selectors (JSON-LD, OpenGraph)
- Pattern matching with title fallback combination
- Keyboard shortcuts for different behaviors
- URL validation improvements (broken link checking)
- Support for more URL schemes (mailto:, tel:)