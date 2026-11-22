# Electron platform digest

The platform facts an Electron app depends on, with the design consequence
spelled out. Electron's documentation and the verified figures in the playbook
are the source; this is the review checklist.

Sources: `PLAYBOOK_DESKTOP_ELECTRON.md` §2.6, §3.1, §11, §15.1, Appendices A–C,
L; https://www.electronjs.org/docs/latest/process-model.

## 1. Runtime facts

- **Electron 45** is the reference major: **Chromium 156, Node.js 24**,
  released 2026-10-20 (verified 2026-11-22). A new major ships **every 8
  weeks**, and the **latest three majors** are supported; each major reaches
  end of life about six months after release, so a pinned major will expire.
- **Electron 44+ requires macOS 13 or later.**
- Defaults hard-won by earlier majors: `nodeIntegration: false` since
  Electron 5, `contextIsolation: true` since 12, `sandbox: true` since 20.
- Electron 44 added `net.WebSocket` (WHATWG-compatible, main process, Chromium
  network stack — proxy/PAC and enterprise certs included), reduced idle
  main-process wakeups, and starts the main process from an embedded Node
  startup snapshot on all platforms. `net.WebSocket` availability per major is
  a (verify) item; on older majors fall back to `ws`.
- Consequence: pin an exact supported major, never a caret range; stay on the
  latest or latest-minus-one; upgrade PR within 2 weeks of a new major;
  security patch releases adopted on an SLA through a canary → stable rollout.

## 2. Process model

| Process | Runtime | Trust | Lifetime |
|---|---|---|---|
| Main | Node (privileged) | Trusted; thin anchor | App lifetime; never blocks on slow work |
| Core | Utility process (`utilityProcess.fork`), Node, no DOM | Trusted | Supervised; restarted with backoff after a crash |
| Preload | Sandboxed, isolated world | Semi-trusted bridge | Lives and dies with its renderer |
| Renderer | Chromium, sandboxed | **Untrusted** | One per window; destroy, don't hide |
| Utility/worker | Node or renderer Worker | Trusted, disposable | One heavy task, then exit |

- The core listens on `process.parentPort`; main wires it with
  `utilityProcess.fork` and a **scrubbed environment**, and refuses to run if
  the core entrypoint is not inside the packaged app.
- Heavy CPU work in a renderer belongs in Web Workers; system-bound work
  belongs in core.
- `process.platform` may be branched only in `platform/` and build files.

## 3. App lifecycle and OS events

- `open-url` (macOS) and the `second-instance` event (Windows/Linux, with
  `app.requestSingleInstanceLock()`) deliver deep links; parse them as
  untrusted input in main.
- `powerMonitor` (`suspend`, `resume`, `lock-screen`, `unlock-screen`) plus
  `net.online` drive realtime reconnects; drop half-open sockets rather than
  trusting them.
- `render-process-gone`, `child-process-gone` and `unresponsive` are the
  recovery signals: reload the window to its last route, restart core with
  backoff, and count crashes — repeated GPU crashes escalate the next launch
  into software rendering.
- `ready-to-show` on the first window is when deferred work (updater check,
  telemetry flush, realtime connect) may start.

## 4. Windows and WebContents essentials

- Set webPreferences once in a secure window factory
  (see `references/electron-security.md`); register every `webContents.id`
  in a registry with its window kind — the IPC capability lookup depends on
  it.
- `will-navigate`, `setWindowOpenHandler` and `will-attach-webview` are the
  three navigation locks; `shell.openExternal` is the only way out, with a
  scheme/host allowlist.
- Background throttling stays on; pause realtime fan-out to hidden windows
  and reconcile on show.

### The `app://` protocol

```text
protocol.registerSchemesAsPrivileged(
  [{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]
);                                        // before app.ready
protocol.handle('app', (req) => { /* path containment, then serve from ASAR */ });
```

- Registered **before** `app.ready`; served from the packaged ASAR; strict
  path containment and a `Content-Security-Policy` response header. Never
  `file://`.

## 5. Linux display servers and desktop

- **X11 and Wayland** both matter: launch Chromium with
  `--ozone-platform-hint=auto` and test both. Tray (AppIndicator) is not
  guaranteed on Wayland desktops; global shortcuts, window positioning and
  screen capture differ (verify per Electron major) — every capability gets a
  graceful fallback.
- The Chromium sandbox depends on user namespaces or the SUID sandbox helper;
  some distros restrict unprivileged user namespaces. Ship deb/rpm with the
  helper configured (plus an AppArmor profile where required) or Flatpak/Snap;
  never document `--no-sandbox`.
- Fractional scaling differs across desktops; test GNOME and KDE at 125%/150%.

## 6. Per-OS capability matrix (condensed from the playbook)

| Capability | Windows | macOS | Linux |
|---|---|---|---|
| Secret store | DPAPI-backed `safeStorage` | Keychain `safeStorage` (signed app) | libsecret/kwallet; reject `basic_text` |
| Notifications | Toast; set `app.setAppUserModelId` | Notification Center permission | D-Bus |
| Autostart | `app.setLoginItemSettings` | Login item | XDG autostart `.desktop` |
| Protocol/file associations | Registry (installer-assisted) | `Info.plist` via packager | `.desktop` MIME handler |
| Window chrome | `titleBarOverlay` (Mica/snap layouts) | `titleBarStyle: hiddenInset` | GTK/CSD differences |
| Updates | Squirrel/MSI/NSIS | Squirrel.Mac (zip), DMG, pkg (MDM) | deb/rpm repos, Flatpak, Snap |
| Accessibility | UIA via Chromium | NSAccessibility | AT-SPI |

## 7. Packaging matrix and support policy

| OS | Artifacts | Notes |
|---|---|---|
| Windows | Squirrel (consumer), **MSI** (managed, per-machine), NSIS, portable zip; MSIX experimental in Forge (verify) | x64 + arm64; sign every `.exe`/`.dll`/`.node` and the installer |
| macOS | `.app` in **zip** (required by Squirrel.Mac) and DMG; pkg for MDM | Developer ID, hardened runtime, notarize + staple; per-arch builds |
| Linux | `.deb`, `.rpm` (repos), Flatpak, Snap, AppImage | x64 + arm64; sandbox helper/AppArmor; desktop file + AppStream metadata |

- OS support = intersection of the Electron major's supported OS list and
  vendor-supported OS versions; re-derive at every upgrade — never hard-code.
  Publish `docs/support-matrix.md` per release (template in playbook
  Appendix L).
- Architectures: x64 and arm64 on all three OSes; no 32-bit. Avoid bundling
  both architectures into one universal macOS binary unless distribution
  requires it.

## 8. Electron upgrade routine (condensed)

- Run the full matrix on every upgrade: 3 OS × x64/arm64 × X11/Wayland ×
  GPU/software; changelog review focused on preload/sandbox/fuses/APIs.
- Rebuild, never shim, native modules on ABI breaks; upgrade Forge, signing
  libraries and tooling in lockstep.
- Keep a nightly **next-major canary** job so upgrades are a routine, not a
  fire drill.
