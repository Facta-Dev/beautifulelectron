# Electron security digest

The hardening surface of an Electron app: process model defaults, window
configuration, protocol/CSP, fuses and ASAR integrity, secrets and the Linux
sandbox, and the supply-chain posture. Electron's own security docs plus the
playbook's threat model are the source; this is the review checklist.

Sources: `PLAYBOOK_DESKTOP_ELECTRON.md` §12, Appendices A, D, E, I;
`PLAYBOOK_SECURITY.md`;
https://www.electronjs.org/docs/latest/tutorial/security;
https://www.electronjs.org/docs/latest/tutorial/fuses;
https://www.electronjs.org/docs/latest/tutorial/asar-integrity.

## 1. Threat model (condensed)

| Threat | Controls |
|---|---|
| XSS / compromised renderer | Sandbox, context isolation, no Node, CSP `connect-src 'none'`, narrow bridge; main/core re-authorize everything |
| IPC abuse | Allowlisted channels, sender verification, per-window capabilities, schemas, size limits, no generic invoke |
| Unsafe navigation / hostile embed | `will-navigate` lock, `setWindowOpenHandler` deny, no `<webview>`; embedded content only in a separate partition without preload |
| Local tampering (edit `app.asar`, flip flags) | Fuses (RunAsNode/NODE_OPTIONS/inspect off), ASAR integrity + `OnlyLoadAppFromAsar`, code signing, signed updates |
| Token/secret theft | `safeStorage`, tokens only in core memory, no secrets in logs/dumps, refuse `basic_text` |
| Supply chain | Lockfile, frozen installs, `--ignore-scripts`, release-age cooldown, SBOM incl. Chromium/Node/Electron, pinned CI actions |
| Chromium/Node/Electron CVEs | Upgrade cadence and SLA, advisory monitoring, canary → stable |
| Update hijack/downgrade | Signed manifest, HTTPS, monotonic versions, rollback protection |
| Remote debugging | Inspect fuses off; DevTools off in production by policy; no remote-debug port |
| Malicious deep links / files | Strict parser, allowlist, no actions without confirmation |

## 2. Renderer hardening defaults (mandatory)

```text
webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false,
  nodeIntegrationInWorker: false, webviewTag: false, webSecurity: true,
  allowRunningInsecureContent: false, experimentalFeatures: false,
  safeDialogs: true, spellcheck: false, devTools: !app.isPackaged }
```

- Never disable context isolation "to fix a bug": it also removes process
  sandboxing for that renderer.
- `setPermissionRequestHandler` and `setPermissionCheckHandler` **deny by
  default**; allow only what a window kind needs.
- Never relax certificate verification; no `--ignore-certificate-errors`;
  enterprise CAs come from the OS store via Chromium.
- Disabling DevTools is not a security control — it is hygiene, and policy
  owns it in production.

## 3. Content Security Policy

Set by the `app://` protocol handler, not by a `<meta>` tag:

```text
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://<cdn>;
connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'
```

- `connect-src 'none'` is the star: the renderer makes no network requests.
- No `unsafe-eval`, no `unsafe-inline`, no `eval`, no `new Function`, no
  remote `<script>`; consider Trusted Types for the renderer.
- Hostile server content (names, descriptions) is escaped on render; never
  `dangerouslySetInnerHTML`.

## 4. Navigation lockdown

```text
win.webContents.setWindowOpenHandler(({ url }) => { openExternalIfAllowed(url); return { action: 'deny' }; });
win.webContents.on('will-navigate', (e, url) => { if (new URL(url).origin !== APP_ORIGIN) e.preventDefault(); });
win.webContents.on('will-attach-webview', (e) => e.preventDefault());
```

- `openExternalIfAllowed` applies a scheme/host allowlist before
  `shell.openExternal`.
- Every window load uses `app://`; `file://` in a privileged window is a
  Must fix.

## 5. Fuses and ASAR integrity

| Fuse | Value | Why |
|---|---|---|
| `RunAsNode` | off | Otherwise `ELECTRON_RUN_AS_NODE` turns the app into a plain Node process |
| `EnableNodeOptionsEnvironmentVariable` | off | Otherwise `NODE_OPTIONS` injects startup code |
| `EnableNodeCliInspectArguments` | off | Otherwise inspect flags allow debugging from the environment |
| `EnableCookieEncryption` | on | Cookies encrypted at rest |
| `EnableEmbeddedAsarIntegrityValidation` | on | macOS and Windows only; don't claim it on Linux |
| `OnlyLoadAppFromAsar` | on | App code only from the integrity-checked archive |
| `GrantFileProtocolExtraPrivileges` | off | The `file://` protocol gets no extra reach |

- Flipped in the packaging step, **before signing** (Forge `FusesPlugin`).
- CI reads them from the packaged output (`@electron/fuses read`) — **before
  and after signing** — and fails on any drift. ASAR integrity detects
  tampering; it does not obfuscate code.

## 6. Secrets and `safeStorage`

- One `SecretStorePort` implementation wraps `safeStorage`; only opaque
  blobs are persisted in the user data dir, never plaintext files, never in
  a renderer.
- Check `isEncryptionAvailable()`; on Linux inspect
  `getSelectedStorageBackend()` and reject `basic_text` (plaintext-equivalent)
  unless policy explicitly allows — the caller then falls back to "sign in
  each session". On macOS encryption depends on the app being signed.
- Access token: core memory only. Refresh token: `safeStorage`-encrypted.
  Tenant/provider keys: never on the desktop. Nothing secret in argv, env or
  logs.

```text
export class SafeStorageSecrets implements SecretStorePort {
  private assertUsable() {
    if (!safeStorage.isEncryptionAvailable()) throw new SecretStoreUnavailable('no-os-keystore');
    if (process.platform === 'linux' &&
        safeStorage.getSelectedStorageBackend() === 'basic_text' &&
        !this.policy.allowBasicTextSecrets) throw new SecretStoreUnavailable('weak-backend');
  }
}
```

- Update-manifest and code-signing keys: HSM/cloud signing, separate trust
  roots, an isolated signing CI job with approval; Windows code-signing keys
  are hardware-protected (cloud signing such as Azure Artifact Signing or an
  HSM service), Apple keys in a CI secret store.

## 7. IPC and bridge hardening

- The preload exposes named functions generated from the contracts; never
  `ipcRenderer`, `require`, `process`, or generic `invoke(channel, …)`.
- Only JSON-serializable data crosses the bridge; **never bridge complex or
  host objects** (a 2026 advisory showed bridging such objects can let an
  attacker with script execution reach the isolated world).
- Every `ipcMain.handle` runs the PEP checks: sender frame origin == `app://`,
  top frame, registered `webContents.id`, window-capability entry, zod
  `strict()` parse, size limit.

## 8. Linux sandbox reality

- Chromium's sandbox relies on user namespaces or the SUID helper; recent
  distros restrict unprivileged user namespaces (AppArmor profiles on
  current Ubuntu, for example), which breaks naive AppImage/tarball installs.
- **Never ship or document `--no-sandbox`.** Ship deb/rpm with the helper
  configured (plus AppArmor where required) or Flatpak/Snap; test on current
  Ubuntu LTS, Fedora and a Wayland session (verify per release).

## 9. Supply chain

- Exact dependency versions from the lockfile; `pnpm install --frozen-lockfile`
  (or npm equivalent) in CI; `--ignore-scripts` by default; review any script
  that must run.
- Release-age cooldown before adopting brand-new dependencies; dependency
  count is a reviewed budget.
- SBOM covers npm packages **and** the bundled Chromium/Node/Electron
  versions — CVE feeds key off them; Chromium/ffmpeg license notices covered.
- Native modules: avoided by default; when unavoidable, N-API prebuilt,
  rebuilt with `@electron/rebuild` per ABI, hashed, signed, unpacked from
  ASAR only when required, with a fallback in the ADR.

## 10. Auth and update trust

- OIDC Authorization Code + PKCE in the **system browser**; the loopback
  redirect is served by core with a single-use `state` and a short timeout.
  An in-app `BrowserWindow` login for a third-party IdP is a Must fix
  (phishing surface).
- The update manifest we sign (Ed25519) is a separate trust root from the
  code-signing identity; versions must be monotonic; rollback protection is
  part of the manifest, not an afterthought.
