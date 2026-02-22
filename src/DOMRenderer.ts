import type { WorkspaceLeaf, WorkspaceTabs } from "obsidian";
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
      const parent = leaf.parent as WorkspaceTabs | null;
      if (!parent) continue;
      // Only handle WorkspaceTabs (has 'children' as array of leaves)
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
    document.querySelectorAll("[data-tg-id]").forEach((el) => {
      el.removeAttribute("data-tg-id");
      el.removeAttribute("data-tg-color");
      (el as HTMLElement).style.removeProperty("--tg-color");
      el.removeAttribute("data-tg-collapsed");
      (el as HTMLElement).style.removeProperty("display");
    });
  }

  destroy(): void {
    this.cleanupDOM();
  }

  // Per-strip rendering

  private renderStrip(strip: WorkspaceTabs, _leaves: WorkspaceLeaf[]): void {
    // Use the strip's own ordered children array for correct tab order
    const orderedLeaves: WorkspaceLeaf[] =
      (strip as unknown as { children: WorkspaceLeaf[] }).children ?? _leaves;

    const stripEl = (strip as unknown as { containerEl: HTMLElement })
      .containerEl;
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
      const tabEl = tabHeaderEl(leaf);
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
    const firstTabEl = tabHeaderEl(run[0]);
    if (!firstTabEl) return;

    const chip = this.createChip(group, run, color);
    tabParent.insertBefore(chip, firstTabEl);
  }

  private createChip(
    group: TabGroup,
    run: WorkspaceLeaf[],
    color: string,
  ): HTMLElement {
    const chip = document.createElement("div");
    chip.className = "tab-group-chip";
    if (group.collapsed) chip.classList.add("tab-group-chip--collapsed");
    chip.dataset.tabGroupChipId = group.id;
    chip.dataset.tabGroupRunSize = String(run.length);
    chip.style.setProperty("--tg-color", color);
    chip.style.zIndex = "10";
    chip.style.position = "relative";

    // Name label (always visible)
    const nameSpan = document.createElement("span");
    nameSpan.className = "tab-group-chip-name";
    nameSpan.textContent = group.name;
    chip.appendChild(nameSpan);

    // Collapse/expand arrow
    const arrowSpan = document.createElement("span");
    arrowSpan.className = "tab-group-chip-arrow";
    arrowSpan.textContent = group.collapsed ? "▶" : "▼";
    chip.appendChild(arrowSpan);

    // Attach listener directly on the element.
    // window/document listeners don't fire for this area in Obsidian/Electron
    // even though elementFromPoint correctly resolves to the chip.
    // Direct element listeners bypass whatever interception is happening.
    const handler = (e: MouseEvent) => {
      console.log("[Tab Groups] chip mousedown, groupId:", group.id);
      e.stopPropagation();
      e.preventDefault();
      void this.onChipClick(group.id);
    };
    chip.addEventListener("mousedown", handler, true);
    chip.addEventListener("mouseup", handler, true); // fallback
    chip.addEventListener("click", handler, true); // fallback

    return chip;
  }
}

// Helpers/Obsidian internals
function tabHeaderEl(leaf: WorkspaceLeaf): HTMLElement | null {
  // Obsidian attaches tabHeaderEl directly on the leaf object (internal field)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (leaf as any).tabHeaderEl ?? null;
}

function isWorkspaceTabs(node: unknown): node is WorkspaceTabs {
  // WorkspaceTabs children are leaves; WorkspaceSplit children are WorkspaceItems.
  // The quickest runtime check without importing the class directly:
  return (
    !!node &&
    typeof node === "object" &&
    "children" in node &&
    Array.isArray((node as { children: unknown }).children)
  );
}
