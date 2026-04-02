import { App, PluginSettingTab, Setting } from 'obsidian';
import type UrlFormatterPlugin from '../main';
import type { UrlPattern } from './types';

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
        containerEl.createEl('p').innerHTML = 'Define custom url patterns to automatically format pasted links into clean Markdown.<br>Each pattern requires:';

        const ul = containerEl.createEl('ul');
        ul.createEl('li', { text: 'A friendly name for identification.' })
        ul.createEl('li', { text: 'A regular expression (regex) that matches the full url.' });
        const liWithCode = ul.createEl('li');
        liWithCode.innerHTML = 'An output format string using <code>$0</code> for the full match, and <code>$1</code>, <code>$2</code>, etc., for capture groups. Remember to escape special characters (like . / ?).';
        ul.createEl('li', { text: 'You can easily toggle each pattern on or off.' });

        // Render each existing URL pattern
        this.plugin.settings.urlPatterns.forEach((patternConfig, index) => {
            this.renderPatternItem(patternConfig, index, containerEl);
        });

        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('Add new pattern')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.urlPatterns.push({ name: '', pattern: '', formatString: '', patternEnabled: true });
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // =========================================================
        // Title Fetching Settings
        // =========================================================
        new Setting(containerEl).setName("Title Fallback").setHeading();

        containerEl.createEl('p', {
            text: 'When no pattern matches, you can optionally fetch the page title from the URL.'
        });

        new Setting(containerEl)
            .setName('Enable title fetching')
            .setDesc('Automatically fetch page title when no pattern matches')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableTitleFetch)
                .onChange(async (value) => {
                    this.plugin.settings.enableTitleFetch = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Fetch timeout (seconds)')
            .setDesc('Maximum time to wait for title fetch (1-30 seconds)')
            .addText(text => text
                .setValue(String(this.plugin.settings.titleFetchTimeout / 1000))
                .setPlaceholder('5')
                .onChange(async (value) => {
                    const seconds = Math.max(1, Math.min(30, parseInt(value) || 5));
                    this.plugin.settings.titleFetchTimeout = seconds * 1000;
                    await this.plugin.saveSettings();
                }));

        // Behavior documentation
        const infoDiv = containerEl.createDiv('url-formatter-info-box');
        infoDiv.createEl('h4', { text: 'Paste Behavior' });

        const ol = infoDiv.createEl('ol');
        ol.createEl('li', { text: 'If text is selected → URL is wrapped with selection as link title' });
        ol.createEl('li', { text: 'If no selection and pattern matches → URL is formatted using pattern' });
        ol.createEl('li', { text: 'If no match and title fetch enabled → Title is fetched from URL' });
        ol.createEl('li', { text: 'Otherwise → URL is pasted as-is' });

        containerEl.createEl('p', {
            text: 'Note: Selection always takes priority over pattern matching.',
            cls: 'url-formatter-note'
        });

        // =========================================================
        // Buy Me A Coffee Button
        // =========================================================
        const bmcButtonContainer = containerEl.createDiv('url-formatter-bmc-container');

        new Setting(bmcButtonContainer)
            .addButton(button => {
                button.setButtonText('Buy me a coffee ☕')
                    .setClass('mod-cta')
                    .onClick(() => {
                        window.open('https://www.buymeacoffee.com/snoeckie', '_blank');
                    });

                const bmcBtnEl = button.buttonEl;
                bmcBtnEl.addClass('url-formatter-bmc-button');
            });
    }

    /**
     * Renders a single pattern configuration item in the settings UI
     * @param patternConfig - The pattern configuration to render
     * @param index - The index of the pattern in the array
     * @param containerEl - The parent container element
     */
    private renderPatternItem(patternConfig: UrlPattern, index: number, containerEl: HTMLElement): void {
        const patternContainer = containerEl.createDiv('url-formatter-pattern-item');

        // Pattern header with toggle
        new Setting(patternContainer)
            .setName(`Pattern ${index + 1}`).setHeading()
            .addToggle(toggle => toggle
                .setValue(patternConfig.patternEnabled)
                .onChange(async (value) => {
                    patternConfig.patternEnabled = value;
                    await this.plugin.saveSettings();
                }));

        // Pattern name
        new Setting(patternContainer)
            .setName('Pattern name')
            .setDesc('Give the pattern a name so you can identify its purpose. (e.g., "Blog X", "Jira Ticket", ... )')
            .addText(text => text
                .setPlaceholder('e.g., "example.com"')
                .setValue(patternConfig.name)
                .onChange((value) => {
                    patternConfig.name = value;
                    this.plugin.debouncedSaveSettings();
                }));

        // Regular expression with validation
        new Setting(patternContainer)
            .setName('Regular expression')
            .setDesc('The regex to match the url. **Use `\\/` to escape literal forward slashes `/` and `\\.` to escape literal dots `.`')
            .addText(text => {
                text.setPlaceholder('e.g., "https:\\/\\/([A-Za-z0-9-]+)\\.example\\.com\\/([A-Z0-9-]+)"')
                    .setValue(patternConfig.pattern)
                    .onChange((value) => {
                        patternConfig.pattern = value;

                        // Validate regex and provide visual feedback
                        try {
                            new RegExp(value);
                            text.inputEl.removeClass('url-formatter-invalid-regex');
                        } catch (e) {
                            text.inputEl.addClass('url-formatter-invalid-regex');
                        }

                        this.plugin.debouncedSaveSettings();
                    });
                text.inputEl.addClass('url-formatter-full-width-input');
                text.inputEl.addClass('url-formatter-margin-bottom');
            });

        // Output format string
        new Setting(patternContainer)
            .setName('Output format string')
            .setDesc('Use $0 for the full url match, $1, $2, etc., for regex capture groups. e.g., "Blog: $1 - $2!"')
            .addText(text => {
                text.setPlaceholder('e.g., "$2 ($1)"')
                    .setValue(patternConfig.formatString)
                    .onChange((value) => {
                        patternConfig.formatString = value;
                        this.plugin.debouncedSaveSettings();
                    });
                text.inputEl.addClass('url-formatter-full-width-input');
                text.inputEl.addClass('url-formatter-margin-bottom');
            });

        // Remove button - fixed closure bug by using filter instead of splice
        new Setting(patternContainer)
            .addButton(button => button
                .setButtonText('Remove pattern')
                .setIcon('trash')
                .setClass('mod-warning')
                .onClick(async () => {
                    this.plugin.settings.urlPatterns = this.plugin.settings.urlPatterns.filter(
                        p => p !== patternConfig
                    );
                    await this.plugin.saveSettings();
                    this.display();
                }));
    }
}
