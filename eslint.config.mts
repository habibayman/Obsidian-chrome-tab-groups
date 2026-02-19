import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
  },
  globalIgnores([
    "node_modules",
    "dist",
    "main.js",
    "esbuild.config.mjs",
    "version-bump.mjs",
    "versions.json",
    "manifest.json",
    "eslint.config.mts",
  ]),
);
