import { App, PluginSettingTab, Setting } from "obsidian";
import type { GroupColor, TabGroup } from "./types";
import { COLOR_VALUES, GROUP_COLORS } from "./types";
import type { GroupManager } from "./GroupManager";
import type TabGroupsPlugin from "./main";

export class TabGroupsSettingTab extends PluginSettingTab {
  private manager: GroupManager;
  private onRender: () => void;

  constructor(app: App, plugin: TabGroupsPlugin, onRender: () => void) {
    super(app, plugin);
    this.manager = plugin.groupManager;
    this.onRender = onRender;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Tab Groups" });

    // General
    containerEl.createEl("h3", { text: "General" });

    new Setting(containerEl)
      .setName("Show color border on grouped tabs")
      .setDesc(
        "Draw a thin colored left border on each tab header that belongs to a group.",
      )
      .addToggle((toggle) => {
        toggle
          .setValue(this.manager.settings.showTabBorder)
          .onChange(async (value) => {
            await this.manager.updateSettings({ showTabBorder: value });
            this.onRender();
          });
      });

    // Active groups
    containerEl.createEl("h3", { text: "Active groups" });

    const groups = this.manager.groups;
    if (groups.length === 0) {
      containerEl.createEl("p", {
        text: "No groups yet. Right-click any tab header to create one.",
        cls: "tab-groups-empty-note",
      });
      return;
    }

    for (const group of groups) {
      this.renderGroupRow(containerEl, group);
    }
  }

  private renderGroupRow(containerEl: HTMLElement, group: TabGroup): void {
    const setting = new Setting(containerEl);

    // Colored dot before the name
    const nameWrap = setting.nameEl.createDiv({
      cls: "tab-group-settings-name-wrap",
    });
    const dot = nameWrap.createDiv({ cls: "tab-group-settings-dot" });
    dot.style.background = COLOR_VALUES[group.color];
    nameWrap.createSpan({ text: group.name });

    setting
      .setDesc(`${group.filePaths.length} file(s)`)
      .addDropdown((dd) => {
        dd.addOption("", "Color…");
        for (const c of GROUP_COLORS) {
          dd.addOption(c, c.charAt(0).toUpperCase() + c.slice(1));
        }
        dd.setValue(group.color).onChange(async (val) => {
          await this.manager.recolorGroup(group.id, val as GroupColor);
          this.onRender();
          this.display(); // refresh settings panel
        });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("trash-2")
          .setTooltip("Delete group")
          .onClick(async () => {
            await this.manager.deleteGroup(group.id);
            this.onRender();
            this.display();
          });
      });
  }
}
