---
name: new-ipc-channel
description: "Add an IPC message type to the <app> Electron desktop app — the typed envelope and the allowlist table in src/contracts/ipc.ts, the window capability entry, the preload bridge function, the main-side policy check and the contract plus capability tests — as one gated change."
division: client
---

# <app> New IPC Channel

A reusable workflow for adding one IPC message type to the `<app>` Electron
desktop app. The type is a contract, not a function call: the renderer and
the core parse the same zod schema, the allowlist table says which window
kinds may invoke it, and the main-side policy enforcement point verifies the
sender before the payload is parsed. This skill produces all of those pieces
together, plus the tests every type owes — a contract test and a
capability test — so a type never lands half-wired.

## When to Activate

- A new IPC message type is needed between a renderer and the core.
- An existing type's request or response schema changed in a way that is not
  backward compatible.
- A window kind needs access to a type it cannot reach today.
- A reviewer asks whether a proposed type is reachable by the right windows.

Do not activate for a purely local, in-process call inside one slice — that
is a function call, not a message, and it needs no IPC entry. Do not activate
for a stream that only carries progress events — that is a MessagePort
decision for the architect.

## Core Principles

- One schema, both ends. The envelope `{ v, id, type, correlationId, payload }`
  and the per-type request/response schemas live once in
  `src/contracts/ipc.ts`; the loader in `src/preload/`, the policy check in
  `src/main/ipc-policy.ts` and the core dispatcher in `src/core/` all parse
  the same schemas.
- The allowlist table is the capability surface. Each type names the window
  kinds that may invoke it — for example `['main']` or
  `['main', 'settings']`. A type with no entry is not callable.
- Validate, then parse. The sender origin (`app://`), the top-frame rule, the
  known-window check and the capability entry are checked before the payload
  is parsed; a parse-first handler is a BLOCK.
- The preload exposes functions, never `ipcRenderer`. A new type surfaces as
  the same narrow `window.hmd.rpc(type, payload)` call; no bridge changes, no
  generic `invoke(channel, ...)`, no raw channel passthrough.
- Errors are values. A failure returns `Result<T, AppError>` with a stable
  code; nothing throws across a process boundary.
- Every reply correlates. The reply carries the `correlationId` of its
  request, and every request settles — a handler that never replies stalls
  the caller.

## Rules

- Anti-hallucination: the type name, the schemas and the handler path must be
  written down in the sketch; never invent a type that no code references.
- Every claim needs a source: cite the local IPC contract for the envelope
  shape and the official Electron documentation for the IPC behaviour.
- Do not emit the final output as a fenced code block when raw output is
  expected.
- A new type ships with both tests: a contract test (the envelope round-trips
  through the preload surface and the core dispatcher) and a capability test
  (an allowed window kind is accepted, a disallowed one is rejected with the
  typed code). Missing either is a REVISE.
- All request schemas are `.strict()`, with explicit size bounds; a schema
  without them is a REVISE.
- Do not bump the envelope version for an additive type; bump it only when
  the envelope shape changes incompatibly, and say which.
- A type reachable from a window kind that does not need it is a finding —
  the narrowest window set that works is the correct one.
- No `electron` imports in the handler's core side: the use case lives behind
  a port, and `main/` owns the transport.

## Research References

Provenance table — every claim in a finding needs a row.

| claim | source | year | link |
| --- | --- | --- | --- |
| `ipcMain.handle` and `ipcRenderer.invoke` are the request/response transport between the renderer and the main process | Electron ipcMain API reference | 2026 | https://www.electronjs.org/docs/latest/api/ipc-main |
| The preload exposes a narrow, typed API through `contextBridge`; host objects and prototypes must not cross it | Electron contextBridge API reference | 2026 | https://www.electronjs.org/docs/latest/api/context-bridge |
| The sender frame's origin and top-frame status are checked in main before a message is trusted | `PLAYBOOK_DESKTOP_ELECTRON.md` §5.1 | 2026 | local file |
| The envelope, the per-type schemas and the window capability table live in one file | `src/contracts/ipc.ts` | 2026 | local file |
| The sender checks and their order | `src/main/ipc-policy.ts` | 2026 | local file |
| The error codes and the `Result` type | `src/shared-kernel/errors.ts`, `src/shared-kernel/result.ts` | 2026 | local file |

## Output Format

An IPC change sketch plus a test checklist. Plain text — not a fenced block:

```
TYPE  notes.rename

  contract:
    request schema     src/contracts/ipc.ts — the rename body, .strict()
    response schema    src/contracts/ipc.ts — the returned shape
    envelope           { v, id, type, correlationId, payload }
    capability entry   window kinds: ['main']
    envelope version   unchanged (additive)

  preload:
    no bridge change — the type rides the existing hmd.rpc(type, payload)

  main (PEP):
    src/main/ipc-policy.ts — authorizes the envelope: origin == app://,
    main frame, window known, kind in the capability table; reject
    before parsing; unknown type returns a typed error

  core:
    src/core/rpc-server.ts — the dispatcher; a schema-validated use case
    call; the reply carries the request correlationId

  tests:
    tests/contracts/ipc.test.ts
      - the envelope round-trips through the dispatcher
      - an unknown type and an unknown version return typed errors
    tests/main/ipc-policy.test.ts
      - a main-window sender is accepted for notes.rename
      - a sender from a child frame, a foreign origin or a window kind that
        is not in the capability table is rejected

CHECKLIST
  [ ] request and response schemas added next to the existing ones, strict
      and bounded
  [ ] capability entry added with the window kinds the feature needs
  [ ] sender validated before the payload is parsed
  [ ] handler returns a Result; nothing throws across a process boundary
  [ ] contract test + capability test written
  [ ] pnpm run typecheck + pnpm run test green
```

Summary line: `new-ipc-channel: N type(s) added, M capability entries —
verdict: APPROVE | REVISE`.

