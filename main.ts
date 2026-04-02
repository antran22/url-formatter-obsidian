import { Plugin } from "obsidian";
import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { UrlFormatterSettingTab } from "./src/settings-tab";
import { UrlFormatterSettings, DEFAULT_SETTINGS } from "./src/types";
import { fetchUrlTitle } from "./src/utils/title-fetcher";
import { getSelection, isInMarkdownLink } from "./src/utils/selection";
import { escapeMarkdownTitle } from "./src/utils/selection";

/**
 * URL Formatter Plugin for Obsidian
 * Automatically formats pasted URLs into clean Markdown links using custom patterns
 */
export default class UrlFormatterPlugin extends Plugin {
  settings!: UrlFormatterSettings;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  async onload() {
    console.log("URL Formatter Plugin loaded. Registering paste handler...");

    await this.loadSettings();
    this.addSettingTab(new UrlFormatterSettingTab(this.app, this));
    this.registerEditorExtension(this.createPasteHandler());
  }

  onunload() {
    console.log("URL Formatter Plugin unloaded.");
  }

  createPasteHandler(): Extension {
    const plugin = this;

    return EditorView.domEventHandlers({
      paste: (event: ClipboardEvent, view: EditorView) => {
        try {
          const pastedText = event.clipboardData?.getData("text");

          if (!pastedText || !plugin.isUrl(pastedText)) {
            return false;
          }

          const url = pastedText.trim();

          const selection = getSelection(view);

          if (selection) {
            event.preventDefault();

            if (isInMarkdownLink(view, selection.from)) {
              view.dispatch({
                changes: {
                  from: selection.from,
                  to: selection.to,
                  insert: url,
                },
                selection: { anchor: selection.from + url.length },
              });
            } else {
              const escapedText = escapeMarkdownTitle(selection.text);
              const markdownLink = `[${escapedText}](${url})`;
              view.dispatch({
                changes: {
                  from: selection.from,
                  to: selection.to,
                  insert: markdownLink,
                },
                selection: { anchor: selection.from + markdownLink.length },
              });
            }

            return true;
          }

          const formatted = plugin.formatUrl(url);

          if (formatted) {
            event.preventDefault();

            const { from, to } = view.state.selection.main;
            view.dispatch({
              changes: { from, to, insert: formatted },
              selection: { anchor: from + formatted.length },
            });

            return true;
          }

          if (plugin.settings.enableTitleFetch) {
            event.preventDefault();

            (async () => {
              try {
                const title = await fetchUrlTitle(
                  url,
                  plugin.settings.titleFetchTimeout,
                );

                if (title) {
                  const { from, to } = view.state.selection.main;
                  const escapedTitle = escapeMarkdownTitle(title);
                  const markdownLink = `[${escapedTitle}](${url})`;

                  view.dispatch({
                    changes: { from, to, insert: markdownLink },
                    selection: { anchor: from + markdownLink.length },
                  });
                } else {
                  const { from, to } = view.state.selection.main;
                  view.dispatch({
                    changes: { from, to, insert: url },
                    selection: { anchor: from + url.length },
                  });
                }
              } catch (error) {
                console.error(
                  "URL Formatter Plugin: Title fetch error:",
                  error,
                );
                const { from, to } = view.state.selection.main;
                view.dispatch({
                  changes: { from, to, insert: url },
                  selection: { anchor: from + url.length },
                });
              }
            })();

            return true;
          }

          return false;
        } catch (error) {
          console.error("URL Formatter Plugin: Error in paste handler:", error);
          return false;
        }
      },
    });
  }

  /**
   * Loads plugin settings from disk with proper deep merge and backward compatibility
   */
  async loadSettings() {
    const loadedData = await this.loadData();

    this.settings = {
      urlPatterns:
        loadedData?.urlPatterns ??
        DEFAULT_SETTINGS.urlPatterns.map((p) => ({ ...p })),
      enableTitleFetch:
        loadedData?.enableTitleFetch ?? DEFAULT_SETTINGS.enableTitleFetch,
      titleFetchTimeout:
        loadedData?.titleFetchTimeout ?? DEFAULT_SETTINGS.titleFetchTimeout,
    };

    this.settings.urlPatterns = this.settings.urlPatterns.map((pattern) => ({
      ...pattern,
      patternEnabled: pattern.patternEnabled ?? true,
    }));
  }

  /**
   * Saves current settings to Obsidian's data storage
   */
  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * Debounced save to prevent excessive disk writes during rapid user input
   * @param delayMs - Milliseconds to wait before saving (default: 500ms)
   */
  debouncedSaveSettings(delayMs: number = 500) {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.saveSettings();
    }, delayMs);
  }

  /**
   * Checks if the provided text is a valid URL
   * @param text - The text to validate
   * @returns true if text is a valid URL, false otherwise
   */
  isUrl(text: string): boolean {
    try {
      new URL(text);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Formats a URL using configured patterns
   * @param url - The URL to format
   * @returns Markdown link with formatted text, or null if no pattern matches
   */
  formatUrl(url: string): string | null {
    // Iterate through each user-defined pattern
    for (const patternConfig of this.settings.urlPatterns) {
      if (patternConfig.patternEnabled === false) continue;

      try {
        const regex = new RegExp(patternConfig.pattern);
        const match = url.match(regex);

        if (match) {
          let formattedDisplayText = patternConfig.formatString;

          // Replace $0, $1, $2, etc., with actual capture group values
          for (let i = 0; i < match.length; i++) {
            const placeholder = `$${i}`;
            formattedDisplayText = formattedDisplayText.replaceAll(
              placeholder,
              match[i] || "",
            );
          }

          return `[${formattedDisplayText}](${url})`;
        }
      } catch (e) {
        console.error(
          `URL Formatter Plugin: Invalid regex pattern "${patternConfig.pattern}":`,
          e,
        );
      }
    }

    // No pattern matches
    return null;
  }
}
