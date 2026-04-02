# Configuration Guide

## Plugin Settings

URL patterns are configured through Obsidian's settings panel under **Community Plugins > URL Formatter**.

### Pattern Structure

Each URL pattern consists of:

| Field            | Type    | Description             | Example                                            |
| ---------------- | ------- | ----------------------- | -------------------------------------------------- |
| `name`           | string  | Friendly identifier     | "Jira Tickets"                                     |
| `pattern`        | string  | Regex pattern (escaped) | `https:\/\/.*atlassian\.net\/browse\/([A-Z0-9-]+)` |
| `formatString`   | string  | Output template         | `Jira: $1`                                         |
| `patternEnabled` | boolean | Active toggle           | `true`                                             |

### Regex Escaping

**Important:** Forward slashes and dots must be escaped in patterns:

- `/` → `\/`
- `.` → `\.`

Example pattern:

```
Pattern URL:   https://company.atlassian.net/browse/PROJ-123
Regex:         https:\/\/company\.atlassian\.net\/browse\/([A-Z0-9-]+)
```

### Format String Placeholders

| Placeholder | Meaning              |
| ----------- | -------------------- |
| `$0`        | Full URL match       |
| `$1`        | First capture group  |
| `$2`        | Second capture group |
| `$n`        | Nth capture group    |

---

## Common Pattern Examples

### Jira Tickets

```
Name:        Jira Tickets
Pattern:     https:\/\/([A-Za-z0-9-]+)\.atlassian\.net\/browse\/([A-Z0-9-]+)
Format:      $2 ($1)
```

**Input:** `https://mycompany.atlassian.net/browse/PROJ-456`
**Output:** `[PROJ-456 (mycompany)](https://mycompany.atlassian.net/browse/PROJ-456)`

---

### GitHub Issues/PRs

```
Name:        GitHub Issues
Pattern:     https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9-]+)\/(issues|pull)\/([0-9]+)
Format:      $1/$2 #$4
```

**Input:** `https://github.com/owner/repo/issues/123`
**Output:** `[owner/repo #123](https://github.com/owner/repo/issues/123)`

---

### Blog Posts

```
Name:        Blog Posts
Pattern:     https:\/\/blog\.example\.com\/([0-9]{4})\/([a-z0-9-]+)
Format:      Blog ($1): $2
```

**Input:** `https://blog.example.com/2024/my-post`
**Output:** `[Blog (2024): my-post](https://blog.example.com/2024/my-post)`

---

### Documentation Pages

```
Name:        Docs
Pattern:     https:\/\/docs\.company\.com\/([a-z0-9-/]+)
Format:      Docs: $1
```

**Input:** `https://docs.company.com/getting-started`
**Output:** `[Docs: getting-started](https://docs.company.com/getting-started)`

---

## Settings Storage

Settings are stored in `.obsidian/plugins/url-formatter/data.json`:

```json
{
  "urlPatterns": [
    {
      "name": "Pattern Name",
      "pattern": "regex-string",
      "formatString": "template",
      "patternEnabled": true
    }
  ]
}
```

## Debounced Saving

The plugin uses debounced saving (500ms default) to prevent excessive disk writes when editing patterns rapidly. This is configured via `debouncedSaveSettings()` in `main.ts:90-97`.

## Backward Compatibility

When loading settings, the plugin ensures `patternEnabled` property exists (defaulting to `true` for patterns missing this field):

```typescript
this.settings.urlPatterns = this.settings.urlPatterns.map((pattern) => ({
  ...pattern,
  patternEnabled: pattern.patternEnabled ?? true,
}));
```

---

## Development Configuration

### Local Development

```bash
# Install dependencies
npm install

# Watch mode (rebuild on changes)
npm run dev

# Production build
npm run build
```

### Testing the Plugin

1. Build the plugin (`npm run dev`)
2. Copy `main.js`, `manifest.json`, `styles.css` to `.obsidian/plugins/url-formatter/`
3. Enable plugin in Obsidian settings

### Plugin Manifest (manifest.json)

```json
{
  "id": "url-formatter",
  "name": "URL Formatter",
  "version": "1.1.1",
  "minAppVersion": "0.15.0",
  "description": "...",
  "author": "Thomas Snoeck",
  "authorUrl": "https://www.thomassnoeck.com",
  "isDesktopOnly": false
}
```

---

## Troubleshooting

### Common Issues

1. **Pattern not matching**
   - Ensure special characters are escaped (`\/`, `\.`)
   - Test regex at regex101.com
   - Check `patternEnabled` is `true`

2. **Link not formatting**
   - URL must be valid (passes `new URL()`)
   - Pattern must match full URL
   - Check browser console for errors

3. **Settings not saving**
   - Check Obsidian's console for errors
   - Verify `.obsidian/plugins/url-formatter/data.json` exists
