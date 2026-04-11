# URL Formatter Plugin - Project Outline

A simple Obsidian plugin that formats pasted URLs into Markdown links.

## Core Flow

When a URL is pasted:

1. **Has selection?** → Wrap as `[selected text](url)`
2. **Pattern match?** → Format using regex pattern → `[formatted](url)`
3. **Title fetch enabled?** → Fetch `<title>` from URL → `[title](url)`
4. **Fallback** → Paste URL as plain text

## Source Structure

```
main.ts                    # Plugin entry point, paste handler logic
src/
  types.ts                 # UrlPattern, UrlFormatterSettings interfaces
  settings-tab.ts          # Settings UI (add/remove/configure patterns)
  utils/
    selection.ts           # Editor selection utilities, markdown escaping
    title-fetcher.ts       # Fetch page title via Obsidian requestUrl API
    html-entities.ts       # HTML entity decoder
```

## Key Files

| File | Responsibility |
|------|----------------|
| `main.ts` | Paste event handler, URL validation, pattern application |
| `src/types.ts` | Type definitions and default settings |
| `src/settings-tab.ts` | Settings panel UI, pattern management |
| `src/utils/selection.ts` | Selection extraction, markdown link detection, title escaping |
| `src/utils/title-fetcher.ts` | HTTP fetch with timeout, title extraction from HTML |

## Pattern System

- Patterns are user-defined regex patterns stored in settings
- Each pattern has: `name`, `pattern` (regex), `formatString` (`$0`, `$1`, etc.), `patternEnabled`
- Patterns are applied in order; first match wins
- Format string replaces `$N` with regex capture groups

## Settings

- `urlPatterns`: Array of UrlPattern configs
- `enableTitleFetch`: Toggle for fallback title fetching
- `titleFetchTimeout`: Timeout in milliseconds (default: 5000ms)