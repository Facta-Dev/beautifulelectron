# Architecture: the trust zones

One diagram, kept as ASCII so it diffs, greps and renders anywhere. It shows
the three trusts — the main process, the core utility process, and the
renderer — and the only two routes between them.

```text
+---------------------------------------------------------------------+
|  MAIN PROCESS  (trusted: full Node, filesystem, OS)                 |
|                                                                     |
|  +---------------------------+      +--------------------------------+
|  | main                      |      | core (utilityProcess.fork)     |
|  | windows, app:// protocol, |<-----| adapters -> application ->     |
|  | ipc-pep  ->  ipc-policy   | rpc  | domain (pure, no electron)     |
|  +------------+--------------+      +----------------^---------------+
|               |                                      |
+---------------|--------------------------------------|----------------+
                | typed envelope over ipcMain.handle   | postMessage
                | ("rpc"), sender checked first        | over parentPort
                v                                      +
+---------------------------------------------------------------------+
|  PRELOAD  (the only bridge)                                         |
|                                                                     |
|  contextBridge.exposeInMainWorld("hmd", { rpc, platform.info })     |
|  typed calls only: no ipcRenderer, no channel-string passthrough    |
+---------------------------------|-----------------------------------+
                                  | window.hmd.rpc(type, payload)
                                  v
+---------------------------------------------------------------------+
|  RENDERER  (untrusted content)                                      |
|                                                                     |
|  no nodeIntegration, no ipcRenderer, no node:*                      |
|  sandbox: true, contextIsolation: true, page from app:// not file:// |
|  views -> viewmodels (pure) -> the hmd bridge                       |
+---------------------------------------------------------------------+
```

What each zone may and may not do:

| Zone | May | May not |
|---|---|---|
| main | Window lifecycle, protocol, policy, forwarding to core | Business rules (they live in core's domain) |
| core | Adapters, SDK calls, secrets, storage, the domain | Import `electron`, touch the DOM |
| preload | Expose the typed bridge | Import anything of its own beyond `electron`'s bridge APIs |
| renderer | Render, bind viewmodels, call `window.hmd.rpc` | Import `electron`, `node:*`, `@/sdk`, hold `ipcRenderer`, receive a token |

The invariants the diagram encodes — a request is authenticated by sender
origin, authorized by the window and channel table, parsed by a schema, and
the page never receives a token — are pinned in
[`../../README.md`](../../README.md#the-architecture-contract) and detailed
in [`skills/electron-best-practices/SKILL.md`](../../skills/electron-best-practices/SKILL.md).
