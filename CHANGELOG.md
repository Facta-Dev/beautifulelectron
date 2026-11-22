# Changelog

All notable changes to this project are listed here. Versions follow
[Semantic Versioning](https://semver.org/), and the version lives in
`.claude-plugin/plugin.json`.

## [Unreleased]

### Added

- **Three skills for Electron 45 + TypeScript.** `electron-best-practices`
  steers new code toward the three-process model, a typed preload bridge, an
  origin- and window-checked IPC policy, a window-free domain/application
  core, MVVM over the renderer, typed storage with migrations, OS-keystore
  secrets, fuses and a strict CSP, signed updates, and the unbreakable layer
  contract. `electron-review` reviews a main process, preload bridge,
  renderer, IPC contract, packaging config, or diff, and ranks architecture
  and trust zones first. `electron-port` ports a legacy Electron app, a
  web/Tauri/Qt app, or a generic desktop app to Electron 45 with the same
  behavior.
- **A drop-in ESLint config.** `lints/eslint.config.mjs` (ESLint 9 flat
  config + typescript-eslint 8, strictTypeChecked) turns the layer contract
  into red-on-save output: `no-restricted-imports` keeps the renderer off
  `electron` and the SDK, `no-restricted-globals` keeps `process` and
  `require` out of the renderer and the domain; `no-eval`/`no-new-func`
  enforce the no-remote-code rule.
- **Proof that every rule fires.** `lints/check/` holds one deliberate
  violation per rule plus a clean file, and `scripts/check-lints.sh` runs
  eslint and tsc over both, bounded and with stderr surfaced.
- **A skill validator, an example compiler, and a test suite.**
  `scripts/check-skill.py` checks frontmatter, links, eval cases and the
  plugin manifests; `scripts/check-examples.py` compiles every `ts` block;
  `tests/` covers the validator, the wording contracts, the lints config and
  the repo gates.
- **A worked review.** `examples/review-insecure-ipc.md` shows the report
  shape and the architecture-first ranking on a small insecure IPC bridge.

[Unreleased]: https://github.com/Facta-Dev/beautifulelectron/compare/v0.1.0...HEAD
