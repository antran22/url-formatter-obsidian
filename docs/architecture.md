# Architecture Overview

## Project Summary

**URL Formatter** is an Obsidian plugin (v1.1.1) that automatically transforms pasted URLs into clean, readable Markdown links based on user-defined patterns.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript 5.5.3 |
| Build Tool | Rollup 4.18.0 |
| Plugin API | Obsidian API 1.7.2 |
| Editor Integration | CodeMirror 6 (view & state) |
| Package Manager | npm |

## File Structure

```
url-formatter-obsidian/
├── main.ts                 # Plugin entry point
├── src/
│   ├── types.ts            # TypeScript interfaces & defaults
│   └── settings-tab.ts     # Settings UI implementation
├── styles.css              # UI styling
├── manifest.json           # Obsidian plugin metadata
├── package.json            # npm configuration
├── tsconfig.json           # TypeScript configuration
├── rollup.config.js        # Build configuration
└── .github/workflows/
    └── release.yml         # GitHub Actions release workflow
```

## Core Architecture

### Plugin Flow

```
User Pastes URL
      │
      ▼
┌─────────────────┐
│ Paste Handler   │ (CodeMirror domEventHandlers)
│ (main.ts:27-60) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ validate URL    │ (isUrl method)
└────────┬────────┘
         │ valid?
         ▼
┌─────────────────┐
│ Format URL      │ (formatUrl method)
│ - Check patterns│
│ - Match regex   │
│ - Build link    │
└────────┬────────┘
         │ matched?
         ▼
┌─────────────────┐
│ Editor Insert   │ (view.dispatch)
│ [text](url)     │
└─────────────────┘
```

### Key Components

1. **Main Plugin Class** (`main.ts`)
   - Lifecycle management (`onload`, `onunload`)
   - Settings loading/saving
   - Paste event handling via CodeMirror extension

2. **Settings Tab** (`src/settings-tab.ts`)
   - User interface for pattern management
   - Real-time input validation
   - Debounced saving for performance

3. **Types** (`src/types.ts`)
   - `UrlPattern` interface
   - `UrlFormatterSettings` interface
   - Default settings configuration

## Build Process

### Development
```bash
npm run dev   # Rollup with watch mode, inline sourcemaps
```

### Production
```bash
npm run build  # Rollup production build, no sourcemaps
```

### Output
- `main.js` - Bundled CommonJS module (Obsidian requirement)

## CodeMirror Integration

The plugin uses CodeMirror 6's `domEventHandlers` API to intercept paste events:

```typescript
EditorView.domEventHandlers({
    paste: (event, view) => { ... }
})
```

This allows direct manipulation of the editor state when URLs are pasted.

## Extension Points

1. **Add new URL patterns**: Via settings UI
2. **Modify format strings**: Using $0, $1, $2 placeholders
3. **Toggle patterns**: Enable/disable individual patterns

## External Dependencies

All dependencies are `devDependencies`:
- `obsidian` - Plugin API types
- `@codemirror/view` - Editor view integration
- `@codemirror/state` - Editor state management
- `rollup` + plugins - Build tooling
- `typescript` - Type checking