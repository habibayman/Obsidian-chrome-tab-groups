import { Plugin, WorkspaceLeaf } from "obsidian";
import { GroupManager } from "./GroupManager";
import { DOMRenderer } from "./DOMRenderer";
import { ContextMenuHandler } from "./ContextMenu";
import { TabGroupsSettingTab } from "./SettingsTab";

export default class TabGroupsPlugin extends Plugin {
  groupManager!: GroupManager;
  private renderer!: DOMRenderer;
  private contextMenu!: ContextMenuHandler;

  async onload(): Promise<void> {
    // 1. Load persisted data
    this.groupManager = new GroupManager(this);
    await this.groupManager.load();

    // 2. Build renderer and context menu
    this.renderer = new DOMRenderer(
      this.groupManager,
      async (groupId: string) => {
        await this.groupManager.toggleCollapse(groupId);
        this.render();
      },
    );

    this.contextMenu = new ContextMenuHandler(this, this.groupManager, () =>
      this.render(),
    );
    this.contextMenu.register();

    // 3. Settings tab
    this.addSettingTab(
      new TabGroupsSettingTab(this.app, this, () => this.render()),
    );

    // 4. Commands
    this.addCommand({
      id: "create-tab-group",
      name: "Create new tab group from active tab",
      callback: () => {
        const active = this.app.workspace.activeLeaf;
        if (!active) return;
        this.createGroupFromActiveLeaf(active);
      },
    });

    this.addCommand({
      id: "remove-tab-from-group",
      name: "Remove active tab from its group",
      callback: async () => {
        const active = this.app.workspace.activeLeaf;
        if (!active) return;
        const group = this.groupManager.resolveGroupForLeaf(active);
        if (!group) return;
        await this.groupManager.removeLeafFromGroup(group.id, active);
        this.render();
      },
    });

    this.addCommand({
      id: "toggle-collapse-active-group",
      name: "Collapse / expand active tab's group",
      callback: async () => {
        const active = this.app.workspace.activeLeaf;
        if (!active) return;
        const group = this.groupManager.resolveGroupForLeaf(active);
        if (!group) return;
        await this.groupManager.toggleCollapse(group.id);
        this.render();
      },
    });

    // 5. Workspace event listeners
    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.render()),
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => this.render()),
    );

    // 6. Initial render
    // Wait one tick for Obsidian to finish restoring the layout
    this.app.workspace.onLayoutReady(() => this.render());
  }

  onunload(): void {
    this.renderer.destroy();
    this.contextMenu.unregister();
  }

  // Render

  render(): void {
    try {
      const leaves: WorkspaceLeaf[] = [];
      this.app.workspace.iterateRootLeaves((leaf) => leaves.push(leaf));
      this.renderer.render(leaves);
      this.applySettingsClasses();
    } catch (err) {
      console.error("[Tab Groups] render error:", err);
    }
  }

  //Settings-driven CSS

  private applySettingsClasses(): void {
    const body = document.body;
    if (this.groupManager.settings.showTabBorder) {
      body.classList.add("tab-groups-show-border");
    } else {
      body.classList.remove("tab-groups-show-border");
    }
  }

  // create group from active leaf via quick input

  private createGroupFromActiveLeaf(leaf: WorkspaceLeaf): void {
    const name = "New Group";
    void this.groupManager.createGroup(name, "blue", [leaf]).then(() => {
      this.render();
    });
  }
}
