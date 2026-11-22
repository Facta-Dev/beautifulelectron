# The minimal example

A tiny Electron 45 app that holds the contract end to end: TypeScript with
`strict`, one typed RPC channel, a sandboxed and isolated window, a page
loaded from `app://`, and a pure ViewModel tested with `node:test`.

## Layout

```text
src/viewmodel.ts        pure: the port, the ViewModel, the in-memory adapter
src/viewmodel.test.ts   node:test on the pure ViewModel (no Electron, no DOM)
src/main.ts             window, app:// page, the RPC handler that trusts the
                        sender frame, not the payload
src/preload.ts          contextBridge: one typed call per channel, no
                        ipcRenderer, no channel-string passthrough
```

## Run the gates

```bash
# from the repository root
bash scripts/check-build.sh
```

`check-build.sh` sets `ELECTRON_SKIP_BINARY_DOWNLOAD=1` and installs with
`npm install --ignore-scripts`, so the Electron binary is never fetched; then
it runs `npm test`, which compiles with `tsc` and runs the pure ViewModel
suite:

```bash
cd examples/minimal
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install --ignore-scripts
npm test   # tsc, then node --test dist/
```

To run the app itself you need the real Electron binary:

```bash
cd examples/minimal
npm install            # downloads the binary this time
npm start              # electron .
```

## What it proves

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` are
  defaults worth writing down. The renderer runs no Node and holds no
  `ipcRenderer`.
- The bridge is typed: `window.hmd.list()` and `window.hmd.add(title)` only.
  The list of allowed types lives in `main.ts` (`ALLOWED_TYPES`), the payload
  is checked before it reaches the ViewModel.
- The page never loads from `file://`. `app://index.html` is a standard,
  secure scheme handled by `protocol.handle`, so the sender check is an
  origin check, not a string compare against a file path.
- The ViewModel is framework-free: `src/viewmodel.ts` imports nothing from
  `electron` or `node:*`, which is why the tests run with
  `ELECTRON_SKIP_BINARY_DOWNLOAD=1` and still mean something.

## What it does not do

This is a floor, not a ceiling: no policy resolver, no storage adapter beyond
the in-memory port, no core fork, no auto-update, no fuses wiring. Those are
the kit's job (`ai-coding-playbook/desktop-electron`). The worked review in
[`../review-insecure-ipc.md`](../review-insecure-ipc.md) shows the same app
with the contract broken and the findings ranked.
