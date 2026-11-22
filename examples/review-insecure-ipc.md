# A worked review: the session window

The subject is a small Electron window that shows a signed-in session and
lets the page read an exported file. It works on the happy path, and it has
five Must-fix findings that a review must rank in a useful order. The fixed
version follows the contract in `electron-best-practices`; the report shape
is the one in `electron-review`.

## The module under review

Two files. The preload:

```text
// preload.ts
contextBridge.exposeInMainWorld("api", {
  invoke: (channel: string, payload: unknown) => ipcRenderer.invoke(channel, payload),
});
ipcRenderer.on("session", (_event, payload) => {
  window.api.token = payload.token as string;
});
```

The main process:

```text
// main.ts
const win = new BrowserWindow({
  webPreferences: {
    preload: join(__dirname, "preload.ts"),
    nodeIntegration: true,
    contextIsolation: false,
  },
  show: false,
});
win.loadURL(`file://${__dirname}/renderer/index.html`);
ipcMain.on("fs:read", (event, target: string) => {
  event.returnValue = readFileSync(target, "utf8");
});
ipcMain.on("session", (event) => {
  event.returnValue = { token: getToken() };
});
```

## The report

### Verdict

The window works, and the page can read any file on disk through the
`fs:read` channel. Not safe to ship. The trust-zone break is ranked first
because it is the one every other window in the app copies.

### Must fix

1. `main.ts:5-6` — `nodeIntegration: true` with `contextIsolation: false`.
   The renderer runs with full Node: every dependency's script tag, every
   XSS, every compromised CDN asset is now arbitrary process code. Rule:
   *the renderer is untrusted content; it runs no Node and holds no
   `ipcRenderer` — `nodeIntegration: false`, `contextIsolation: true`,
   `sandbox: true`*. Fix: isolate the window and move everything the page
   needs behind the preload bridge.
2. `preload.ts:2-3` — the bridge exposes the raw `ipcRenderer` plus a generic
   `(channel, payload)` passthrough. Any page content can invoke any handler
   the app registers, with any payload, and the main process never sees a
   sender it could check. Rule: *the preload exposes typed calls only; there
   is no generic channel passthrough*. Fix: `exposeInMainWorld` with one
   typed method per channel (`window.hmd.rpc(type, payload)`), and the
   channel list lives in the main process (`ALLOWED_TYPES`), not in the
   page.
3. `main.ts:10` — the page loads from `file://`. There is no origin to check
   (the sender check in finding 2's fix is meaningless against `file://`),
   the page can reach other files on the scheme, and mixed content rules
   collapse. Rule: *pages load from `app://` (or a bundled asar page served
   through a custom privileged scheme), never from `file://`*. Fix:
   `protocol.handle("app", ...)` behind a standard, secure scheme, then
   `win.loadURL("app://index.html")`.
4. `main.ts:14-15` with `preload.ts:5-6` — the session token is handed to and
   stored in the renderer. Page JavaScript can read it; one XSS exfiltrates
   it. Rule: *the page never receives a token; secrets stay in the main or
   core process and are spent inside the authorized envelope*. Fix: the
   token never crosses the bridge; the core attaches it when a use case
   calls the API, and the renderer only ever sees the derived session state
   (signed-in user, permissions), never the credential.
5. `main.ts:11-12` — `fs:read` opens any path the renderer names, and answers
   synchronously through `event.returnValue`. Rule: *the renderer never
   names paths; the domain/application layers are platform-free and file
   work happens behind a typed channel in main or core*. Fix: delete the
   `fs:read` channel; a use case behind the typed RPC resolves app-managed
   content by id, and the export is written by the main process to a path it
   chose.

### Should fix

- `main.ts:11-15` — both handlers answer through `event.returnValue`, the
  sync path. Each call blocks a renderer on main. Rule: *IPC is async; the
  request/response envelope carries its correlation id*. Fix: reply with the
  `Result` envelope over the async channel.
- The window sets neither the sandbox flag nor the fuses: as written,
  `RunAsNode` stays on, so any embedded `ELECTRON_RUN_AS_NODE` path re-runs
  the app as plain Node. Fix: `sandbox: true`, and the kit's Forge fuses
  table (`RunAsNode` false, `NODE_OPTIONS` false, ASAR integrity on) at
  packaging.

### Notes

- `preload: join(__dirname, "preload.ts")` points at a `.ts` source. It may
  work in dev with a loader, but the packaged app must ship compiled
  `preload.js`; make the build emit it and point the window there.
- The findings are not independent: fixing the trust zones without removing
  the token handoff still leaves the token one XSS away, and fixing the
  channel without the origin check still serves it from `file://`. Re-verify
  the pair together.

### Waived gates

None. The sync IPC and the missing fuses would both be waived only with a
written reason and an expiry; nothing here is one.

The categories, ranking and waiver wording are in
[`skills/electron-review/SKILL.md`](../skills/electron-review/SKILL.md); the
architectural fixes are in
[`skills/electron-best-practices/SKILL.md`](../skills/electron-best-practices/SKILL.md),
and the legacy mapping (`nodeIntegration`, generic IPC, `file://`) is in
[`skills/electron-port/SKILL.md`](../skills/electron-port/SKILL.md).
