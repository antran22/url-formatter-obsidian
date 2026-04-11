# Agent Instructions

Read `OUTLINE.md` first to understand the project structure and core flow before making changes.

## Quick Reference

- **Entry point**: `main.ts` (Plugin class, paste handler)
- **Types**: `src/types.ts`
- **Settings UI**: `src/settings-tab.ts`
- **Utilities**: `src/utils/`

## Development Notes

- Uses Obsidian's `requestUrl` API for HTTP requests (handles CORS)
- CodeMirror EditorView for editor interactions
- Settings are persisted via `loadData()`/`saveData()` plugin APIs