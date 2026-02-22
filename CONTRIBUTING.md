# Contributing to Chrome-style Tab Groups

This Plugin is still under development so any help will be appreciated :)

Thank you for your interest in contributing! This document outlines how to get started, the project structure, and guidelines to follow.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- An [Obsidian](https://obsidian.md/) vault for testing
- Git

### Setup

```bash
# Clone the repo into your vault's plugins folder
cd <your-vault>/.obsidian/plugins/
git clone https://github.com/habibayman/Obsidian-chrome-tab-groups.git
cd Obsidian-chrome-tab-groups

# Install dependencies
npm install

# Start the dev build (watches for changes)
npm run dev
```

After building, reload Obsidian (`Ctrl+R` / `Cmd+R`) and enable the plugin in **Settings → Community plugins**.

## Project Structure

```
src/
├── main.ts            # Plugin entry point — lifecycle, commands, render loop
├── types.ts           # Shared types, constants, and default data
├── GroupManager.ts    # Core data model — CRUD for groups, persistence
├── DOMRenderer.ts     # Idempotent DOM manipulation — chips, tab decorations
├── ContextMenu.ts     # Right-click menu handler and modal dialogs
└── SettingsTab.ts     # Plugin settings UI
styles.css             # All plugin styles
manifest.json          # Obsidian plugin manifest
esbuild.config.mjs     # Build configuration
```

## Development Workflow

1. **Create a branch** from `main` for your feature or fix:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** in the `src/` directory.

3. **Run the linter** before committing:
   ```bash
   npm run lint
   ```

4. **Test manually** in Obsidian:
   - Create, rename, recolor, collapse, and delete groups.
   - Test with multiple split panes.
   - Reload Obsidian to verify persistence.
   - Check that ungrouped tabs are unaffected.

5. **Commit** with a clear, descriptive message:
   ```
   feat: add drag-and-drop reordering for group chips
   fix: prevent duplicate file paths when re-adding a tab
   ```

6. **Open a pull request** against `main`.

## Code Guidelines

### Styling

- All CSS lives in `styles.css` at the project root (not in TypeScript).
- Prefix all class names with `tab-group-` or `tab-groups-` to avoid collisions with Obsidian or other plugins.
- Use CSS custom properties (`--tg-color`) for dynamic theming.

### DOM Manipulation

- The `DOMRenderer` is **idempotent** — every call to `render()` strips all previous injections and rebuilds from scratch. Keep it that way.
- Never cache DOM references across render cycles.
- Use `data-tg-*` attributes for any metadata attached to tab headers.

### Architecture

- **`GroupManager`** owns all data mutations and persistence. Other modules should call its methods rather than modifying `data.json` directly.
- **`DOMRenderer`** should have no side effects beyond the DOM. It should not call `save()` or modify plugin data.
- **`ContextMenu`** bridges user interaction to the manager and triggers re-renders via the `onRender` callback.

## Reporting Bugs

When filing an issue, please include:

- Obsidian version and installer version (found in **Settings → About**)
- Plugin version
- Steps to reproduce
- Expected vs. actual behavior
- Console errors if any (`Ctrl+Shift+I` → Console tab)

## Suggesting Features

Open an issue with the **enhancement** label. Describe:

- The use case or problem you're solving
- Your proposed solution
- Any alternatives you've considered

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).