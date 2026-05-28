# Release workflow for Obsidian plugin
# Usage: just release

# Read version from package.json
version := `jq -r '.version' package.json`

# Release: sync version to manifest.json, create tag, and push to github
release:
    # Update manifest.json with version from package.json
    jq --arg v "{{version}}" '.version = $v' manifest.json > manifest.json.tmp && mv manifest.json.tmp manifest.json
    
    # Stage the manifest.json change
    git add manifest.json package.json

    git commit -a -m "release: v{{version}}"
    
    # Create annotated tag
    git tag -a "v{{version}}" -m "Release v{{version}}"
    
    # Push both head and tag to github
    git push github --force-with-lease
    git push github "v{{version}}" --force-with-lease
