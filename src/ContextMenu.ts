import { Menu, Modal, Setting, WorkspaceLeaf, type App } from "obsidian";
import type { GroupColor } from "./types";
import { COLOR_VALUES, GROUP_COLORS } from "./types";
import type { GroupManager } from "./GroupManager";
import type TabGroupsPlugin from "./main";

// "New group" modal

class NewGroupModal extends Modal {
  private name = "";
  private color: GroupColor = "blue";
  private onSubmit: (name: string, color: GroupColor) => void;

  constructor(
    app: App,
    onSubmit: (name: string, color: GroupColor) => void,
    prefillName?: string,
  ) {
    super(app);
    this.onSubmit = onSubmit;
    if (prefillName) this.name = prefillName;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "New tab group" });

    new Setting(contentEl).setName("Group name").addText((text) => {
      text.setValue(this.name).onChange((v) => (this.name = v));
      text.inputEl.focus();
      text.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.submit();
      });
    });

    new Setting(contentEl).setName("Color").then((setting) => {
      const swatchRow = setting.controlEl.createDiv({
        cls: "tab-group-color-swatches",
      });
      for (const c of GROUP_COLORS) {
        const swatch = swatchRow.createDiv({ cls: "tab-group-color-swatch" });
        swatch.style.background = COLOR_VALUES[c];
        swatch.title = c;
        if (c === this.color) swatch.addClass("is-selected");
        swatch.addEventListener("click", () => {
          swatchRow
            .querySelectorAll(".tab-group-color-swatch")
            .forEach((s) => s.removeClass("is-selected"));
          swatch.addClass("is-selected");
          this.color = c;
        });
      }
    });

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Create")
        .setCta()
        .onClick(() => this.submit()),
    );
  }

  private submit(): void {
    const trimmed = this.name.trim();
    if (!trimmed) return;
    this.close();
    this.onSubmit(trimmed, this.color);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// "Rename group" modal
class RenameGroupModal extends Modal {
  private name: string;
  private onSubmit: (name: string) => void;

  constructor(app: App, currentName: string, onSubmit: (name: string) => void) {
    super(app);
    this.name = currentName;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Rename group" });

    new Setting(contentEl).setName("Group name").addText((text) => {
      text.setValue(this.name).onChange((v) => (this.name = v));
      text.inputEl.select();
      text.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.submit();
      });
    });

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Rename")
        .setCta()
        .onClick(() => this.submit()),
    );
  }

  private submit(): void {
    const trimmed = this.name.trim();
    if (!trimmed) return;
    this.close();
    this.onSubmit(trimmed);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

// ContextMenuHandler
// Registers a single delegated right-click listener on the workspace root.

export class ContextMenuHandler {
  private plugin: TabGroupsPlugin;
  private manager: GroupManager;
  private onRender: () => void;
  private boundHandler: (e: MouseEvent) => void;

  constructor(
    plugin: TabGroupsPlugin,
    manager: GroupManager,
    onRender: () => void,
  ) {
    this.plugin = plugin;
    this.manager = manager;
    this.onRender = onRender;
    this.boundHandler = this.handleContextMenu.bind(this);
  }

  register(): void {
    // Use contextmenu (right-click) on the whole document; we'll filter by
    // whether the target is inside a .workspace-tab-header
    document.addEventListener("contextmenu", this.boundHandler, true);
  }

  unregister(): void {
    document.removeEventListener("contextmenu", this.boundHandler, true);
  }

  // Event handlers

  private handleContextMenu(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const tabHeader = target.closest<HTMLElement>(".workspace-tab-header");
    if (!tabHeader) return;

    const leaf = this.findLeafForTabHeader(tabHeader);
    if (!leaf) return;

    e.preventDefault();
    e.stopPropagation();

    const existingGroup = this.manager.resolveGroupForLeaf(leaf);
    const menu = new Menu();

    // "Add to group"
    const otherGroups = this.manager.groups.filter(
      (g) => g.id !== existingGroup?.id,
    );

    if (otherGroups.length > 0 || !existingGroup) {
      menu.addItem((item) => {
        item.setTitle("Add to group").setIcon("folder-plus");
        // Build submenu
        const submenu = (
          item as unknown as { setSubmenu: () => Menu }
        ).setSubmenu();

        for (const g of otherGroups) {
          submenu.addItem((si) => {
            si.setTitle(g.name).onClick(async () => {
              await this.manager.addLeafToGroup(g.id, leaf);
              this.onRender();
            });
            // Color dot via icon color hack
            const titleEl = (
              si as unknown as { dom: HTMLElement }
            ).dom?.querySelector(".menu-item-title");
            if (titleEl) {
              const dot = titleEl.createDiv({ cls: "menu-color-dot" });
              dot.style.background = COLOR_VALUES[g.color];
              titleEl.prepend(dot);
            }
          });
        }

        if (otherGroups.length > 0) submenu.addSeparator();

        submenu.addItem((si) => {
          si.setTitle("New group…")
            .setIcon("plus-circle")
            .onClick(() => {
              new NewGroupModal(this.plugin.app, async (name, color) => {
                await this.manager.createGroup(name, color, [leaf]);
                this.onRender();
              }).open();
            });
        });
      });
    }

    // Existing group actions
    if (existingGroup) {
      menu.addSeparator();

      menu.addItem((item) => {
        item
          .setTitle("Remove from group")
          .setIcon("x-circle")
          .onClick(async () => {
            await this.manager.removeLeafFromGroup(existingGroup.id, leaf);
            this.onRender();
          });
      });

      menu.addItem((item) => {
        item
          .setTitle("Rename group")
          .setIcon("pencil")
          .onClick(() => {
            new RenameGroupModal(
              this.plugin.app,
              existingGroup.name,
              async (name) => {
                await this.manager.renameGroup(existingGroup.id, name);
                this.onRender();
              },
            ).open();
          });
      });

      menu.addItem((item) => {
        item.setTitle("Change group color").setIcon("palette");
        const submenu = (
          item as unknown as { setSubmenu: () => Menu }
        ).setSubmenu();
        for (const c of GROUP_COLORS) {
          submenu.addItem((si) => {
            si.setTitle(c.charAt(0).toUpperCase() + c.slice(1)).onClick(
              async () => {
                await this.manager.recolorGroup(existingGroup.id, c);
                this.onRender();
              },
            );
            if (c === existingGroup.color) si.setChecked(true);
          });
        }
      });

      menu.addSeparator();

      menu.addItem((item) => {
        item
          .setTitle("Ungroup all")
          .setIcon("trash-2")
          .onClick(async () => {
            await this.manager.deleteGroup(existingGroup.id);
            this.onRender();
          });
      });
    } else {
      // Not in a group → offer "New group" directly
      menu.addItem((item) => {
        item
          .setTitle("Add to new group")
          .setIcon("folder-plus")
          .onClick(() => {
            new NewGroupModal(this.plugin.app, async (name, color) => {
              await this.manager.createGroup(name, color, [leaf]);
              this.onRender();
            }).open();
          });
      });
    }

    menu.showAtMouseEvent(e);
  }

  // Leaf resolution
  private findLeafForTabHeader(tabHeader: HTMLElement): WorkspaceLeaf | null {
    let found: WorkspaceLeaf | null = null;
    this.plugin.app.workspace.iterateRootLeaves((leaf: WorkspaceLeaf) => {
      if (found) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((leaf as any).tabHeaderEl === tabHeader) {
        found = leaf;
      }
    });
    return found;
  }
}
