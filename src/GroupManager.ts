import type { WorkspaceLeaf } from "obsidian";
import type { GroupColor, PluginData, PluginSettings, TabGroup } from "./types";
import { DEFAULT_DATA } from "./types";
import type TabGroupsPlugin from "./main";

// Helpers
function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function leafFilePath(leaf: WorkspaceLeaf): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewFile = (leaf.view as any)?.file?.path;
  if (viewFile) return viewFile;

  try {
    const state = leaf.getViewState?.();
    const statePath = state?.state?.file;
    if (typeof statePath === "string" && statePath) return statePath;
  } catch {
    // ignore
  }

  return null;
}

// GroupManager
export class GroupManager {
  private plugin: TabGroupsPlugin;
  private data: PluginData = { ...DEFAULT_DATA, groups: [] };

  constructor(plugin: TabGroupsPlugin) {
    this.plugin = plugin;
  }

  // Persistence

  async load(): Promise<void> {
    const saved = (await this.plugin.loadData()) as Partial<PluginData> | null;
    if (!saved) {
      this.data = { ...DEFAULT_DATA, groups: [] };
      return;
    }
    this.data = {
      groups: saved.groups ?? [],
      settings: { ...DEFAULT_DATA.settings, ...(saved.settings ?? {}) },
    };
  }

  async save(): Promise<void> {
    await this.plugin.saveData(this.data);
  }

  // Settings accessors

  get settings(): PluginSettings {
    return this.data.settings;
  }

  async updateSettings(partial: Partial<PluginSettings>): Promise<void> {
    Object.assign(this.data.settings, partial);
    await this.save();
  }

  // Group accessors

  get groups(): TabGroup[] {
    return this.data.groups;
  }

  getGroup(id: string): TabGroup | undefined {
    return this.data.groups.find((g) => g.id === id);
  }

  // Return the group whose filePaths contains this leaf's current file.
  resolveGroupForLeaf(leaf: WorkspaceLeaf): TabGroup | undefined {
    const path = leafFilePath(leaf);
    if (!path) return undefined;
    return this.data.groups.find((g) => g.filePaths.includes(path));
  }

  // get the leaves in this group that are currently open in the workspace
  getLeavesForGroup(
    groupId: string,
    allLeaves: WorkspaceLeaf[],
  ): WorkspaceLeaf[] {
    const group = this.getGroup(groupId);
    if (!group) return [];
    return allLeaves.filter((leaf) => {
      const path = leafFilePath(leaf);
      return path !== null && group.filePaths.includes(path);
    });
  }

  // Mutations
  async createGroup(
    name: string,
    color: GroupColor,
    leaves: WorkspaceLeaf[],
  ): Promise<TabGroup> {
    const filePaths = leaves
      .map(leafFilePath)
      .filter((p): p is string => p !== null);
    // Deduplicate paths that might already be in another group.
    filePaths.forEach((path) => this.removePathFromAllGroups(path));
    const group: TabGroup = {
      id: generateId(),
      name,
      color,
      collapsed: false,
      filePaths,
    };
    this.data.groups.push(group);
    await this.save();
    return group;
  }

  async addLeafToGroup(groupId: string, leaf: WorkspaceLeaf): Promise<void> {
    const path = leafFilePath(leaf);
    if (!path) return;
    // Remove from any existing group first
    this.removePathFromAllGroups(path);
    const group = this.getGroup(groupId);
    if (!group) return;
    
    // Move the leaf right after the last tab in this group
    this.moveLeafAfterLastGroupMember(leaf, group);
    
    group.filePaths.push(path);
    await this.save();
  }

  // Helper to move a leaf right after all other tabs in the same group
  private moveLeafAfterLastGroupMember(leaf: WorkspaceLeaf, group: TabGroup): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parent = leaf.parent as any;
      if (!parent) return;

      const children = parent.children || [];
      
      // Find the LAST position of any tab in this group
      let lastGroupIndex = -1;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child === leaf) continue; // Skip the tab we're moving
        const childPath = leafFilePath(child);
        if (childPath && group.filePaths.includes(childPath)) {
          lastGroupIndex = i;
        }
      }
      // Save state and detach
      const viewState = leaf.getViewState();
      const wasBeforeTarget = children.indexOf(leaf) < lastGroupIndex;
      leaf.detach();
      
      // Adjust index if we were before the target (detaching shifts indices)
      const targetIndex = wasBeforeTarget ? lastGroupIndex : lastGroupIndex + 1;
      
      // Create at the correct position
      const newLeaf = this.plugin.app.workspace.createLeafInParent(parent, targetIndex);
      newLeaf.setViewState(viewState);
    } catch {
      // Silently ignore errors
    }
  }

  // Helper to move a leaf to the far right (end of all tabs)
  private moveLeafToFarRight(leaf: WorkspaceLeaf): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parent = leaf.parent as any;
      if (!parent) return;
      
      // Save the tab's state, detach it, then add it back at the end
      const viewState = leaf.getViewState();
      leaf.detach();
      
      // After detaching, just append to the end (no index needed)
      const newLeaf = this.plugin.app.workspace.createLeafInParent(parent, 999);
      newLeaf.setViewState(viewState);
    } catch {
      // Silently ignore errors
    }
  }

  async removeLeafFromGroup(
    groupId: string,
    leaf: WorkspaceLeaf,
  ): Promise<void> {
    const path = leafFilePath(leaf);
    if (!path) return;
    const group = this.getGroup(groupId);
    if (!group) return;
    // Move the tab to the end so it doesn't split the group visually
    this.moveLeafToFarRight(leaf); 
    group.filePaths = group.filePaths.filter((p) => p !== path);
    if (group.filePaths.length === 0) {
      await this.deleteGroup(groupId);
    } else {
      await this.save();
    }
  }

  async renameGroup(groupId: string, name: string): Promise<void> {
    const group = this.getGroup(groupId);
    if (!group) return;
    group.name = name;
    await this.save();
  }

  async recolorGroup(groupId: string, color: GroupColor): Promise<void> {
    const group = this.getGroup(groupId);
    if (!group) return;
    group.color = color;
    await this.save();
  }

  async toggleCollapse(groupId: string): Promise<void> {
    const group = this.getGroup(groupId);
    if (!group) return;
    group.collapsed = !group.collapsed;
    await this.save();
  }

  async deleteGroup(groupId: string): Promise<void> {
    this.data.groups = this.data.groups.filter((g) => g.id !== groupId);
    await this.save();
  }

  private removePathFromAllGroups(path: string): void {
    for (const group of this.data.groups) {
      group.filePaths = group.filePaths.filter((p) => p !== path);
    }
    // Prune empty groups inline (without saving -> caller saves)
    this.data.groups = this.data.groups.filter((g) => g.filePaths.length > 0);
  }
}
