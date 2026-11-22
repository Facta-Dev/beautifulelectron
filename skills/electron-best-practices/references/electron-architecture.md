# Electron architecture digest

The layer contract across Electron's processes: hexagonal layers + vertical
slices + MVVM, where each layer runs, how ports keep Electron out of the
domain, and how the rules are enforced in CI.

Sources: `PLAYBOOK_DESKTOP_ELECTRON.md` §3–§7, §10, Appendices B–C, J;
`PLAYBOOK_FRONTEND.md` §3 (MVVM + SDK); `PLAYBOOK_MASTER.md` invariants.

## 1. The layer table (the contract)

| Layer | Contains | May depend on | Must not depend on |
|---|---|---|---|
| **domain** | Entities, value objects, rules, domain events | `shared-kernel` | `electron`, `node:*`, DOM, React, the SDK |
| **application** | Use cases, ports, policy resolver, sync/outbox | domain, `contracts`, `shared-kernel` | Electron/Node/DOM APIs, adapters |
| **adapters/in** | IPC handlers, protocol/deep-link handlers, OS-event handlers, ViewModels | application, contracts | other slices' internals, SQL/HTTP |
| **adapters/out** | SDK client, realtime, SQLite, keystore, notifications, updater, telemetry, policy sources | application ports, `platform` | views |
| **views** | React components | ViewModel hooks, `ui-kit` | the SDK, `electron`, IPC directly |
| **platform** | Per-OS code; `process.platform` lives only here and in build files | Electron/Node APIs | domain/application |
| **contracts** | DTOs, IPC schemas, error codes, event envelopes, policy schema, route table | `shared-kernel` | everything else |

The contracts are **unbreakable and non-waivable**: projects can restyle
anything; nobody opts out. Where a change needs to cross a layer,
**re-cut the layout** — move the logic to the layer that owns it. Review ranks
a broken architecture contract above every other finding.

## 2. Where each layer runs

| Concern | Process |
|---|---|
| domain, application, SDK, realtime, storage, sync | **Core** (utility process) |
| IPC enforcement, protocol, OS adapters, updater, policy reader, safeStorage | **Main** |
| Views, ViewModels | **Renderer** (ViewModels call a `CorePort`) |
| Heavy parsing/exports/hashing | Short-lived utility process/worker |

The mapping is the whole point: a layer that must not import `electron` also
never runs where `electron` is in scope.

## 3. Ports (shape, not code)

Ports are owned by the slice/application layer, speak domain language, carry
no Electron types, and return `Promise<Result<T, E>>` — errors are values,
nothing `throw`s across a process boundary. Typical set:

```text
SessionPort      current() / signIn() / signOut() / permissions()
SecretStorePort  get / set / remove           (implemented over safeStorage in main)
PolicyPort       effective() / onChange(cb)   (pure resolver in application)
RealtimePort     start / stop / setTopics     (SSE, WebSocket, polling, off)
NotifierPort     notify(n)                    (per-OS adapter)
UpdaterPort      check(ch) / apply(u) / rollback()
RepositoryPort   byId / list / update(..., IdempotencyKey)
```

The core implements outbound ports with `net.fetch` (for proxies, enterprise
certificates, PAC), SQLite, and the realtime transports; main implements the
platform ones.

## 4. MVVM and the `CorePort`

- The ViewModel is a plain class or hook returning `{ status, data, commands }`
  with the shared status set: `loading | ready | empty | forbidden |
  not-found | offline | error | policy-blocked`. No Electron or DOM imports.
- The renderer's `CorePort` is a typed RPC client over the preload bridge
  (`rpc<T extends IpcType>(type, payload)`); ViewModels depend on it so tests
  swap in a fake — no Electron, no DOM in the test.
- Views are React components; no business logic. A thin hook bridges the
  ViewModel's `subscribe`/`snapshot` to React state.
- ViewModels shared with the web/extension clients are reused, not forked;
  client parity is enforced by shared scenario fixtures.

## 5. Vertical slices mirror the backend

| Desktop slice | Backend slice | Permission prefix | Realtime topic prefix |
|---|---|---|---|
| `funnels` | `funnels` | `funnels.*` | `funnels.` |
| `projects` | `projects` | `projects.*`, `campaigns.*` | `projects.` |
| `tenants` (admin) | `tenants` | `tenant.*` | `tenants.` |
| `identity` | `identity` | session only | `session.` |

- Each slice: `domain/ application/ adapters/ viewmodels/ views/ contracts/`.
  Cross-slice access goes through `contracts/` only.
- The IPC capability table per window kind (`main`, `admin`, `settings`) is
  generated from the contracts; new channel = schema + capability entry +
  preload binding + contract and sender-spoofing tests, nothing else.

## 6. Enforcement (machine-checkable)

- **A `tsconfig` per target** — `main`, `preload`, `core`, `renderer` (+
  `test`) — with distinct `lib`/`types`: the renderer cannot import Electron
  or Node types; main/core cannot see DOM types; `tsc --noEmit` per target is
  part of every hand-off check.
- **ESLint** `no-restricted-imports`, `no-restricted-globals`
  (`process`/`require` out of renderer and domain), plus the pinned rule set
  in the drop-in config.
- **dependency-cruiser** for the layer walls: domain/application never
  `electron` or `node:*`; renderer never `electron`, `node:*` or the SDK;
  preload never renderer or core internals; the SDK package imports neither
  electron nor React.
- Removing or weakening one of these rules is a contract change, not a code
  review pass.

## 7. Repository layout (condensed)

```text
src/
├── main/            # composition root: lifecycle, windows, app://, IPC PEP, updater
├── preload/         # typed contextBridge API generated from contracts/ipc
├── core/            # utility-process entry for application + adapters/out
├── renderer/        # React app: router, error boundaries, shells
├── platform/        # only place for process.platform branching
├── shared-kernel/   # Result, ids, errors, time, branded types
├── contracts/       # ipc schemas (zod), DTOs, error codes, policy schema
├── infrastructure/  # sdk/ realtime/ storage/ policy/ logging/
├── features/<slice>/{domain,application,adapters,viewmodels,views,contracts}
└── ui-kit/
packages/{sdk,viewmodels,tokens}/   # shared with web/extension/mobile
tests/<slice>/{unit,contract,e2e,...} tests/_platform/{architecture,fuses,...}
```

## 8. Worked flow (one feature, end to end)

```text
View → ViewModel.moveToStage → CorePort.rpc('leads.moveStage', …)
  → preload bridge → invoke('rpc') → MAIN PEP (sender, capability, schema)
  → CORE use case (permission hint; IdempotencyKey) → port → SDK (net.fetch)
  → backend authorizes → Result<Lead> → ViewModel status
Realtime "funnels.lead.updated" → dedupe → cache refresh → coalesced update
```

Tests for that slice: domain/use case with fake ports, ViewModel statuses,
IPC contract + sender-spoofing, SDK adapter integration, realtime
conformance, parity fixture vs web, packaged e2e.
