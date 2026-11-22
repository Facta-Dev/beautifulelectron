---
name: electron-port
description: >-
  Port an existing desktop UI to an idiomatic Electron 45 / TypeScript
  application with the same behavior: a legacy Electron app (any major), a web
  screen, a Tauri app, or a Qt app. Use this skill whenever the user asks to
  migrate, convert, modernize, or port an app or window to Electron, upgrade an
  old Electron app to the current major, or move a web/Tauri/Qt UI to Electron.
  Trigger on port, migrate, convert to Electron, "modernize this Electron 12
  app", "this app uses nodeIntegration", "replace this Tauri window", or a
  pasted legacy Electron main/preload file. Port the original tests first, keep
  behavior identical, and write a PORTING.md.
---

# Electron port

A port preserves behavior while changing the implementation. The output is not
an old Electron app with new flags; it is an Electron 45 app an Electron
developer would have written, with the same observable behavior and tests
proving it.

> Playbook: this skill is the runnable companion of
> [`PLAYBOOK_DESKTOP_ELECTRON.md`](https://github.com/Facta-Dev/ai-coding-playbook/blob/main/PLAYBOOK_DESKTOP_ELECTRON.md).
> Citations below use the shorthand **PB §n** for its sections and
> **PB App. n** for its appendices. When this skill and the playbook disagree,
> the playbook wins.

## 1. The order of work

1. **Pin the target major first.** Electron 45 / Chromium 156 / Node 24 is the
   playbook target (PB §2.1, PB §2.6); latest three majors are supported and a
   new major ships every 8 weeks, so a legacy source is usually several majors
   behind and every removed API needs a row in the migration tables. Record the
   major, the update channel and the support-window intent as ADRs (PB §1).
2. **Read the source and its tests.** The tests are the specification. If
   there are none, write characterization tests against the current behavior
   first.
3. **Port the tests first.** Same cases, same assertions, expressed in Vitest
   against ViewModels with a fake `CorePort` (PB §16.1). A port without a
   failing test is a rewrite with hope.
4. **Map every screen, command, deep link, IPC channel, network call and
   storage key.** One table: what the old app does, what process/channel it
   runs on today, which target process/channel it maps to (PB §3.1, PB §5.1).
   Every storage key lands in a per-tenant/per-user projection with a retention
   rule (PB §10).
5. **Define the target layers** before porting: domain, application, adapters,
   views with ViewModels, platform, contracts — plus the four-process split
   (main / core utility process / preload / renderer) and the per-target
   tsconfigs that make the walls real (PB §3.2, PB §3.3).
6. **Port one window and one slice at a time.** Ports return
   `Promise<Result<T, E>>`; errors are values; no `throw` across process
   boundaries (PB §3.4). The renderer never touches Node, network or secrets.
7. **Run the gates.** Typecheck (all targets), lint + dependency-cruiser
   (layer walls fail CI, PB §3.2), unit suite, a packaged build with the fuses
   read back from the artifact (PB §12.3), the `app://` protocol and CSP
   verified on the packaged output, and a release run on the Floor profile
   inside the budgets (PB §2.2, PB §16.4). Testing only the unpackaged dev
   build misses fuse/ASAR/CSP failures (PB §20).
8. **Write `PORTING.md`.** Every deliberate difference, every framework
   feature not reproduced, every dependency dropped and why, the Electron major
   you came from and removed APIs you replaced.

## 2. Legacy Electron to Electron 45 mapping

Citations name the playbook rule the target satisfies. Anything
version-specific not verifiable from the playbook must carry `(verify)`.

### 2.1 `nodeIntegration: true`, disabled `contextIsolation`/`sandbox`

The old app's Node code runs inside a web page; any XSS becomes remote code
execution (PB §20).

- Split the app into the four-process model: main (privileged, thin), core
  (utility process), preload (bridge), renderer (untrusted) (PB §3.1).
- Migrate the renderer's Node work into core adapters and use cases, reachable
  through typed RPC (PB §5.1).
- Set the mandatory window defaults; the old `nodeIntegration` key disappears
  by construction (PB §12.2).
- The `tsconfig` splits make the old imports (`fs`, `path` in the renderer)
  a compile error, and dependency-cruiser backs it up in CI (PB §3.2).

### 2.2 The `remote` module

Removed from Electron years ago (any use means the source predates Electron 44;
verify the source major); it is explicitly disallowed (PB §5.4, PB §20).

- Every `remote.<x>` call becomes either a typed RPC type in `contracts/ipc`
  → use case in core, or a `platform/` adapter in main when it is really an
  OS capability (window sizing, menu, dialog), not business logic (PB §3.3).

### 2.3 `ipcRenderer.sendSync` and `event.returnValue`

Synchronous IPC blocks the renderer and the main process; disallowed (PB §5.4).

- Replace with the brokered RPC: `ipcRenderer.invoke('rpc', envelope)` through
  the preload bridge, handler in main behind the PEP, forwarded to core
  (PB §5.1).
- Callers that relied on the synchronous result become async ViewModels with a
  status (`loading | ready | empty | …`); keep the same observable outcome, but
  the UI now survives a slow core (PB §3.5).
- One-shot migration data fetched synchronously at boot becomes part of the
  startup snapshot flow instead (PB §2.4) — if that changes what is on screen
  before the first snapshot, list it in `PORTING.md`.

### 2.4 `file://` app content

Loading `file://` in privileged windows is rejected: path abuse and no CSP
delivery (PB §7, PB §20).

- Serve the renderer from a custom `app://` protocol with a standard/secure
  scheme registered before `ready`, path containment (`realpath`-checked
  prefix), CSP and `nosniff` response headers (PB App. E).
- Update every `window.location`, `asset://`, deep-link and dev-server URL to
  the new origin; the PEP must keep rejecting anything but the `app://` origin
  and the top frame of a window we created (PB §5.1).

### 2.5 In-app login (`BrowserWindow` to the IdP, `<webview>` logins)

Rejected: phishing and shared-process exposure (PB §8, PB §20).

- Move to OIDC Authorization Code + PKCE in the **system browser** via
  `shell.openExternal`, with a loopback redirect served by the core (random
  port, single-use `state`, short timeout) or the registered custom protocol;
  device-code flow as the fallback for restricted environments (PB §8).
- Tokens move to core memory (access) plus `safeStorage`-encrypted blob in the
  user data dir (refresh); renderers never see them. On Linux inspect
  `getSelectedStorageBackend()` and refuse `basic_text` unless policy allows
  (PB §8, PB §12.4).
- The old app might have kept the same `<webview>`/in-app login "because of
  popups"; replace with the loopback flow, and record any behavior your IdP
  cannot support (e.g. third-party cookie flows that used the webview) in
  `PORTING.md`.

### 2.6 `localStorage`, IndexedDB and other renderer storage

Renderer storage is not authoritative and not a secret store (PB §10, PB §20).

- Settings and tokens move to validated JSON settings and `safeStorage`
  adapters (PB §10, PB §12.4); projection data moves to SQLite in the core
  (PB §10).
- Clear renderer partitions on sign-out; disable persistent caches that could
  hold sensitive data (PB §10).
- Note the deliberate difference when the old app worked offline purely because
  a token sat in `localStorage`: offline now goes through the outbox
  (`Idempotency-Key`, retry/backoff) rather than stored credentials (PB §6.3).

### 2.7 Generic IPC (`invoke(channel, …)`, ad-hoc string channels, dynamic payloads)

Defeats the isolation boundary (PB §5.4, PB §20).

- Consolidate to the envelope contract `{ v, id, type, correlationId, payload }`
  with zod strict schemas per `type` in `contracts/ipc`; unknown `v`/`type` is a
  typed rejection (PB §5.1).
- Validate on every send side and gate in main (PEP) with sender verification
  (`event.senderFrame` origin, top frame, known window id) and per-window
  capability tables (PB §5.1).
- Errors become typed `RpcError` codes, never stack traces or file paths shown
  to a renderer (PB §5.1).

### 2.8 Unfused binary (`ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS`, debug flags open)

Trivially tamperable; rejected (PB §12.3, PB §20).

- Wire the Forge `FusesPlugin` with the playbook table: `RunAsNode` off,
  `EnableNodeOptionsEnvironmentVariable` off, `EnableNodeCliInspectArguments`
  off, `EnableCookieEncryption` on, `EnableEmbeddedAsarIntegrityValidation` on
  (stable on macOS and Windows; do not claim it on Linux), `OnlyLoadAppFromAsar`
  on, `GrantFileProtocolExtraPrivileges` off; `packagerConfig` with `asar: true`
  (PB §12.3).
- CI reads the fuses from the packaged output with `@electron/fuses` and fails
  on drift; then signs; then re-verifies the signed artifact (PB §12.3). If
  packaging tooling cannot read fuses in your pipeline yet, that is still a
  `(verify)` gap, not a skip.

### 2.9 Shipping `--no-sandbox` (or a distro that pushes you there)

Never ship or document `--no-sandbox` as a fix (PB §12.5).

- Ship `.deb`/`.rpm` with the sandbox helper set up (AppArmor profile where the
  distro requires it) or distribute Flatpak/Snap; test on current Ubuntu LTS,
  Fedora and a Wayland session `(verify)` (PB §12.5).
- If the legacy "fix" lived in an installer, a wrapper script or documentation,
  remove all three copies; grep the release notes too.

### 2.10 Other common legacy APIs

| Legacy Electron | Target | Playbook |
|---|---|---|
| `app.getPath` to a dir next to the executable | `app.getPath('userData'\|'logs'\|'temp')`; per-user data separate from machine-wide config | PB §10 |
| Hand-rolled update download (or unsigned manifests) | Signed manifest, HTTPS, monotonic versions, rollback protection, updater host in main | PB §15.4, PB §20 |
| `process.platform` branches in feature code | `platform/` layer owns branching; adapters are per-OS behind ports | PB §3.2, PB §20 |
| Network stack via Node `http`/`undici` | `net.fetch` (Chromium stack) in core, so system proxy/PAC/enterprise certs apply; Node transport only for loopback/tests | PB §6.1 |
| Ad-hoc realtime over `ws` from the renderer | Core owns connections; `RealtimeMode` policy; SSE over streaming `net.fetch`; `net.WebSocket` where the major supports it `(verify)` | PB §9 |
| DevTools shipped open / `openDevTools` in prod | `devTools: !app.isPackaged` and DevTools are not a security control | PB §12.2, PB §20 |
| Native modules in the renderer path, no ADR | ADR required, rebuild per ABI, unpack from ASAR only what is required; prefer no-native-module options | PB §10, PB §12.4, PB §20 |

## 3. Web, Tauri and Qt to Electron

- **Web → Electron**: keep the SDK, ViewModels, tokens, route builders and
  design tokens (they are TypeScript and the same repos), because the desktop
  should reuse real code, with parity enforced by tests (PB §3.7). The HTTP
  calls move from the page's `fetch` to the core's `net.fetch` behind the
  preload bridge; `localStorage` → core settings/SQLite/`safeStorage`
  (PB §6.1, PB §10). CSP becomes `connect-src 'none'` — the renderer regains
  no network by moving to a window (PB §12.2). Drop the assumption that every
  route needs a page load: a routed view inside one main window replaces
  multi-tab flows (PB §7).
- **Tauri → Electron**: the Tauri command surface maps to `contracts/ipc`
  types (Rust command → core use case); the Tauri store maps to the SQLite
  projection + settings; the OS-keyring plugin maps to `safeStorage` with the
  `basic_text` check (PB §5.1, PB §10, PB §8). The updater surface maps to the
  signed-manifest host rather than the Tauri updater's format. Re-derive the
  fuses/ASAR/protocol story from scratch — Tauri has no equivalent to fuse
  (PB §12.3). `PORTING.md` must name what the Tauri webview could do that
  Chromium in Electron does not (per-distro webkit behavior differences are a
  parity risk to test, not an assumed match).
- **Qt → Electron**: Qt Widgets/Quick windows map to main-process windows with
  routed React views; a `Q_INVOKABLE`/signal-slot surface maps to typed RPC
  types; `QSettings` maps to validated settings; Qt SQL maps to the SQLite
  projection; the Qt keystore adapter maps to `safeStorage`. Keep the same
  ViewModel status set (`loading | ready | empty | forbidden | not-found |
  offline | error | policy-blocked`) so tests port almost unchanged (PB §3.5).
  The reverse risk is deliberate: the Qt app did *not* run a renderer, so its
  tests have nothing to say about CSP/`app://`/IPC abuse — keep the new
  Electron-only tests from the map step.

## 4. Behavior parity checklist

- [ ] Every screen, command, shortcut, menu action, tray item and deep link
      exists (deep links go through the strict parser and are untrusted input,
      no state change without confirmation) (PB §7).
- [ ] Every status is rendered: `loading`, `ready`, `empty`, `forbidden`,
      `not-found`, `offline`, `error`, `policy-blocked` (PB §3.5).
- [ ] Every network call on the old path has the same method, path, payload and
      headers; the SDK (not hand-written paths/DTOs) is the only caller
      (PB §6.1, PB §20).
- [ ] Every legacy IPC channel has been merged into the typed envelope or been
      deliberately dropped with a `PORTING.md` row (PB §5.1).
- [ ] Keyboard navigation and accessibility names match or improve; no
      mouse-only control survived the port (PB §20).
- [ ] The main process never runs blocking work; long operations and streams
      are in the core, the UI thread never freezes as it did in the legacy
      sendSync path (PB §3.1, PB §5.4).
- [ ] Tokens are in core memory and `safeStorage`; no secret in renderer
      storage, settings, SQLite, logs or crash dumps; `basic_text` refused
      (PB §8, PB §10, PB §12.4).
- [ ] The outbox is persisted and idempotent; conflicts return typed results
      the ViewModel presents (PB §6.3).
- [ ] The packaged build matches the fuse table and ASAR integrity; CI read
      the fuses from the artifact (PB §12.3).
- [ ] The rendered CSP is the `app://` one and the renderer has no
      `connect-src` (packaged run, screenshot the DevTools network panel in a
      debug build only) (PB App. E, PB §12.2).
- [ ] The release build meets the startup/scroll budgets on the Floor profile
      (PB §2.2, PB §2.3, PB §16.4).
- [ ] The original tests pass, ported, with a fake `CorePort`; new tests cover
      the Electron-only paths (fuses, protocol, PEP, safeStorage) (PB §16).
- [ ] `PORTING.md` lists every deliberate difference, including any removed API
      surface the original shipped but no reachable screen used.

## 5. What not to do

- **Do not keep the legacy shape.** A renderer with `nodeIntegration` "because
  we are on the same major we always used", a `remote` shim, a generic
  `invoke(channel, …)` bridge, or a hidden `<webview>` is a port that will be
  rewritten again (PB §5.4, PB §20).
- **Do not do the reverse of this skill's name.** Do not port Electron-45
  behavior *to* an old major and call it done — the target is the playbook's
  supported Electron 45; caret ranges to "whatever major is installed" are
  rejected (PB §2.6, PB §20).
- **Do not fake the sandbox.** `--no-sandbox`, `webSecurity: false`, disabled
  `contextIsolation` to fix one bug, or a `basic_text` secret store "temporarily"
  are rejections, not compromises (PB §12.2, PB §12.5).
- **Do not skip the packaged run.** The port is not finished on `pnpm dev`;
  the gates cover the packaging step, the fuses, the protocol and the CSP
  (PB §12.3, PB App. E, PB §20).
- **Do not silently change behavior.** Reproduce the source quirk, pin it with
  a test, and list the fix as a follow-up — or fix it deliberately and say so,
  every time.
- **Do not widen the bridge because the old app passed complex objects.** Host
  objects, prototypes and complex objects through `contextBridge` are a known
  isolation-bypass vector; the bridge carries JSON-serializable data only
  (PB §5.3).
- **Do not hand-roll the pieces the contract owns.** Paths, DTOs, IPC types and
  the policy schema are generated or shared artifacts (PB §3.7, PB §20).

## 6. Cross-skill contract

- `electron-best-practices` is the target style; every ported window and slice
  follows it, and the port inherits its references as read-only context.
- `electron-review` reviews the port before release. A broken architecture
  contract — a layer wall, a trust-zone violation, a fuse value or a CSP term
  off the pinned table — is ranked above every other finding, and a broken
  architecture contract is an automatic Must fix.
- The `lints/` config is the machine-checkable half of the walls: renderer not
  importing `electron`, `node:*` or the SDK; domain/application clean; preload
  clean. A port that needs a lint exception is a port that has not finished.
