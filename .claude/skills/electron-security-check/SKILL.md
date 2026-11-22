---
name: electron-security-check
description: "Runs the Electron hardening checklist over the <app> desktop app — the webPreferences defaults, the fuse table read from the packaged output, the app:// handler and CSP, the safeStorage backend, navigation lockdown and the Linux sandbox posture — and reports every gap that violates the contract."
division: security
---

# <app> Electron Security Check

A reusable audit workflow for the `<app>` Electron desktop app's runtime
hardening. An agent invokes this skill before a release, after an Electron
upgrade, or whenever a reviewer asks whether the app still meets its own
security contract; the skill supplies the checklist, the agent supplies the
running evidence. Every row is checked against a file or a command run in
this session, never against a recollection.

## When to Activate

- Before a release: the packaged artifact must still meet the hardening
  contract.
- After an Electron upgrade: defaults, fuse behaviour and sandbox support can
  move between majors.
- A reviewer asks whether a window, a protocol handler or a fuse is still
  hard.
- A new window or a new content surface (WebContentsView, embedded help) is
  added.

Do not activate for a code-only review with no runtime surface (use
`review`); this skill reads configuration and the packaged output, not the
diff.

## Core Principles

- The renderer is untrusted until proven otherwise. Every `BrowserWindow`
  gets the hardened set: `contextIsolation: true`, `sandbox: true`,
  `nodeIntegration: false`, `webviewTag: false`, `webSecurity: true`,
  and DevTools off in production. A window that relaxes any of these needs a
  written reason; none exists in this contract.
- The fuses are read, not assumed. `@electron/fuses` reads the packaged
  binary: `RunAsNode` off, `EnableNodeOptionsEnvironmentVariable` off,
  `EnableNodeCliInspectArguments` off, `EnableCookieEncryption` on,
  `EnableEmbeddedAsarIntegrityValidation` on (macOS and Windows; not claimed
  on Linux), `OnlyLoadAppFromAsar` on, `GrantFileProtocolExtraPrivileges`
  off. Drift from the expected table is a BLOCK.
- Content is served, not loaded. The privileged scheme `app://` is handled by
  `protocol.handle` from the packaged ASAR with a strict CSP response header
  (`connect-src 'none'` for renderers); `file://` and remote URLs are never
  loaded into a privileged window.
- Navigation is locked. `will-navigate` allows only the `app://` origin,
  `setWindowOpenHandler` denies, external links go through
  `shell.openExternal` behind a scheme and host allowlist.
- Secrets stay out of the renderer. Refresh tokens are encrypted with
  `safeStorage` in the core; on Linux the `basic_text` backend is refused
  unless policy explicitly allows it.
- The Linux sandbox is never disabled. `--no-sandbox` is not a fix and is
  never shipped or documented; the packaged artifact must carry the sandbox
  helper correctly.

## Rules

- Anti-hallucination: every check cites the file read or the command run in
  this session; a check that could not run is reported as not run, never
  assumed to pass.
- Every claim needs a source: cite the local configuration file or the
  packaged output, and the official Electron documentation for the platform
  behaviour.
- Do not emit the final output as a fenced code block when raw output is
  expected.
- A missing `contextIsolation`, a disabled `sandbox` or a relaxed
  `webSecurity` is a BLOCK, never a WARN.
- Fuse drift is a BLOCK; the finding names the fuse, the expected value and
  the value read.
- A renderer CSP that permits `connect-src` to anything but `'none'` is a
  BLOCK; a wide `img-src` or `script-src` is a finding with a named fix.
- A permission request handler that does not deny by default is a BLOCK.
- ASAR integrity is reported per platform: claimed on macOS and Windows,
  reported as not-available on Linux, never claimed everywhere.
- Secrets found in renderer-reachable state, IPC payloads or logs are a
  BLOCK.

## Research References

Provenance table — every claim in a finding needs a row.

| claim | source | year | link |
| --- | --- | --- | --- |
| Electron's security checklist: sandbox, context isolation, no Node in the renderer, CSP, navigation lockdown, permission handlers | Electron security tutorial | 2026 | https://www.electronjs.org/docs/latest/tutorial/security |
| Fuses are compile-time flags flipped before signing and verified after | Electron Fuses documentation | 2026 | https://www.electronjs.org/docs/latest/tutorial/fuses |
| `safeStorage` encrypts secrets with OS keychain support; `getSelectedStorageBackend()` reports the Linux backend | Electron safeStorage API reference | 2026 | https://www.electronjs.org/docs/latest/api/safe-storage |
| The mandatory `webPreferences` defaults and the fuse table | `PLAYBOOK_DESKTOP_ELECTRON.md` §12.2, §12.3 | 2026 | local file |
| The `app://` scheme, the CSP header and never `file://` | `PLAYBOOK_DESKTOP_ELECTRON.md` §12 | 2026 | local file |
| The Linux sandbox reality and the `--no-sandbox` ban | `PLAYBOOK_DESKTOP_ELECTRON.md` §12.5 | 2026 | local file |

## Output Format

A checklist table plus a verdict. Raw structured prose — not a fenced block:

```
### <app> electron security check

Runtime checks:
- [PASS|BLOCK|WARN|NOT RUN] window-hardening @ <file> — <evidence>
- [PASS|BLOCK|WARN|NOT RUN] fuses — `@electron/fuses` read from the
  packaged binary: <table or the reason it could not run>
- [PASS|BLOCK|WARN|NOT RUN] app-scheme-and-csp @ <file> — <evidence>
- [PASS|BLOCK|WARN|NOT RUN] navigation-lockdown @ <file>
- [PASS|BLOCK|WARN|NOT RUN] safe-storage-backend @ <file> — backend:
  <observed value>
- [PASS|BLOCK|WARN|NOT RUN] linux-sandbox — packaged artifact inspection
- [PASS|BLOCK|WARN|NOT RUN] permission-handlers @ <file>
- [PASS|BLOCK|WARN|NOT RUN] secrets-in-renderer — <what was searched>

Not reviewed (not run): <list>

Verdict: PASS | BLOCK
```

Summary line: `electron-security-check: N check(s) run, N BLOCK(s),
M not run — verdict: PASS | BLOCK`.
