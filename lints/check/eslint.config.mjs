// Beautiful Electron drop-in lints
//
// Paste this into your repo root (read the overrides below first, then add
// your project-specific ignores on the first entry). It makes eslint enforce
// the rules from the electron-best-practices skill that a linter can check:
// the layer walls, the promise and eval discipline, and the silencing
// requirements. Silence a rule locally with a reason, which the config
// requires.
//
// Everything beyond the pinned rules rides the typescript-eslint
// strictTypeChecked + stylisticTypeChecked presets. Make CI strict with:
//
//     npx eslint .
//
// The lints/check project proves every pinned rule fires: see
// scripts/check-lints.sh and tests/test_lints_config.py.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";

const BACKEND_MESSAGE =
  "The domain and application layers never import electron or node:*; platform access goes through a port — see the 'Architecture contract' in electron-best-practices.";

const RENDERER_MESSAGE =
  "The renderer never imports electron, node:* or the SDK: it calls the typed preload bridge — see the 'Architecture contract' in electron-best-practices.";

const PRELOAD_MESSAGE =
  "The preload bridge never imports the renderer or core internals: it exposes only the typed window bridge — see the 'Architecture contract' in electron-best-practices.";

const SDK_MESSAGE =
  "The SDK is a plain TypeScript client: it never imports electron or React — see the 'Architecture contract' in electron-best-practices.";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "coverage/", "out/", "release/"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      "@eslint-community/eslint-comments": eslintComments,
    },
    rules: {
      // One logger, not console.* sprinkled through handlers.
      "no-console": "error",
      // No remote code: the fuses forbid it and review rejects it.
      "no-eval": "error",
      "no-new-func": "error",
      "@typescript-eslint/no-implied-eval": "error",
      // A debug statement or a blocking alert in a shipped process is not a feature.
      "no-debugger": "error",
      "no-alert": "error",
      // Silencing must be narrow, explained, and rare: @ts-expect-error with a
      // reason on the narrowest line; ts-ignore and ts-nocheck are flat out.
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
          minimumDescriptionLength: 10,
        },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksConditionals: true, checksVoidReturn: true },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      // Muting attempts are themselves findings.
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
      "@eslint-community/eslint-comments/require-description": ["error", { ignore: [] }],
    },
  },
  {
    // The domain and application layers never touch Electron or Node.
    files: [
      "**/domain/**/*.{ts,tsx}",
      "**/application/**/*.{ts,tsx}",
      "**/shared-kernel/**/*.{ts,tsx}",
      "**/contracts/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "electron", message: BACKEND_MESSAGE }],
          patterns: [{ group: ["node:*"], message: BACKEND_MESSAGE }],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "process", message: BACKEND_MESSAGE },
        { name: "require", message: BACKEND_MESSAGE },
      ],
    },
  },
  {
    // The renderer talks to the typed preload bridge, never to Electron,
    // Node or the SDK.
    files: ["**/renderer/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "electron", message: RENDERER_MESSAGE }],
          patterns: [
            { group: ["node:*"], message: RENDERER_MESSAGE },
            { group: ["@/sdk", "@/sdk/*", "**/sdk/*"], message: RENDERER_MESSAGE },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "process", message: RENDERER_MESSAGE },
        { name: "require", message: RENDERER_MESSAGE },
      ],
    },
  },
  {
    // The preload bridge exposes a typed surface, never the app internals.
    files: ["**/preload/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/renderer", "@/renderer/*", "**/renderer/*", "@/core", "@/core/*", "**/core/*"], message: PRELOAD_MESSAGE },
          ],
        },
      ],
    },
  },
  {
    // The SDK stays platform-free and React-free.
    files: ["**/sdk/**/*.{ts,tsx}", "packages/sdk/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "electron", message: SDK_MESSAGE },
            { name: "react", message: SDK_MESSAGE },
          ],
        },
      ],
    },
  },
);
