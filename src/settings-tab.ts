import { App, PluginSettingTab, Setting } from "obsidian";
import type UrlFormatterPlugin from "../main";
import type { UrlPattern } from "./types";

/**
 * Settings UI for the URL Formatter plugin
 * Provides an interface for managing URL patterns and their configurations
 */
export class UrlFormatterSettingTab extends PluginSettingTab {
  plugin: UrlFormatterPlugin;

  constructor(app: App, plugin: UrlFormatterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("Custom url patterns").setHeading();
    containerEl.createEl("p").innerHTML =
      "Define custom url patterns to automatically format pasted links into clean Markdown.<br>Each pattern requires:";

    const ul = containerEl.createEl("ul");
    ul.createEl("li", { text: "A friendly name for identification." });
    ul.createEl("li", {
      text: "A regular expression (regex) that matches the full url.",
    });
    const liWithCode = ul.createEl("li");
    liWithCode.innerHTML =
      "An output format string using <code>$0</code> for the full match, and <code>$1</code>, <code>$2</code>, etc., for capture groups. Remember to escape special characters (like . / ?).";
    ul.createEl("li", {
      text: "You can easily toggle each pattern on or off.",
    });

    const table = containerEl.createEl("table", {
      cls: "url-formatter-patterns-table",
    });
    const thead = table.createEl("thead");
    const headerRow = thead.createEl("tr");
    headerRow.createEl("th", { text: "Enabled" });
    headerRow.createEl("th", { text: "Name" });
    headerRow.createEl("th", { text: "Regex" });
    headerRow.createEl("th", { text: "Format" });
    headerRow.createEl("th");

    const tbody = table.createEl("tbody");
    this.plugin.settings.urlPatterns.forEach((patternConfig, index) => {
      this.renderPatternRow(patternConfig, index, tbody);
    });

    new Setting(containerEl).addButton((button) =>
      button
        .setButtonText("Add new pattern")
        .setCta()
        .onClick(async () => {
          this.plugin.settings.urlPatterns.push({
            name: "",
            pattern: "",
            formatString: "",
            patternEnabled: true,
          });
          await this.plugin.saveSettings();
          this.display();
        }),
    );

    // =========================================================
    // Title Fetching Settings
    // =========================================================
    new Setting(containerEl).setName("Title Fallback").setHeading();

    containerEl.createEl("p", {
      text: "When no pattern matches, you can optionally fetch the page title from the URL.",
    });

    new Setting(containerEl)
      .setName("Enable title fetching")
      .setDesc("Automatically fetch page title when no pattern matches")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableTitleFetch)
          .onChange(async (value) => {
            this.plugin.settings.enableTitleFetch = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Fetch timeout (seconds)")
      .setDesc("Maximum time to wait for title fetch (1-30 seconds)")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.titleFetchTimeout / 1000))
          .setPlaceholder("5")
          .onChange(async (value) => {
            const seconds = Math.max(1, Math.min(30, parseInt(value) || 5));
            this.plugin.settings.titleFetchTimeout = seconds * 1000;
            await this.plugin.saveSettings();
          }),
      );

    // Behavior documentation
    const infoDiv = containerEl.createDiv("url-formatter-info-box");
    infoDiv.createEl("h4", { text: "Paste Behavior" });

    const ol = infoDiv.createEl("ol");
    ol.createEl("li", {
      text: "If text is selected → URL is wrapped with selection as link title",
    });
    ol.createEl("li", {
      text: "If no selection and pattern matches → URL is formatted using pattern",
    });
    ol.createEl("li", {
      text: "If no match and title fetch enabled → Title is fetched from URL",
    });
    ol.createEl("li", { text: "Otherwise → URL is pasted as-is" });

    containerEl.createEl("p", {
      text: "Note: Selection always takes priority over pattern matching.",
      cls: "url-formatter-note",
    });

    // =========================================================
    // Buy Me A Coffee Button
    // =========================================================
    const bmcButtonContainer = containerEl.createDiv(
      "url-formatter-bmc-container",
    );

    new Setting(bmcButtonContainer).addButton((button) => {
      button
        .setButtonText("Buy me a coffee ☕")
        .setClass("mod-cta")
        .onClick(() => {
          window.open("https://www.buymeacoffee.com/snoeckie", "_blank");
        });

      const bmcBtnEl = button.buttonEl;
      bmcBtnEl.addClass("url-formatter-bmc-button");
    });
  }

  private renderPatternRow(
    patternConfig: UrlPattern,
    _index: number,
    tbody: HTMLElement,
  ): void {
    const row = tbody.createEl("tr", { cls: "url-formatter-pattern-row" });

    // Toggle column
    const toggleCell = row.createEl("td", { cls: "url-formatter-cell-toggle" });
    toggleCell.createEl(
      "input",
      { type: "checkbox", cls: "url-formatter-toggle" },
      (el) => {
        el.checked = patternConfig.patternEnabled;
        el.addEventListener("change", async () => {
          patternConfig.patternEnabled = el.checked;
          await this.plugin.saveSettings();
        });
      },
    );

    // Name column
    const nameCell = row.createEl("td", { cls: "url-formatter-cell-name" });
    nameCell.createEl(
      "input",
      {
        type: "text",
        cls: "url-formatter-table-input",
        placeholder: 'e.g., "example.com"',
      },
      (el) => {
        el.value = patternConfig.name;
        el.addEventListener("input", () => {
          patternConfig.name = el.value;
          this.plugin.debouncedSaveSettings();
        });
      },
    );

    // Regex column
    const regexCell = row.createEl("td", { cls: "url-formatter-cell-regex" });
    regexCell.createEl(
      "input",
      {
        type: "text",
        cls: "url-formatter-table-input",
        placeholder: 'e.g., "https:\/\/..."',
      },
      (el) => {
        el.value = patternConfig.pattern;
        el.addEventListener("input", () => {
          patternConfig.pattern = el.value;
          try {
            new RegExp(el.value);
            el.removeClass("url-formatter-invalid-regex");
          } catch {
            el.addClass("url-formatter-invalid-regex");
          }
          this.plugin.debouncedSaveSettings();
        });
      },
    );

    // Format column
    const formatCell = row.createEl("td", { cls: "url-formatter-cell-format" });
    formatCell.createEl(
      "input",
      {
        type: "text",
        cls: "url-formatter-table-input",
        placeholder: 'e.g., "$2 ($1)"',
      },
      (el) => {
        el.value = patternConfig.formatString;
        el.addEventListener("input", () => {
          patternConfig.formatString = el.value;
          this.plugin.debouncedSaveSettings();
        });
      },
    );

    // Remove column
    const removeCell = row.createEl("td", { cls: "url-formatter-cell-remove" });
    removeCell.createEl(
      "button",
      {
        cls: "clickable-icon url-formatter-remove-btn",
        attr: { "aria-label": "Remove pattern" },
      },
      (el) => {
        el.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        el.addEventListener("click", async () => {
          this.plugin.settings.urlPatterns =
            this.plugin.settings.urlPatterns.filter((p) => p !== patternConfig);
          await this.plugin.saveSettings();
          this.display();
        });
      },
    );
  }
}
