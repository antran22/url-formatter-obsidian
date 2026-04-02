# URL Formatter for Obsidian - Codebase Documentation

## Overview

URL Formatter is an Obsidian plugin that automatically transforms pasted URLs into clean, readable Markdown links based on user-defined regex patterns.

**Version:** 1.1.1  
**Author:** Thomas Snoeck  
**License:** MIT

---

## Quick Links

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | System architecture, file structure, and data flow |
| [components.md](./components.md) | Detailed component and API documentation |
| [configuration.md](./configuration.md) | Configuration guide and pattern examples |
| [release-process.md](./release-process.md) | Release workflow and CI/CD documentation |

---

## Project at a Glance

### Core Functionality

```
Paste URL → Match Pattern → Format Link → Insert into Editor
```

### Key Files

| File | Purpose |
|------|---------|
| `main.ts` | Plugin entry point and core logic |
| `src/types.ts` | TypeScript interfaces |
| `src/settings-tab.ts` | Settings UI |
| `styles.css` | Plugin styling |

### Tech Stack

- TypeScript
- Obsidian Plugin API
- CodeMirror 6
- Rollup

---

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

---

## How It Works

1. **Event Listener**: Registers a CodeMirror paste handler
2. **URL Detection**: Validates pasted text as URL
3. **Pattern Matching**: Iterates through user patterns
4. **Formatting**: Constructs Markdown link with capture groups
5. **Insertion**: Replaces pasted text with formatted link

---

## Key Concepts

### URL Pattern

A user-defined rule that matches specific URLs:

```typescript
interface UrlPattern {
  name: string;          // "Jira Tickets"
  pattern: string;       // regex pattern
  formatString: string;  // "Jira: $1"
  patternEnabled: boolean;
}
```

### Format String

Template using `$n` placeholders:
- `$0` - Full match
- `$1`, `$2`, ... - Capture groups

### Example

```
Pattern:  https:\/\/company\.atlassian\.net\/browse\/([A-Z0-9-]+)
Format:   Jira: $1
URL:      https://company.atlassian.net/browse/ABC-123
Output:   [Jira: ABC-123](https://company.atlassian.net/browse/ABC-123)
```

---

## Architecture Decisions

### Why CodeMirror 6?

Obsidian uses CodeMirror 6 as its editor. The plugin integrates directly via `EditorView.domEventHandlers()` for seamless paste interception.

### Why Debounced Saving?

User settings are saved with a 500ms debounce to prevent excessive disk writes during rapid input.

### Why Regex Patterns?

Regular expressions provide maximal flexibility for matching various URL structures while allowing capture groups for dynamic formatting.

---

## Areas for Improvement

Based on codebase analysis, potential enhancements could include:

1. **Pattern Import/Export** - Allow users to backup/share patterns
2. **Pattern Testing** - Built-in regex tester in settings
3. **URL Preview** - Show formatted output before pasting
4. **Pattern Categories** - Group patterns by type
5. **Performance** - Cache compiled regex patterns

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run `npm run dev` for development
4. Test thoroughly
5. Submit a pull request

---

## Support

- GitHub: https://github.com/thomassnoeck/url-formatter-obsidian
- Buy Me A Coffee: https://www.buymeacoffee.com/snoeckie

---

## References

- [Obsidian Plugin API](https://docs.obsidian.md/Reference/TypeScript+API)
- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [JavaScript RegExp Reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp)