import type { WorkspaceLeaf, WorkspaceParent, WorkspaceTabs } from "obsidian";
import type { TabGroup } from "./types";
import { COLOR_VALUES } from "./types";
import type { GroupManager } from "./GroupManager";

// idempotent renderer

export class DOMRenderer {
  private manager: GroupManager;
  // Called by chip click -> toggle collapse -> re-render
  private onChipClick: (groupId: string) => Promise<void>;

  constructor(
    manager: GroupManager,
    onChipClick: (groupId: string) => Promise<void>,
  ) {
    this.manager = manager;
    this.onChipClick = onChipClick;
  }

  render(allRootLeaves: WorkspaceLeaf[]): void {
    // 1. Strip all previously injected DOM nodes
    this.cleanupDOM();

    // 2. Bucket leaves by their parent WorkspaceTabs strip
    const byStrip = new Map<WorkspaceTabs, WorkspaceLeaf[]>();
    for (const leaf of allRootLeaves) {
      const { parent } = leaf;
      if (!isWorkspaceTabs(parent)) continue;
      let arr = byStrip.get(parent);
      if (!arr) {
        arr = [];
        byStrip.set(parent, arr);
      }
      arr.push(leaf);
    }

    // 3. Render each strip
    for (const [strip, leaves] of byStrip) {
      this.renderStrip(strip, leaves);
    }
  }

  cleanupDOM(): void {
    document.querySelectorAll(".tab-group-chip").forEach((el) => el.remove());
    document.querySelectorAll<HTMLElement>("[data-tg-id]").forEach((el) => {
      el.removeAttribute("data-tg-id");
      el.removeAttribute("data-tg-color");
      el.style.removeProperty("--tg-color");
      el.removeAttribute("data-tg-collapsed");
      el.style.removeProperty("display");
    });
  }

  destroy(): void {
    this.cleanupDOM();
  }

  // Per-strip rendering

  private renderStrip(strip: WorkspaceTabs, leaves: WorkspaceLeaf[]): void {
    // Use the strip's own ordered children array for correct tab order
    const orderedLeaves = strip.children ?? leaves;

    const stripEl = strip.containerEl;
    if (!stripEl) return;

    const innerContainer = stripEl.querySelector<HTMLElement>(
      ".workspace-tab-header-container-inner",
    );
    const outerContainer = stripEl.querySelector<HTMLElement>(
      ".workspace-tab-header-container",
    );
    if (!outerContainer) return;

    const tabParent = innerContainer ?? outerContainer;

    let i = 0;
    while (i < orderedLeaves.length) {
      const leaf = orderedLeaves[i];
      const group = this.manager.resolveGroupForLeaf(leaf);

      if (!group) {
        i++;
        continue;
      }

      // Collect the full consecutive run for this group
      const run: WorkspaceLeaf[] = [];
      let j = i;
      while (
        j < orderedLeaves.length &&
        this.manager.resolveGroupForLeaf(orderedLeaves[j])?.id === group.id
      ) {
        run.push(orderedLeaves[j]);
        j++;
      }

      this.injectGroup(group, run, tabParent);
      i = j;
    }
  }

  // Group chip injection

  private injectGroup(
    group: TabGroup,
    run: WorkspaceLeaf[],
    tabParent: HTMLElement,
  ): void {
    const color = COLOR_VALUES[group.color];

    // Tag every tab header in the run
    for (const leaf of run) {
      const tabEl = leaf.tabHeaderEl;
      if (!tabEl) continue;
      tabEl.dataset.tgId = group.id;
      tabEl.dataset.tgColor = group.color;
      tabEl.style.setProperty("--tg-color", color);
      if (group.collapsed) {
        tabEl.dataset.tgCollapsed = "true";
        tabEl.style.display = "none";
      } else {
        tabEl.style.removeProperty("display");
      }
    }

    // Find the first tab header element in the DOM (chip goes before it)
    const firstTabEl = run[0].tabHeaderEl;
    if (!firstTabEl) return;

    const chip = this.createChip(group, run, color);
    tabParent.insertBefore(chip, firstTabEl);
  }

  private createChip(
    group: TabGroup,
    run: WorkspaceLeaf[],
    color: string,
  ): HTMLElement {
    const chip = document.createElement("button");
    chip.className = "tab-group-chip";
    if (group.collapsed) chip.classList.add("tab-group-chip--collapsed");
    chip.dataset.tabGroupChipId = group.id;
    chip.dataset.tabGroupRunSize = String(run.length);
    chip.style.setProperty("--tg-color", color);

    // Name label
    const nameSpan = document.createElement("span");
    nameSpan.className = "tab-group-chip-name";
    nameSpan.textContent = group.name;
    chip.appendChild(nameSpan);

    // Collapse/expand arrow
    const arrowSpan = document.createElement("span");
    arrowSpan.className = "tab-group-chip-arrow";
    arrowSpan.textContent = group.collapsed ? "▶" : "▼";
    chip.appendChild(arrowSpan);

    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      void this.onChipClick(group.id);
    });

    return chip;
  }
}

function isWorkspaceTabs(node: WorkspaceParent | null): node is WorkspaceTabs {
  return !!node && "children" in node && Array.isArray(node.children);
}
