<p align="center">
  <img src="./assets/logo.png" width="230" />
</p>

<h1 align="center">Chrome-style Tab Groups</h1>

<p align="center">
  Bring Chrome-style tab grouping to Obsidian.<br>
  Group tabs with a label and color, collapse/expand groups, and persist them across restarts.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Obsidian-%3E%3D1.5.0-7C3AED?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-22C55E?style=flat-square" />
</p>


## Features

- **Colored group chips** — Each group displays a clickable chip in the tab bar with the group name and an expand/collapse arrow.
- **8 group colors** — Grey, Red, Yellow, Green, Cyan, Blue, Purple, and Pink.
- **Collapse / expand** — Click the group chip to collapse its tabs and free up space. Click again to expand.
- **Persistent groups** — Groups (including names, colors, collapsed state, and member files) are saved to `data.json` and restored on reload.
- **Right-click context menu** — Right-click any tab header for a full set of group actions:
  - **Add to group** — Move the tab into an existing group or create a new one.
  - **Remove from group** — Remove the tab from its current group.
  - **Rename group** — Change the group name via a modal dialog.
  - **Change group color** — Pick a new color from the submenu.
  - **Ungroup all** — Delete the group entirely.
- **Command palette integration** — Three commands available from the command palette:
  - `Create new tab group from active tab`
  - `Remove active tab from its group`
  - `Collapse / expand active tab's group`
- **Settings tab** — View and manage all active groups, change colors, delete groups, and toggle the colored left-border decoration on grouped tabs.
- **Multi-pane support** — Groups render correctly across multiple tab strips / split panes.

## Installation

### From Obsidian Community Plugins

PENDING,

### Manual installation

1. Download the latest release (`main.js`, `manifest.json`, `styles.css`) from the [Releases](https://github.com/habibayman/Obsidian-chrome-tab-groups/releases) page.
2. Create a folder at `<vault>/.obsidian/plugins/Obsidian-chrome-tab-groups/`.
3. Copy the three files into that folder.
4. Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Usage

### Creating a group

- **Right-click** a tab header → **Add to group → New group…** — enter a name and pick a color.
- Or use the command palette: **Create new tab group from active tab** (creates a default "New Group" in blue).

### Managing groups

| Action | How |
|---|---|
| Add tab to existing group | Right-click tab → **Add to group** → select group |
| Remove tab from group | Right-click tab → **Remove from group** |
| Rename group | Right-click a grouped tab → **Rename group** |
| Change color | Right-click a grouped tab → **Change group color** |
| Collapse / expand | Click the **group chip** in the tab bar |
| Delete group | Right-click a grouped tab → **Ungroup all** |

### Settings

Open **Settings → Chrome-style Tab Groups** to:

- **Toggle colored left border** on grouped tab headers.
- **View all groups** with their color and file count.
- **Change color** or **delete** groups directly from the settings panel.

## Development

```bash
# Clone into your vault's plugins folder
cd <vault>/.obsidian/plugins/
git clone https://github.com/habibayman/Obsidian-chrome-tab-groups.git
cd Obsidian-chrome-tab-groups

# Install dependencies
npm install

# Build in watch mode (dev)
npm run dev

# Production build
npm run build

```
