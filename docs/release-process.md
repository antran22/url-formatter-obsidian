# Release Process

## GitHub Actions Workflow

The project uses automated releases via GitHub Actions (`.github/workflows/release.yml`).

### Trigger

Releases are triggered by pushing a git tag:

```bash
git tag v1.1.1
git push origin v1.1.1
```

### Workflow Steps

1. **Checkout** - Uses `actions/checkout@v3`
2. **Setup Node.js** - Version 18.x
3. **Build** - Runs `npm install && npm run build`
4. **Create Release** - Uses `gh release create` to create a draft release with:
   - `main.js`
   - `manifest.json`
   - `styles.css`

### Release Artifacts

Three files are included in each release:

| File | Purpose |
|------|---------|
| `main.js` | Bundled plugin code |
| `manifest.json` | Plugin metadata for Obsidian |
| `styles.css` | UI styling |

---

## Manual Release Checklist

1. **Update version numbers:**
   - `package.json` - `"version": "x.x.x"`
   - `manifest.json` - `"version": "x.x.x"`

2. **Build:**
   ```bash
   npm run build
   ```

3. **Test locally:**
   - Copy files to test vault
   - Verify functionality

4. **Commit and tag:**
   ```bash
   git add .
   git commit -m "Release vx.x.x"
   git tag vx.x.x
   git push origin master --tags
   ```

5. **Publish release:**
   - Go to GitHub Releases
   - Edit draft release
   - Publish

6. **Submit to Obsidian Community Plugins:**
   - Fork [obsidian-releaser](https://github.com/relikd/obsidian-releaser)
   - Add plugin to database
   - Create PR

---

## Version Compatibility

### Obsidian Minimum Version

Current minimum: `0.15.0`

This ensures compatibility with:
- CodeMirror 6 editor
- Modern Obsidian Plugin API

### Node.js Version

Recommended: Node.js 18.x (used in CI)

### TypeScript Version

Current: 5.5.3

---

## Build Outputs

### Development Build

```bash
npm run dev
```

- Generates `main.js`
- Inline source maps included
- Watch mode enabled

### Production Build

```bash
npm run build
```

- Generates `main.js`
- No source maps
- Optimized output

---

## Dependencies Management

### Update Dependencies

```bash
# Check outdated
npm outdated

# Update minor/patch
npm update

# Update major (careful)
npm install obsidian@latest
```

### Key Dependencies

| Package | Current | Purpose |
|---------|---------|---------|
| `obsidian` | ^1.7.2 | Plugin API types |
| `@codemirror/view` | ^6.0.0 | Editor integration |
| `@codemirror/state` | ^6.0.0 | Editor state |
| `rollup` | ^4.18.0 | Bundler |
| `typescript` | ^5.5.3 | Type checker |