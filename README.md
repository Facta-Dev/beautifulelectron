<p align="center">
  <img src="assets/icon.png" alt="Beautiful Electron: a cyan orbit ring around a white nucleus on a dark field" width="160">
</p>

# Beautiful Electron

Three standard [Agent Skills](https://agentskills.io) and a lints config that
teach coding agents to write, review, port, and enforce idiomatic **Electron
desktop applications on Electron 45 + TypeScript**:

- **`electron-best-practices`** loads whenever an agent writes or changes an
  Electron app, and steers it toward the three-process model, a typed preload
  bridge, an origin-checked IPC policy, and a window-free core.
- **`electron-review`** reviews existing code — a main process, preload
  bridge, renderer, IPC contract, packaging config, or diff — and writes a
  prioritized report where every finding cites the rule it breaks and shows
  the fix.
- **`electron-port`** ports a legacy Electron app, a web, Tauri or Qt app, or
  a generic desktop app to Electron 45 with the same behavior, porting the
  original tests first.
- **`lints/`** is a drop-in ESLint 9 flat config whose layer walls and
  no-remote-code rules run in CI.

They work with Claude Code, OpenAI Codex, GitHub Copilot, Cursor, Gemini CLI,
and any other agent that reads the Agent Skills format.

## The playbooks

These skills are the runnable, machine-checked enforcement of the
[facta playbooks](https://github.com/Facta-Dev/ai-coding-playbook). Start with
[`PLAYBOOK_MASTER.md`](https://github.com/Facta-Dev/ai-coding-playbook/blob/main/PLAYBOOK_MASTER.md) — the catalog, precedence and
cross-playbook invariants — then read
[`PLAYBOOK_DESKTOP_ELECTRON.md`](https://github.com/Facta-Dev/ai-coding-playbook/blob/main/PLAYBOOK_DESKTOP_ELECTRON.md) for this stack, and use this repository as
the worked example. The set has the master plus twenty-one platform playbooks,
split into `_PART<n>` files where needed; the repository also ships thirteen
runnable kits (Go, Rust, Node.js, Python, Java, extension, desktop,
desktop-electron, React Native, Android, iOS, frontend, CLI), the
model-routing guide and the instruction-budget tooling. The shared contracts
(`PLAYBOOK_URLS.md`, `PLAYBOOK_TESTS.md`, `PLAYBOOK_SECURITY.md`,
`PLAYBOOK_AUDIT.md`, `PLAYBOOK_CLAUDE_CODE.md`) apply across the series.

This repository is one of the thirteen implementations of the single playbook
set (the **1:n** series: `ai-coding-playbook` is the 1, the Beautiful
repositories are the n). It implements `PLAYBOOK_DESKTOP_ELECTRON.md`; the
playbook governs this
repository, and implementation gaps are reported upstream. The rule is in
[`PLAYBOOK_MASTER_PART3.md` §12](https://github.com/Facta-Dev/ai-coding-playbook/blob/main/PLAYBOOK_MASTER_PART3.md).

## Why

Electron apps fail in ways a web app does not: the main process and the
renderer share one binary, the preload bridge is the only thing standing
between the two, and a window is a security boundary that a single `webPreferences`
flag can remove. The expensive bugs are structural:

- `nodeIntegration: true`, or a `contextIsolation: false` preload.
- An `ipcMain.handle` that trusts the sender and the payload.
- A `webContents.loadURL` of remote content in the app window.
- A secret in `localStorage`, in a renderer log, or in the bundle.
- A `BrowserWindow` created per feature, each with its own lifecycle.
- An unpacked binary shipped without fuses, so `RunAsNode` and cookie
  decryption are still on.

Beautiful Electron is the contract that catches those before review.

## Agent kit (Claude Code)

This repo carries the `desktop-electron` kit plane from
[`ai-coding-playbook`](https://github.com/Facta-Dev/ai-coding-playbook):
`.claude/agents`, `.claude/skills`, `.claude/commands`, and the
`model-routing:ollama` block in `CLAUDE.md`.

Verify or repair the wiring from the playbook checkout:

```
bash ai-coding-playbook/scripts/claude-kit/configure-repo.sh . --kit=desktop-electron --check
```

`configure-repo.sh` is idempotent, never deletes, and backs up
`.claude/settings.json` under `.claude/backups/` before any merge.

## Install

### Claude Code

```bash
/plugin marketplace add Facta-Dev/beautifulelectron
/plugin install beautiful-electron@beautiful-electron
```

### OpenAI Codex and ChatGPT

The repository ships a portable `plugin.json` with the `com.openai` interface
block. Point Codex at the repository, or package it with:

```bash
python3 scripts/package-openai-plugin.py --out beautiful-electron.zip
```

### Any agent

Copy `skills/electron-best-practices`, `skills/electron-review`, and
`skills/electron-port` into your agent's skills directory. Each skill is a
`SKILL.md` plus a `references/` digest; no runtime, no network.

## A worked example

Without the skill, an agent writes a preload that hands the renderer the whole
IPC surface:

```ts
// Without the skill: every channel is open, and the payload is trusted.
contextBridge.exposeInMainWorld("api", {
  invoke: (channel: string, payload: unknown) => ipcRenderer.invoke(channel, payload),
  readFile: (path: string) => ipcRenderer.invoke("fs:read", path),
});
```

Problems: the renderer can call any channel, including `fs:read` with any
path; the payload is never validated; the renderer holds a raw `ipcRenderer`
handle, so a compromised page can reach every main-process handler.

With the skill, the preload exposes one typed RPC and the main process
authenticates the sender before the request reaches the core:

```ts
// With the skill: one typed RPC, validated in the main process.
contextBridge.exposeInMainWorld("hmd", {
  rpc: <T extends IpcType>(type: T, payload: IpcRequest<T>) =>
    ipcRenderer.invoke("rpc", { v: 1, id: newId(), type, payload }),
});
```

```text
// main/ipc-policy.ts — the sender is checked before the payload is parsed.
authorize(envelope, windowKind, senderOrigin, expectedOrigin, mainFrame)
  → rejects a wrong origin, a child frame, an unknown type, a window the
    channel does not target, and a payload that fails the request schema.
```

The layer contract, the sender table and the storage rules are in
[`skills/electron-best-practices/references/electron-architecture.md`](skills/electron-best-practices/references/electron-architecture.md).

## The architecture contract

```text
renderer (React)  ──►  typed RPC  ──►  main (ipc-pep → policy)  ──►  core
preload: the only bridge; no ipcRenderer, no generic channel string
core:  adapters  ──►  application  ──►  domain
```

| Layer | Owns | Must not import |
|---|---|---|
| **domain** | Entities, rules, ports | `electron`, `node:*`, DOM, React, the SDK |
| **application** | Use cases, orchestration, policy | `electron`, `node:*`, DOM, React |
| **adapters** | Storage, SDK, realtime, secrets | UI components |
| **preload** | The typed bridge | the renderer, core internals |
| **renderer** | Render, forward events, a11y | `electron`, `node:*`, the SDK |
| **core** | Ports and pure types | everything else |

The unbreakable rules:

1. The renderer never holds `ipcRenderer` and never imports `electron`.
2. `domain` and `application` never touch `electron`, `node:*` or the DOM.
3. Every request is authenticated by sender origin, authorized by the window
   and channel table, and parsed by a schema.
4. The preload bridge exposes typed calls only; there is no generic channel
   passthrough.
5. The page never receives a token.

## The lints config

[`lints/eslint.config.mjs`](lints/eslint.config.mjs) is a copy-in ESLint 9
flat config. It pins:

- **Layer walls:** `no-restricted-imports` for the renderer, the preload and
  the SDK; `no-restricted-globals` for `process` and `require` in the
  renderer and the domain.
- **No remote code:** `no-eval`, `no-new-func`, `no-debugger`, `no-alert`.
- **Type discipline:** `ban-ts-comment`, `consistent-type-imports`,
  `explicit-module-boundary-types`, `no-unnecessary-type-assertion`,
  `switch-exhaustiveness-check`.
- **Async discipline:** `no-floating-promises`, `no-misused-promises`.
- **Silencing:** eslint-comments requires a description and rejects an
  unlimited disable.
- **One logger:** `no-console`.

[`lints/check/`](lints/README.md) is the violation harness: one deliberate
file per rule with a `// expect:<rule>` marker, plus a clean control.
[`scripts/check-lints.sh`](scripts/check-lints.sh) fails if a marked rule stays
quiet, if anything unmarked fires, or if `tsc --noEmit` fails on the same
files.

## What it does not do

- The skills contain instructions and reference text only. They make no
  network calls and collect no data ([PRIVACY.md](PRIVACY.md)).
- When a Node.js toolchain is available, the skills run `tsc`, `eslint`, and
  `vitest` on your project; without one, they work from the code alone.
- The lint config is a copy-in unit, not a dependency.
- The skills do not replace a signing, notarization or update review; they
  tell the agent what those must prove.

## Repository layout

```text
skills/
  electron-best-practices/  SKILL.md + references/ (Electron platform,
                             security, architecture, strict TypeScript)
  electron-review/          SKILL.md (report format, ranking, waived gates)
  electron-port/            SKILL.md (legacy/web/Tauri/Qt → Electron 45)
lints/
  eslint.config.mjs         the drop-in
  check/                    the violation harness + byte-identical config
scripts/
  check-skill.py            frontmatter, links, evals, manifests
  check-lints.sh            every pinned rule fires
  check-examples.py         TypeScript blocks compile
  check-build.sh            the example builds and runs its tests
  examples.json             the ledger of deliberately skipped blocks
  package-openai-plugin.py
tests/                      validator, wording, lints-config and gate tests
examples/
  minimal/                  a runnable Electron example
  review-insecure-ipc.md    a full worked review
docs/
  architecture/             the architecture index
```

## Sources

- The Electron security documentation (context isolation, the preload
  bridge, CSP, fuses, remote content, `safeStorage`).
- The Electron process-model, packaging and update guides (the utility
  process, `utilityProcess.fork`, asar, code signing, auto-update).
- The facta desktop handbook (`PLAYBOOK_DESKTOP_ELECTRON.md`): the three
  trust zones, the IPC policy, storage and the outbox, the performance
  budget, enterprise policy.

## Contributing

Rule proposals are welcome; open an issue with the
[rule template](.github/ISSUE_TEMPLATE/propose-a-rule.yml) and a source. A
rule without a source and a failing example is a preference, not a rule. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Siblings

Beautiful Electron is part of the Beautiful series for the facta playbooks:
[beautiful-j2ee](https://github.com/Facta-Dev/beautiful-j2ee),
[beautifulandroid](https://github.com/Facta-Dev/beautifulandroid),
[beautifulcli](https://github.com/Facta-Dev/beautifulcli),
[beautifulextension](https://github.com/Facta-Dev/beautifulextension),
[beautifulgo](https://github.com/Facta-Dev/beautifulgo),
[beautifulios](https://github.com/Facta-Dev/beautifulios),
[beautifulnodejs](https://github.com/Facta-Dev/beautifulnodejs),
[beautifulpython](https://github.com/Facta-Dev/beautifulpython),
[beautifulqt](https://github.com/Facta-Dev/beautifulqt),
[beautifulreact](https://github.com/Facta-Dev/beautifulreact),
[beautifulreactnative](https://github.com/Facta-Dev/beautifulreactnative),
[beautifulrust](https://github.com/Facta-Dev/beautifulrust).

## License

MIT — see [LICENSE](LICENSE).
