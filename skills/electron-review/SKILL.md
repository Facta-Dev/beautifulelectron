---
name: electron-review
description: >-
  Review an Electron 45 / TypeScript desktop change — a main-process or core
  process module, the preload bridge, an IPC channel, the app:// protocol
  handler, the renderer, the SDK or SQLite adapter, the fuse/packaging config,
  a policy key, or a diff — and produce a prioritized report where every
  finding cites the file and line, the rule it breaks, and the smallest fix.
  Use this skill whenever the user asks to review, audit, critique, or "find
  problems in" an Electron app, a window, an IPC handler, the bridge, or a
  packaging change. Trigger on review, audit, code review, PR review, "what is
  wrong with this window", "check this IPC channel", "review the preload", or
  a pasted .ts/.mjs/fuse/policy file. Architecture and trust-zone contracts
  always rank first.
license: MIT
---

# Electron review

A review is a prioritized list of findings, not a rewrite. Read the whole
change first. Every finding has four parts: **location** (file and line),
**severity**, **the rule it breaks** (named or quoted), and **the smallest
fix**. If you cannot cite a rule or a user-visible consequence, it is not a
finding; it is a preference for the Notes section, if anywhere.

The rules this review cites live in `PLAYBOOK_DESKTOP_ELECTRON.md`; section
numbers below point there. The contracts below are **unbreakable and non-waivable**:
they are the reason a compromised renderer stays a nuisance
instead of becoming a foothold, so when a change would cross a layer or a
trust boundary, **re-cut the layout** — move the logic to the process or layer
that owns it. Review treats a broken contract as an automatic Must fix;
developers cannot opt out, and neither can you.

## 1. Report shape

```text
## Verdict
<one paragraph: what this change does, whether it is safe to ship, and the
single most important thing to fix>

## Must fix
1. <file>:<line> — <finding>. Rule: <rule or contract>. Fix: <smallest fix>.

## Should fix
...

## Notes
...

## Waived gates
...
```

- **Must fix** blocks merge or release: a broken trust zone, a generic or
  unvalidated IPC channel, a window without navigation lockdown, a secret
  outside `safeStorage`, a removed fuse, a blocking main process.
- **Should fix** is worth doing in this change or the next: a missing
  schema `.strict()`, an uncoalesced event fan-out, a heavy `ready` path,
  a missing accessibility name.
- **Notes** is optional. Do not pad the report to look thorough.

## 2. Categories, in ranking order

### Architecture contracts (always Must fix, ranked first)

These are the architecture and trust-zone contracts: who may do what in main,
core, preload and renderer. A breach of any of them makes
a broken architecture contract (ranked above everything) — a Must fix even
when the app works. Check:

- `domain`/`application` imports `electron`, `node:*`, the DOM, React or the
  SDK, or a preload/host object. They talk through ports (`Result<T, E>` on
  the boundary).
- A renderer module imports the SDK, `electron`, `node:*`, or storage, or
  reaches `window` beyond the typed bridge; a renderer makes policy decisions
  or holds a token.
- The **main process** runs business logic, SDK calls, DB access, parsing,
  crypto loops or long polling instead of forwarding to core — main is the
  thin trust anchor, not the brain.
- `process.platform` branching outside `platform/` and build files.
- A tsconfig target imports types from another target (renderer sees Node
  types, main sees DOM types); a CMake-equivalent config — tsconfig, vite
  config, dependency-cruiser rule — links a layer it is not allowed to link.
- A permission or authorization decision made client-side and presented as a
  security control: `can(...)` shapes UI only, the backend decides.

Name the violated rule and quote it; the fix is to move the logic to the
process or layer that owns it, not to add an exception.

### IPC and preload

The brokered RPC is the only renderer surface. Check `PLAYBOOK_DESKTOP_ELECTRON`
§5, §5.3, §5.4:

- A channel outside the allowlisted `rpc` map, or a payload without a zod
  schema validated in main (the gate) as well as core (the final guard);
  request schemas missing `.strict()`; no size limit.
- **Sender verification missing or weak**: the handler must check
  `event.senderFrame` origin against the `app://` origin, require the top
  frame of a window we created, and map `webContents.id` to a known window
  type. A child frame, an iframe, or a navigated page must be rejected.
- A window sending a message type its capability table does not list.
- The preload exposes `ipcRenderer`, `require`, `process`, a generic
  `invoke(channel, …)` passthrough, or objects with prototypes; anything
  beyond named functions generated from `contracts/ipc` is a Must fix.
- `ipcRenderer.sendSync` or a synchronous reply anywhere; an uncaught
  rejection across the IPC boundary; stack traces or file paths leaking into
  renderer-visible errors.
- The core's `Result` errors replaced by `throw` across the process boundary.

```text
// preload/index.ts — the entire surface; anything wider is a Must fix
contextBridge.exposeInMainWorld("hmd", {
  rpc: (type: IpcType, payload: unknown) => ipcRenderer.invoke("rpc", makeEnvelope(type, payload)),
  platform: { info: () => ipcRenderer.invoke("rpc", makeEnvelope("session.get", {})) },
});
```

### Navigation and content loading

Check §7, §12.1, §12.2:

- A `BrowserWindow`/`WebContentsView` without `will-navigate` locked to
  `app://`, or `setWindowOpenHandler` not denying new windows, or external
  links opened via `shell.openExternal` without a scheme/host allowlist.
- App content served from `file://` or a remote URL instead of the privileged
  `app://` scheme handled by `protocol.handle`; any remote/third-party content
  loaded in a privileged window (or `<webview>`, or
  `webContents.executeJavaScript` with dynamic strings).
- `webPreferences` drifting from the mandatory defaults (§12.2):
  `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
  (including `InWorker`), `webSecurity: true`, no `experimentalFeatures`,
  `devTools` off in packaged builds except by policy.
- The renderer CSP (set by the `app://` handler) missing or with an open
  `connect-src` — a renderer with network is a larger attack surface and the
  token exposure vector of §12.1.
- A permission handler (`setPermissionRequestHandler`/
  `setPermissionCheckHandler`) missing or allow-by-default instead of
  deny-by-default.
- A deep link or dropped file parsed outside the strict parser (route
  allowlist, ID validation, size limits, no state change without
  confirmation); `open-url`/`second-instance` handled but trusted.

### Secrets and auth

Check §8, §12.4:

- A token, refresh token, DB key or credential in the renderer, `localStorage`,
  a plain file, a log line, a crash dump, argv or the binary. Access tokens
  live only in core memory; refresh tokens are `safeStorage` blobs in the user
  data dir.
- `safeStorage.isEncryptionAvailable()` unchecked, or the Linux
  `getSelectedStorageBackend()` result not checked — shipping the
  `basic_text` backend (plaintext-equivalent) without an explicit policy
  allowance is a Must fix.
- A tenant/provider key or the update-manifest signing key stored on the
  client.
- Login done in an in-app `BrowserWindow` for a third-party IdP instead of
  OIDC Authorization Code + PKCE in the system browser (§8); single-use
  `state` or the loopback port validation missing.
- Update or code-signing keys in CI env vars or on developer machines.

### Storage and realtime

Check §10, §9:

- An authoritatively trusted source outside the backend: the local SQLite must
  be a projection cache with reset-and-resync on corruption, not the truth.
- A migration without a fixture from every released schema; no backup/integrity
  check around it; migrations not forward-only.
- Writes that ignore the outbox (no `Idempotency-Key`, no retry/backoff, no
  per-entity ordering); data left behind on sign-out/tenant switch (missing
  per-tenant purge or `tenant_id`-first indexes).
- Paths built by hand instead of `app.getPath('userData'|'logs'|'temp')`, or a
  temp file with loose permissions.
- Realtime running in the renderer or in main instead of core; a connection
  trusted across `powerMonitor` suspend/resume (drop half-open sockets);
  missing resume token/`Last-Event-ID`, no dedupe by event ID, no
  `resyncRequired` after gaps; a fan-out that repaints the renderer per event
  instead of coalescing to ≤ 30–60 Hz.
- The SSE parser accepting unbounded lines/events or mis-decoding (UTF-8,
  CR/LF/CRLF, comments as heartbeats, `retry:`) — fuzz this surface.

### Packaging and updates

Check §12.3, §15, §12.5:

- A fuse flipped wrong or left default: `RunAsNode`,
  `EnableNodeOptionsEnvironmentVariable`, `EnableNodeCliInspectArguments`,
  `GrantFileProtocolExtraPrivileges` must be **off**;
  `EnableCookieEncryption`, `EnableEmbeddedAsarIntegrityValidation`,
  `OnlyLoadAppFromAsar` must be **on**. CI must read the fuses from the
  packaged output (`@electron/fuses read`) before and after signing and fail
  on drift — a fused claim without that read is itself a finding.
- A claim of ASAR integrity on Linux (not supported there — don't document it).
- A step removed from the §15.2 pipeline order (build → package → fuses →
  verify → sign → notarize → verify → SBOM → publish); an unsigned update
  artifact, an unsigned manifest, or a manifest accepted on a non-monotonic
  version (downgrade/takeover).
- A native module not rebuilt per Electron ABI, not signed, or packed inside
  the ASAR when it must be unpacked.
- `--no-sandbox` shipped, documented, or recommended as a Linux fix (§12.5);
  an unpackaged/unfused binary distributed.
- `process.env` secrets, unpinned or caret-ranged Electron dependencies
  (§2.6: pin an exact supported major; latest or latest-minus-one), or an
  install script enabled without ADR.

### Performance

Check §2:

- A blocking call in main or in a `ready` path: synchronous IPC, large file
  read, heavy parse/crypto, a long `await` chain before the first window is
  even created. It belongs in core, a worker, or after first paint.
- A window created eagerly instead of on demand, kept hidden when heavy, or
  a `BrowserWindow` reference held after `closed`.
- A renderer long task > 50 ms in a primary flow; a list without
  virtualization; per-frame allocation; giant unscaled images; heavy CSS
  filters on large areas; `backgroundThrottling` disabled.
- Idle work with no need: a timer/polling loop, an animation, a realtime
  socket kept alive with the feature off by policy. The app must be correct
  with polling or none.
- A budget raised without evidence, or a change with no measurement against
  §2.3 on the Floor profile; caches unbounded (no LRU with size accounting).

### Accessibility and i18n

Check §11, §16.1:

- An interactive element reachable only by mouse; no accessible name/role;
  focus lost on route change or after a dialog closes; keyboard traps.
- Hard-coded strings instead of message keys; sentences built by
  concatenation; no RTL/long-translation check on a layout change.
- Color as the only signal of status; a focus ring removed with no
  replacement; hard-coded pixel sizes around text that break with 125–200%
  scaling.
- The GPU-off (software rendering) mode not usable end to end — the UI must
  be fully functional there (§2.5), and it shares its paint path with what a
  screen reader tolerates.
- `prefers-reduced-motion` and OS high-contrast ignored in a new screen.

### Tests

Check §16:

- A change to main/preload/IPC with no test at the right level: IPC message
  types need contract tests plus a sender-spoofing test; the PEP needs
  schema/origin/frame/window-capability cases; the bridge surface needs a
  test that fails if a non-declared API appears.
- ViewModel states tested only on the happy path; the shared status set
  (`loading | ready | empty | forbidden | not-found | offline | error |
  policy-blocked`) uncovered.
- E2E added against the dev build instead of the packaged app (it hides
  fuse/ASAR/CSP/protocol problems); a suite that only ever runs GPU-on.
- Storage changes without migration fixtures; realtime without the
  conformance suite (reconnect, resume, duplicates, out-of-order, heartbeat
  loss); policy keys without per-OS reader tests and locked-UI tests.
- A test asserting implementation instead of behavior; a flaky test
  quarantined with no owner/expiry.

## 3. Waived gates

If the diff deletes or weakens a lint, a test, a type, an accessibility check,
a fuse, a budget or a schema, flag the deletion itself, loudly — even when the
new code looks fine. Look for:

- A new `// eslint-disable` or `@ts-expect-error` **without a reason**; a
  blanket file-level disable; a rule removed from `lints/eslint.config.mjs`
  or a layer wall (domain/renderer/SDK import restrictions) widened.
- A fuse flipped off to make a build pass; a `.strict()` dropped from a zod
  schema "temporarily"; a capability-table entry granted broadly to avoid
  writing a new window type.
- A skipped test without an owner and expiry; a sender-spoofing or migration
  fixture deleted; a performance budget raised without a Floor run.
- A validation, encoding or boundary check loosened to make a path compile,
  or `unknown` widened to `any` at a trust boundary.

State the deletion, the reason it claims, and what it would take to keep the
gate. "Temporarily" is not a reason; an expiring waiver with an owner is.

## 4. How to review

1. **Read the change twice.** First for intent, then for the diff.
2. **Run the gates if you can:** typecheck across all target tsconfigs,
   `eslint`, `depcruise --config dependency-cruiser.config.cjs`, `vitest`,
   `tsc --noEmit` on the packaged-config claims you can verify statically, and
   the repo's `lints/` config.
3. **Check the trust zones and the IPC surface first.** They are the expensive
   findings; a renderer that must not trust a channel message is reviewed
   before any style comment.
4. **Cite evidence.** File and line for every Must fix; the playbook section
   or a quoted contract for every finding.
5. **Propose the smallest fix.** "Rewrite the main process" is not a fix;
   "check `event.senderFrame.isMainFrame` before the schema lookup and reject
   typed" is. When logic sits in the wrong layer, name the owning layer and
   the one-move diff.
6. **Stop when the change is safe.** An empty Should-fix section is a valid
   review.

A pure fix must compile free of the stack. The shape below is the whole
sender/envelope gate as a reviewable unit:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

type Envelope = { v: number; id: string; type: string; payload: unknown };
type SenderFrame = { origin: string; isMainFrame: boolean };

// The main-side gate: reject bad envelopes and non-top `app://` frames.
function authorize(sender: SenderFrame, env: Envelope): Result<Envelope, string> {
  if (env.v !== 1) return { ok: false, error: "unknown envelope version" };
  if (sender.origin !== "app://self") return { ok: false, error: "bad sender origin" };
  if (!sender.isMainFrame) return { ok: false, error: "child frames cannot call rpc" };
  return { ok: true, value: env };
}
```

## 5. Worked example

`examples/review-insecure-ipc.md` is a full review of a small window change
that exposes a generic message channel: the findings in ranking order, the
trust-zone and bridge violations first, the missing sender verification, the
hardening drift, then the storage and test gaps, ending with the fixed
module.

## 6. Cross-skill contract

- `electron-best-practices` defines the rules this review cites. When a
  finding and the skill disagree, the skill is the source.
- `electron-port` produces the change; this review checks it before release,
  including the parity checklist.
- The `lints/` config is the machine-checkable subset. A finding the config
  can catch should become a rule, not a repeated comment.
