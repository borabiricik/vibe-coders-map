import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/.wrangler/**",
      "**/.dev-logs/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/public/geo/**/*.json",
      "**/tsconfig.tsbuildinfo",
      "apps/desktop/src-tauri/gen/**",
      "apps/desktop/src-tauri/icons/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.worker,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
);
