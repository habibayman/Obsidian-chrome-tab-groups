export type GroupColor =
  | "grey"
  | "red"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple"
  | "pink";

export const GROUP_COLORS: GroupColor[] = [
  "grey",
  "red",
  "yellow",
  "green",
  "cyan",
  "blue",
  "purple",
  "pink",
];

export const COLOR_VALUES: Record<GroupColor, string> = {
  grey: "#5f6368",
  red: "#d93025",
  yellow: "#f9ab00",
  green: "#188038",
  cyan: "#007b83",
  blue: "#1a73e8",
  purple: "#9334e6",
  pink: "#e52592",
};

export interface TabGroup {
  // Stable UUID
  id: string;
  name: string;
  color: GroupColor;
  collapsed: boolean;
  // Vault-relative file paths
  // stable identity across restarts
  filePaths: string[];
}

export interface PluginSettings {
  showTabBorder: boolean;
}

export interface PluginData {
  groups: TabGroup[];
  settings: PluginSettings;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  showTabBorder: true,
};

export const DEFAULT_DATA: PluginData = {
  groups: [],
  settings: { ...DEFAULT_SETTINGS },
};
