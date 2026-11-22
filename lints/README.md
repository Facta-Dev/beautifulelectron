# Beautiful Electron lints

The two-file unit that turns the electron-best-practices skill into
red-on-save output:

- `eslint.config.mjs` — the drop-in. Paste it next to your `package.json`; it
  makes eslint enforce the machine-checkable rules from the skill: the layer
  walls (domain/application never import `electron` or `node:*`; the renderer
  never imports `electron`, `node:*` or the SDK; the preload bridge never
  imports the renderer or core internals; the SDK stays free of `electron`
  and React), the no-remote-code rule (`no-eval`, `no-new-func`), the
  silencing requirements, promise discipline and the type rules. Everything
  else rides the typescript-eslint `strictTypeChecked` +
  `stylisticTypeChecked` presets. Adjust the layer globs when your project
  renames its folders, never the rule.
- `check/` — the violation harness that proves every pinned rule fires:
  `src/` holds one file per rule family, each violating line carrying a
  `// expect:<rule>` comment on the line above it. `clean.ts` carries no
  markers and must stay fully quiet.

The harness files are layer-shaped on purpose (`src/domain/`,
`src/application/`, `src/renderer/`, `src/preload/`, `src/sdk/`): the
`no-restricted-imports` and `no-restricted-globals` overrides key on those
file globs, so the violations must sit in files the drop-in actually targets.
`scripts/check-lints.sh` fails if a marked rule stays quiet, if anything
unmarked fires, or if `tsc --noEmit` fails on the same files — every
eslint/tsc invocation is bounded by a timeout, stderr is always surfaced, and
a non-JSON eslint report is an explicit error, never a guess.

To wire it in CI:

```bash
npx eslint .
bash scripts/check-lints.sh   # only in the BeautifulElectron repo itself
```

Add the repo as a dependency of nothing — it is a copy-in config. Keep the
check project's `eslint.config.mjs` byte-identical to the drop-in; the lints
gate, `scripts/check-lints.sh` and `tests/test_lints_config.py` all enforce
it.
