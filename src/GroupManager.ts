import type { WorkspaceLeaf } from "obsidian";
import type { GroupColor, PluginData, PluginSettings, TabGroup } from "./types";
import { DEFAULT_DATA } from "./types";
import type TabGroupsPlugin from "./main";

// Helpers
function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function leafFilePath(leaf: WorkspaceLeaf): string | null {
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
    group.filePaths.push(path);
    await this.save();
  }

  async removeLeafFromGroup(
    groupId: string,
    leaf: WorkspaceLeaf,
  ): Promise<void> {
    const path = leafFilePath(leaf);
    if (!path) return;
    const group = this.getGroup(groupId);
    if (!group) return;
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
