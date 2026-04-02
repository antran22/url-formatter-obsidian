# Components Documentation

## Main Plugin (`main.ts`)

### Class: `UrlFormatterPlugin`

Extends `Plugin` from Obsidian API.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `settings` | `UrlFormatterSettings` | Plugin settings, loaded on startup |
| `saveDebounceTimer` | `NodeJS.Timeout \| null` | Timer for debounced saves |

#### Methods

##### `onload(): Promise<void>`
Initializes the plugin:
- Loads settings from disk
- Registers settings tab
- Registers CodeMirror paste handler extension

##### `onunload(): void`
Cleanup on plugin disable.

##### `createPasteHandler(): Extension`
Creates CodeMirror extension for paste event handling.

**Flow:**
1. Capture clipboard text
2. Check if valid URL (`isUrl()`)
3. Format URL (`formatUrl()`)
4. If formatted, prevent default paste and insert formatted text

##### `loadSettings(): Promise<void>`
Deep merges loaded settings with defaults, ensures backward compatibility for `patternEnabled` property.

##### `saveSettings(): Promise<void>`
Persists settings to Obsidian's data storage.

##### `debouncedSaveSettings(delayMs?: number): void`
Prevents excessive disk writes during rapid input (default: 500ms debounce).

##### `isUrl(text: string): boolean`
Validates URL using `new URL()` constructor.

##### `formatUrl(url: string): string | null`
Iterates through patterns, matches regex, and constructs Markdown link.

**Returns:** `[formattedText](url)` or `null` if no match

---

## Types (`src/types.ts`)

### Interface: `UrlPattern`

```typescript
interface UrlPattern {
    name: string;          // Friendly identifier
    pattern: string;       // Regex pattern string
    formatString: string;  // Output template ($0, $1, ...)
    patternEnabled: boolean; // Active/inactive toggle
}
```

### Interface: `UrlFormatterSettings`

```typescript
interface UrlFormatterSettings {
    urlPatterns: UrlPattern[]; // Array of user patterns
}
```

### Default Settings

```typescript
const DEFAULT_SETTINGS: UrlFormatterSettings = {
    urlPatterns: [{
        name: 'Tickets per company',
        pattern: 'https:\\/\\/([A-Za-z0-9-]+)\\.example\\.com\\/([A-Z0-9-]+)',
        formatString: '$2 ($1)',
        patternEnabled: true,
    }]
};
```

---

## Settings Tab (`src/settings-tab.ts`)

### Class: `UrlFormatterSettingTab`

Extends `PluginSettingTab` from Obsidian API.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `plugin` | `UrlFormatterPlugin` | Reference to main plugin instance |

#### Methods

##### `display(): void`
Renders the settings UI:
1. Clears container
2. Adds header and instructions
3. Renders each pattern item
4. Adds "Add new pattern" button
5. Adds "Buy me a coffee" CTA

##### `renderPatternItem(patternConfig, index, containerEl): void`
Renders individual pattern configuration:

**Pattern Configuration UI:**
- Pattern name (text input)
- Regular expression (text input with validation)
- Output format string (text input)
- Enable/disable toggle
- Remove button

**Features:**
- Real-time regex validation with visual feedback
- Debounced saving on input change
- Invalid regex highlighted with error styling

---

## Styles (`styles.css`)

### CSS Classes

| Class | Purpose |
|-------|---------|
| `.url-formatter-pattern-item` | Container for each pattern config |
| `.url-formatter-full-width-input` | Full-width input styling |
| `.url-formatter-margin-bottom` | Bottom margin spacing |
| `.url-formatter-invalid-regex` | Error state for invalid regex |
| `.url-formatter-bmc-container` | "Buy me a coffee" button container |
| `.url-formatter-bmc-button` | BMC button styling (yellow #FFDD00) |

---

## Build Configuration

### rollup.config.js

```javascript
{
  input: 'main.ts',
  output: {
    dir: '.',
    sourcemap: isProd ? false : 'inline',
    format: 'cjs',
    entryFileNames: 'main.js'
  },
  plugins: [typescript(), nodeResolve(), commonjs()],
  external: ['obsidian', '@codemirror/view', '@codemirror/state']
}
```

### TypeScript Configuration (tsconfig.json)

- Target: ES2021
- Module: ESNext
- Strict mode enabled
- Output: Same directory (`outDir: "./"`)
- Source maps enabled
- Unused variable warnings: error