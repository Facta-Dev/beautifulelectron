---
name: electron-best-practices
description: >-
  Write secure, fast, maintainable Electron desktop apps in TypeScript. Use
  this skill whenever you write, review, refactor, debug, or explain an
  Electron app: the main process, the utility (core) process, the sandboxed
  preload bridge, React renderers, typed IPC, BrowserWindow and webPreferences,
  the app:// protocol, safeStorage, SQLite storage, SDK auth, SSE/WebSocket
  realtime, fuses and ASAR integrity, CSP, packaging and updates, or
  enterprise policy. Trigger on any mention of Electron, desktop app, IPC,
  contextIsolation, sandbox, fuses, ASAR, utilityProcess, app://, or "fix
  this desktop app" even when the user never says "best practices".
  Synthesized from Electron's process model and security documentation and
  the facta Electron handbook.
---

# Electron best practices

> Playbook set: start with [`PLAYBOOK_MASTER.md`](https://github.com/Facta-Dev/ai-coding-playbook/blob/main/PLAYBOOK_MASTER.md) —
> the catalog, precedence and cross-playbook invariants — then
> [`PLAYBOOK_DESKTOP_ELECTRON.md`](https://github.com/Facta-Dev/ai-coding-playbook/blob/main/PLAYBOOK_DESKTOP_ELECTRON.md). This skill is the runnable companion of
> that contract.

Distilled from Electron's process model and security guidance and the facta
Electron handbook. The digests live in `references/`; where sources disagree,
this file says which to follow and why.

## 1. Mindset

- **Renderers are untrusted web pages.** Sandboxed, context-isolated, no Node,
  no network of their own, no secrets. A compromised renderer must not be able
  to reach the OS, the filesystem, tokens or other windows.
- **Three trust zones, three jobs.** *Main* is the thin trust anchor (windows,
  OS adapters, the IPC policy enforcement point, the updater host). *Core* (a
  utility process) is the application brain (use cases, SDK, realtime,
  storage). *Renderer* draws state and sends intents.
- **One typed, validated, minimal IPC contract.** Channels are allowlisted,
  payloads are schema-validated on both sides, senders are verified, and the
  preload exposes functions, never `ipcRenderer`.
- **The main process never blocks.** Anything slow, parsing-heavy,
  network-bound or crash-prone runs in the core process or a worker.
- **Domain and application know nothing about Electron.** They talk through
  ports; Electron and Node types are confined to adapters and entrypoints.
- **The backend is the source of truth.** The desktop holds a projection cache
  and an outbox; authorization is always server-side; roles shape UX only.
- **Supply chain is the main attack surface.** Electron bundles Chromium and
  Node.js plus an npm tree: pin, verify, scan, upgrade on a fixed cadence.
- **Administrators are first-class.** Managed policy, kill switch, update
  window, diagnostics and audit are designed in, not bolted on.

## 2. Before you hand back code

Run these and fix everything they report; `tsc --noEmit` for **every target**
tsconfig (`main`, `preload`, `core`, `renderer`, `test`):

```bash
npx tsc --noEmit -p tsconfig.main.json   # and likewise for every target tsconfig
npx eslint .
npx vitest run
npx depcruise --config dependency-cruiser.config.cjs src
```

- Fix a lint rather than silencing it. A `@ts-expect-error` needs a reason on
  the narrowest line; `@ts-ignore`, `@ts-nocheck` and a blanket
  `eslint-disable` are findings, not fixes.
- Never weaken or delete a gate, a failing test or a lint rule to make a
  change pass; if a migration or dead-code cleanup must delete anything,
  flag the deletion itself, loudly.
- Lint config lives once, in `eslint.config.mjs`, plus dependency rules in
  `dependency-cruiser.config.cjs`. If a project has none, suggest the
  BeautifulElectron drop-in at `lints/eslint.config.mjs` of
  https://github.com/Facta-Dev/beautifulelectron.
- The layer walls are enforced, not advisory: `domain`/`application` never
  import `electron` or `node:*`; the renderer never imports `electron`,
  `node:fs` or `@/sdk`; violations fail CI.
- Code sketches that use Electron APIs do not need to compile in review;
  pure TypeScript fragments do.

## 3. Three trust zones

| Zone | Trust | Owns | Must not |
|---|---|---|---|
| **Main** | Privileged | Window/`WebContentsView` lifecycle, `app://` protocol, menus, tray, dialogs, `safeStorage`, updater host, policy reader, **IPC enforcement**, crash reporter | Business logic, SDK, DB, long loops; blocking work; loading remote content |
| **Core** (utility process) | Trusted, no UI | Use cases, SDK, realtime, SQLite, outbox/sync, session (tokens in memory) | Touch the DOM; privileged Electron UI APIs; accept unvetted senders |
| **Preload** | Semi-trusted bridge | The narrow `contextBridge` API generated from the contracts | Expose `ipcRenderer`, `require`, `process`, generic `invoke(channel, …)` |
| **Renderer** | **Untrusted** | Views, ViewModels, local UI state | Node, filesystem, network, secrets, cross-window access |
| **Utility/worker** | Trusted, disposable | One heavy task (parsing, export, hashing), then exit | Long-lived state; direct access to renderers |

The rule that follows: **the session and the SDK live in the core, the OS lives
in main, and the renderer sees only typed functions over the bridge.**

## 4. Process model

- **Main is thin.** It starts windows, registers the protocol, reads policy,
  forwards validated IPC to core, hosts the updater and the crash reporter. If
  a handler in main takes more than a few milliseconds to reason about, it
  belongs in core (`utilityProcess.fork`) or a worker.
- **Core is the application brain.** Main supervises it: a scrubbed
  environment, restart with backoff on crash (surface a "reconnecting"
  status), and refuse to run if the core entrypoint is not inside the
  packaged app. The core never touches the DOM.
- **Watchdog.** A timer in main/core measures event-loop delay; stalls beyond
  the budget (≤ 50 ms hard limit) are logged and counted.
- **Startup stays flat.** Bundle main, preload, core and renderer so boot
  does not resolve a deep `require` tree; lazy-load features and windows;
  use Node's compile cache (`module.enableCompileCache()`).
- **Language targets.** ESM for main/core/build tooling; a sandboxed preload
  is a self-contained CommonJS/IIFE bundle (verify module support per major).
- **One renderer per window** — created lazily, destroyed (not hidden) when
  heavy.

## 5. IPC and the preload bridge

Default transport — brokered, typed, validated at every hop:

```text
Renderer → preload bridge → ipcRenderer.invoke('rpc', envelope) → MAIN
  (PEP: verify sender, window capability, schema)
  → utilityProcess → CORE (use case) → result → MAIN → renderer
Events: CORE → MAIN fans out per subscription, coalesced, to subscribers
```

- **Envelope:** `{ v, id, type, correlationId, payload }`. `type` selects a
  schema in `contracts/ipc`; unknown `v` or `type` is a typed rejection.
  Additive changes only within `v`.
- **Sender verification in main, every message:** the `senderFrame` URL and
  origin must be the `app://` origin, the frame must be the **top frame** of a
  window we created, and the `webContents.id` must map to a registered window
  kind. Child frames and navigated pages are rejected.
- **Capability table per window kind** (`main`, `admin`, `settings`): which
  message types it may send, which topics it may subscribe to. A capability
  grants UX routing only; core use cases and the backend still authorize.
- **Validation both sides:** zod `strict()` schemas (renderer for early
  feedback, main as the gate, core as the final guard); size limits; no
  prototype-bearing objects.
- **Errors are values** (`Result<T, RpcError>`), never thrown across process
  boundaries; typed error codes aligned with the shared taxonomy; never leak
  stack traces or file paths to a renderer.
- **MessagePorts for streams.** After the PEP approves, main creates a
  `MessageChannelMain`, hands one end to core and one to the renderer. The
  port is scoped to a capability and closed on window close, navigation or
  policy change.
- **Preload rules:** expose named functions only
  (`hmd.rpc(type, payload)`, `hmd.subscribe(topic, cb)`,
  `hmd.platform.info()`), generated from the contracts; pass only
  JSON-serializable data; never bridge complex or host objects (a 2026
  advisory showed such objects can let an attacker with script execution
  reach the isolated world); keep the preload tiny — it runs before every
  page; no secrets in it.
- **Disallowed:** `remote`, `ipcRenderer.sendSync`,
  `webContents.executeJavaScript` with dynamic strings, `nodeIntegration`,
  `<webview>`, `enableBlinkFeatures`, secrets over IPC.

## 6. Windows, navigation and `app://`

- **Secure window factory defaults** (mandatory; never disabled to fix a bug):

```text
webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false,
  nodeIntegrationInWorker: false, webviewTag: false, webSecurity: true,
  allowRunningInsecureContent: false, experimentalFeatures: false,
  safeDialogs: true, spellcheck: false, devTools: !app.isPackaged }
```

- **`app://`, never `file://`.** Register the custom scheme as privileged
  (`standard`, `secure`, `supportFetchAPI`) **before** `app.ready`; serve the
  packaged renderer from ASAR with `protocol.handle`; enforce path
  containment (`realpath`/prefix check); attach the CSP as a response header.
- **Navigation lockdown:** `will-navigate` allows only the `app://` origin;
  `setWindowOpenHandler` denies and routes allowed links through
  `shell.openExternal` with a scheme/host allowlist; `will-attach-webview` is
  prevented.
- **Permissions deny by default:** `session.setPermissionRequestHandler` and
  `setPermissionCheckHandler` allow only what a window kind needs
  (clipboard-write, notifications) and nothing like geolocation or camera
  unless a slice requires it. Never relax TLS verification; enterprise CAs
  come from the OS store via Chromium.
- **Windows:** one main window with routed views first; extra windows get
  their own capability set, partition and size persistence that survives
  disappeared monitors.
- **Deep links are untrusted input.** Register the custom protocol per OS,
  receive via `open-url` (macOS) and `second-instance` (Windows/Linux, with
  `app.requestSingleInstanceLock()`); parse in main with a strict parser
  (route allowlist, ID validation, size limits, no actions); forward through
  the PEP; state-changing actions need UI confirmation and a session.
- **Embedded third-party content** (if unavoidable) runs in a
  `WebContentsView` in a separate partition, no preload, no IPC — never in a
  privileged window.

## 7. Backend, SDK, auth and realtime

- **The SDK runs only in core**, over Chromium's network stack (`net.fetch`):
  system proxy/PAC, enterprise certificate stores and proxy auth work without
  extra code. Node's `http`/`undici` ignore system proxies — loopback and
  tests only.
- **Paths and DTOs are generated.** Hand-written API paths or DTOs are
  contract drift; interceptors add auth (Bearer from memory, single-flight
  refresh), tenant, correlation, client info, idempotency, and retry
  (backoff + jitter, honor `Retry-After`); every call has a timeout and
  cancellation (`AbortSignal`); the SDK refuses origins outside the
  policy/tenant allowlist.
- **Authorization is server-side.** `can("funnels.leads.update")` shapes the
  UI only; roles and permissions never authorize an action.
- **Offline is a first-class mode.** The local DB is a projection cache;
  offline mutations go to an **outbox** with `Idempotency-Key`, retry/backoff
  and per-entity ordering; conflicts are typed results. Long operations
  (`202 Accepted`) are tracked and survive restarts.
- **Auth is OIDC Authorization Code + PKCE in the system browser** (loopback
  redirect served by core, or the registered custom protocol). **Never** an
  in-app `BrowserWindow` login for a third-party IdP. Access token in core
  memory; the refresh token is `safeStorage`-encrypted; renderers never see
  a token.
- **Realtime is optional and degradable.** Modes
  `auto | websocket | sse | polling | off` (policy > user > default); the app
  is fully correct with polling or none.
- **Transports:** SSE as streaming `net.fetch` (`Accept: text/event-stream`,
  `Last-Event-ID` on resume, spec-compliant parser with size caps);
  WebSocket via `net.WebSocket` (Chromium stack: proxy, certificates) where
  the major supports it (verify), otherwise `ws`; token in the handshake
  header, never in the URL.
- **Lifecycle:** core owns connections; `powerMonitor` (`suspend`, `resume`,
  `lock-screen`) and connectivity changes trigger reconnect; drop half-open
  sockets; snapshot + stream with at-least-once delivery, dedupe by event ID,
  `resyncRequired` after gaps, backoff with jitter (1 s → 60 s cap).
  Renderer updates are coalesced to ≤ 30 Hz.

## 8. Storage, outbox and secrets

- **SQLite in core:** WAL, prepared statements, batched transactions,
  forward-only migrations in code tested from every released schema, backup
  before migrating, integrity check after a crash, **reset-and-resync** on
  corruption (the server holds truth).
- **Driver is an ADR:** `better-sqlite3` (native, fastest, rebuilt per ABI,
  ASAR-unpacked) vs built-in `node:sqlite` (no native module; verify
  availability/stability in Electron's Node) vs WASM. Prefer no native
  module when it meets the budget.
- **Per-tenant/per-user databases** (or tenant-first indexes) so tenant
  switch and sign-out purge cleanly. Retention (`DataRetentionDays`) runs as
  a background job; temp files live in a private dir.
- **Paths** come from `app.getPath('userData' | 'logs' | 'temp')` — never
  next to the executable. Settings are small JSON with schema validation and
  atomic writes; policy-locked keys are read-only in the UI.
- **Renderer storage is not durable state.** Don't put authoritative data in
  `localStorage`/IndexedDB; clear partitions on sign-out; keep sensitive
  caches non-persistent.
- **Secrets** go through `safeStorage` only, behind a `SecretStorePort`:

```text
if (!safeStorage.isEncryptionAvailable()) throw new SecretStoreUnavailable('no-os-keystore');
if (process.platform === 'linux' &&
    safeStorage.getSelectedStorageBackend() === 'basic_text' &&
    !policy.allowBasicTextSecrets) throw new SecretStoreUnavailable('weak-backend');
// store only opaque safeStorage blobs; the caller falls back to
// "sign in each session" rather than persisting plaintext
```

  On Linux, the `basic_text` backend is plaintext-equivalent: refuse it
  unless policy explicitly allows. On macOS, `safeStorage` depends on the app
  being signed. Tenant provider keys never live on the desktop.

## 9. Security (fuses, CSP, supply chain)

- **CSP is a response header from the `app://` handler** (text fence, not
  shipped as-is):

```text
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://<cdn>;
connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'
```

  `connect-src 'none'`: the renderer has no network. No `eval`, no
  `new Function`, no remote `<script>`; consider Trusted Types.
- **Fuses are flipped in packaging, before signing, and verified in CI**
  (before and after signing with `@electron/fuses read`; CI fails on drift):

| Fuse | Value |
|---|---|
| `RunAsNode` | off |
| `EnableNodeOptionsEnvironmentVariable` | off |
| `EnableNodeCliInspectArguments` | off |
| `EnableCookieEncryption` | on |
| `EnableEmbeddedAsarIntegrityValidation` | on (macOS and Windows; not on Linux — don't claim it there) |
| `OnlyLoadAppFromAsar` | on |
| `GrantFileProtocolExtraPrivileges` | off |

  ASAR integrity detects tampering with the archive; it does not hide code.
- **Threats mapped to controls** (full table in
  `references/electron-security.md`): XSS/compromised renderer → sandbox and
  CSP; IPC abuse → allowlist, sender verification, capabilities; local
  tampering → fuses, ASAR integrity, signed updates; token theft →
  `safeStorage` and tokens only in core memory; remote debugging → inspect
  fuses off, DevTools off by policy.
- **Supply chain:** lockfile and frozen installs; `--ignore-scripts` by
  default; a release-age cooldown for new dependencies; SCA/SBOM **including
  the bundled Chromium/Node/Electron versions**; provenance and pinned CI
  actions; native modules avoided, and when unavoidable, N-API prebuilt,
  rebuilt per ABI, hashed, signed, unpacked from ASAR only when required.
- **Chromium/Node/Electron CVEs are your CVEs.** A new major ships every 8
  weeks; the latest three majors are supported; a pinned major expires in
  ~6 months. Stay on the latest or latest-minus-one; adopt security patch
  releases on an SLA via a canary → stable rollout.
- **Never ship `--no-sandbox`.** On some distros Chromium's sandbox needs the
  setuid helper or user namespaces: ship `.deb`/`.rpm` with the sandbox
  helper set up and an AppArmor profile where required, or Flatpak/Snap
  (verify distro behavior per release).

## 10. Architecture (hexagon + slices + MVVM)

| Layer | Contains | May depend on | Must not depend on |
|---|---|---|---|
| **domain** | Entities, value objects, rules, events | `shared-kernel` | `electron`, `node:*`, DOM, React, the SDK |
| **application** | Use cases, ports, policy resolver, outbox | domain, `contracts`, `shared-kernel` | Electron/Node/DOM APIs, adapters |
| **adapters/in** | IPC handlers, protocol/deep-link handlers, ViewModels | application, contracts | other slices' internals, SQL/HTTP |
| **adapters/out** | SDK client, realtime, SQLite, keystore, updater, telemetry | application ports, `platform` | views |
| **views** | React components | ViewModel hooks, `ui-kit` | the SDK, `electron`, IPC directly |
| **platform** | Per-OS adapters (`process.platform` lives only here) | Electron/Node APIs | domain/application |
| **contracts** | DTOs, IPC schemas, error codes, policy schema | `shared-kernel` | everything else |

The contracts below are **unbreakable and non-waivable**: they are the reason
the app survives a compromised renderer and a tampered install. Projects can
restyle anything; developers cannot opt out, and neither can you.

1. **Only the core holds the session and calls the SDK.** A renderer asks
   core through the typed IPC.
2. **`domain` and `application` never import `electron`, `node:fs` or any
   `node:*` module.** Platform access goes through ports in adapters.
3. **The renderer never receives a token.** Not over IPC, not in a DOM
   attribute, not in `localStorage`, not in a log.
4. **Every IPC message is authenticated by sender, authorized by the window
   capability table, and parsed by a schema.**
5. **`process.platform` is branchable only in `platform/` and build files.**

When a change would cross a layer, **re-cut the layout**: move the logic to
the layer that owns it. The rule is never to weaken or delete the lints to
make a change pass; a config exception is a contract change.
Review treats a broken contract as an automatic Must fix; `electron-review`
ranks it above every other finding.

- **Per-target `tsconfig`** (`main`, `preload`, `core`, `renderer`) with
  distinct `lib`/`types`: the renderer cannot import Electron or Node types;
  main/core cannot reference DOM types. Enforced with `no-restricted-imports`,
  `no-restricted-globals` (`process`/`require` out of renderer and domain)
  and dependency-cruiser; violations fail CI.
- **MVVM in the renderer.** A ViewModel is state + commands with the shared
  status set (`loading | ready | empty | forbidden | not-found | offline |
  error | policy-blocked`); it depends on a `CorePort` (typed RPC client over
  the bridge) so tests swap in a fake; Views are React components with no
  business logic. ViewModels shared with web/extension are reused, not
  forked.
- **Vertical slices mirror backend slices** one-to-one (`funnels`, `projects`,
  `tenants`, …), each with `domain/ application/ adapters/ viewmodels/
  views/ contracts/`; cross-slice access only through `contracts/`.
- **Ports return `Promise<Result<T, E>>`; errors are values**; no `throw`
  across a process boundary.

## 11. Performance and GPU safe mode

Budgets (Floor profile: 2 cores, 4 GB RAM, SSD; starting points to calibrate):

| Metric | Budget |
|---|---|
| Cold start to first usable window (SSD / HDD) | ≤ 2.5 s / ≤ 4 s |
| Warm start | ≤ 1.2 s |
| Main-process event-loop block | ≤ 16 ms typical, ≤ 50 ms hard limit |
| Renderer long tasks in primary flows | none > 50 ms; lists virtualized |
| Idle CPU | ≈ 0% — no timers, animations or polling without need |
| Idle RAM, single window, after warm-up | ≤ ~300 MB across processes |
| Additional window | ≤ ~100 MB each |

- Create the window with `show: false` and reveal on `ready-to-show`; defer
  updater checks, telemetry flush and realtime connect until after first
  paint; code-split per route and role (performance, not security).
- Bound every cache (LRU with size accounting); release IPC listeners and
  ports on unmount; track `app.getAppMetrics()` in diagnostics; no unbounded
  logs or event history in memory.
- **GPU safe mode is a guarantee, not a preference:** a `Compatibility mode`
  (policy and user setting `HardwareAcceleration = auto | off`) calls
  `app.disableHardwareAcceleration()` before `app.ready`; a small
  `startupInProgress` boot flag read synchronously detects a failed launch
  and the next start runs in software rendering; repeated
  `child-process-gone` GPU events do the same; `--disable-gpu` and an env
  override exist for support; the UI is fully usable in software rendering
  (CI proves it on all three OSes); a driver blocklist is driven from
  policy/diagnostics.

```text
// main — before app.whenReady()
const boot = readBootStateSync();                       // { startupInProgress, gpuCrashes }
if (policy.hardwareAcceleration === 'off' || argv.includes('--disable-gpu')
    || boot.startupInProgress || boot.gpuCrashes >= 2) {
  app.disableHardwareAcceleration();
}
app.on('child-process-gone', (_e, d) => { if (d.type === 'GPU') bumpGpuCrashes(); });
firstWindow.once('ready-to-show', () => clearBootFlagSync());
```

## 12. Platform

`process.platform` branching lives in `platform/` and nowhere else; each OS
adapter implements a port and is selected in the composition root.

| Capability | Windows | macOS | Linux |
|---|---|---|---|
| Secret store | `safeStorage` (DPAPI) | `safeStorage` (Keychain; signed app) | `safeStorage` (libsecret/kwallet; refuse `basic_text`) |
| Notifications | Toast (`app.setAppUserModelId`) | Notification Center (permission) | D-Bus notifications |
| Tray | Notification area | Menu bar extra | AppIndicator — not guaranteed; keep a fallback |
| Protocol registration | Registry (installer) | `Info.plist` via packager | `.desktop` MIME handler |
| Window chrome | `titleBarOverlay` (Mica/snap) | `titleBarStyle: hiddenInset` | Native/GTK or frameless; CSD differences |
| Display server | n/a | n/a | **X11 and Wayland** (`--ozone-platform-hint=auto`); tray, global shortcuts, screen capture differ (verify per major) |
| High DPI | Per-monitor | Retina | Fractional scaling needs testing |
| Packaging | Squirrel, MSI, NSIS, zip | Squirrel.Mac (zip), DMG, pkg (MDM) | deb/rpm repos, Flatpak, Snap, AppImage |
| Accessibility | UIA via Chromium | NSAccessibility | AT-SPI |

Every capability has a graceful fallback (no tray → in-app notification
center). Keyboard shortcuts use platform modifiers (`CmdOrCtrl`); native
menus follow OS conventions; **accessibility is mandatory** — semantic HTML,
ARIA, focus management, keyboard-only operation, reduced motion, and screen
reader checks on all three OSes.

## 13. Enterprise policy, updates and observability

- **Managed policy per OS:** Windows registry `HKLM\Software\Policies\<…>`
  with ADMX/ADML, macOS managed preferences (plist), Linux
  `/etc/<product>/policy.json`. Precedence `managed > user > defaults`,
  resolved by a pure, schema-validated `PolicyResolver` in the application
  layer; the UI labels locked controls "managed by your organization".
- **Key policy keys:** `TenantUrl`, `SsoMode`/`IdpIssuer`/`ClientId`,
  `UpdatesEnabled`/`UpdateChannel`/`UpdateWindow`, `RealtimeMode`,
  `TelemetryLevel`, `HardwareAcceleration`, `DevToolsEnabled`, `KillSwitch`,
  `FeatureFlags`, `DataRetentionDays`. Invalid values are ignored, not
  crashed on.
- **Kill switch:** policy plus signed remote config (data only, schema
  validated, safe bundled defaults) can disable features or force read-only;
  a minimum-version gate surfaces `upgrade-required`.
- **Updates:** channels `canary` → `beta` → `stable` with staged rollout and
  auto-halt. The platform signature (Squirrel/`autoUpdater`, or
  `electron-updater` with differential updates; package repos on Linux) is
  necessary but not sufficient: add our own **signed update manifest**
  (Ed25519; version, channel, platform/arch, URL, hash, size,
  `minSupportedVersion`) verified before the updater may fetch; reject
  non-monotonic versions and downgrades; keep the previous version for
  rollback. Managed fleets can defer, pin, disable self-update, or use an
  internal mirror via policy.
- **Pipeline order:** build → package → flip fuses → verify fuses → sign →
  notarize → verify → SBOM → publish to a staged rollout. Signing runs in an
  isolated CI job with approval; keys live in an HSM or cloud signing
  service, never on developers' machines or runners.
- **Observability:** structured JSON logs (redacted, rotated, size caps);
  `crashReporter` (Crashpad) + a crash service, with symbols uploaded
  privately and minidumps opt-in by policy; `render-process-gone`,
  `child-process-gone` and `unresponsive` handlers reload the window,
  restart core with backoff, and detect crash loops → safe mode (GPU off);
  metrics for startup phases, loop delay, IPC latency per type, realtime
  state, memory per process; a `correlationId` born at the user action and
  propagated through IPC → SDK headers → realtime/logs.
- **Diagnostics bundle** is user-initiated and redacted: versions (app,
  Electron, Chromium, Node), OS and GPU info, renderer mode, policy snapshot
  without secrets, realtime history, outbox counts, `app.getAppMetrics()`,
  recent errors with correlation IDs.
- A distributed desktop app is a **product with digital elements**: expect a
  disclosure policy, an SBOM that includes the bundled Chromium/Node/Electron,
  security updates for the declared support window (plan for the ~6-month
  life of every Electron major) and CRA-style reporting duties (dates in the
  playbook; confirm scope with counsel).

## 14. Testing

- **Unit/ViewModel:** domain rules and use cases against fake ports;
  ViewModels against a fake `CorePort`, covering every status; no DOM.
- **Contract:** every IPC message type has a valid and an invalid fixture,
  both ends using the same schema, unknown fields rejected; a
  sender-spoofing test per message class; the policy schema and the realtime
  envelope have fixtures; SDK matches OpenAPI.
- **Adapter integration:** SSE/WebSocket transports against local servers —
  reconnect, resume, duplicates, out-of-order, heartbeat loss, proxy
  buffering, slow consumer; SQLite migrations from every released schema;
  the `safeStorage` adapter; policy readers per OS.
- **E2E on the packaged app** (`@playwright/_electron.launch`): sign-in,
  core journeys, offline→online, realtime update, kill switch, update flow —
  on Windows, macOS, Linux (X11 **and** Wayland), GPU and software rendering.
  Unpackaged dev builds hide fuse/ASAR/CSP failures.
- **Platform suites:** installer lifecycle on clean VMs; policy application
  per OS; fuse verification; security probes (IPC fuzzing, navigation and
  new-window attempts, permission probes, `app://` path traversal, XSS
  corpus, deep-link fuzz, secrets-in-logs scans, update tamper, no
  `--no-sandbox` check).
- **Performance gates:** startup, idle RAM/CPU, event-loop delay, soak, and
  realtime burst on a constrained Floor runner, compared against the last
  release with a regression threshold; results stored as release evidence.
- **Test rules:** no fixed sleeps; flaky tests quarantined with owner and
  expiry; no test touches production services or real tenant data; every
  realtime transport passes the same conformance suite.

## 15. Cross-skill contract

- `electron-review`'s top report category is `Architecture contracts (always Must fix, ranked first)`.
- A broken architecture contract (ranked above everything) outroutes severity.
- `electron-port` ports legacy Electron apps (`nodeIntegration`, `remote`,
  in-app login, unfused binaries), web apps and other desktop stacks to
  Electron 45 with the same behavior; it ports the tests first.
- The `lints/` config (drop-in `eslint.config.mjs` + dependency walls) is the
  machine-checkable half. When this skill and the config disagree, the
  config wins and this file is fixed.

## Sources

- `references/electron-platform.md` — runtime facts, process model, per-OS
  essentials and packaging matrix.
- `references/electron-security.md` — the hardening defaults, CSP, fuses,
  ASAR integrity, secrets and Linux sandbox reality.
- `references/electron-architecture.md` — the layer contract, ports, MVVM
  and `CorePort`, slices and repository layout.
- `references/typescript-strict.md` — the strict tsconfig set, `Result`
  patterns and the boundary types an Electron app needs.
