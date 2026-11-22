---
name: "<app> Add Slice"
description: "Scaffold a new feature slice (src/features/<scope>) in the <app> Electron desktop app — domain, application, adapters, viewmodels, views and the barrel — wired through main, the preload bridge and the core utility process, with the fake-backed test gate, as one change."
division: core
---

# <app> Add Slice

A reusable scaffolding workflow for adding a new feature slice to the `<app>`
Electron desktop app. An agent (for example the planner or the architect
role) invokes this skill to produce the slice declaration, its contracts, its
wiring and its boundary checklist together — so a new slice never lands
without its wiring across the three trust zones and its boundary discipline.
The output is a wiring sketch plus a boundary checklist, in plain text.

## When to Activate

- A new vertical slice (`src/features/<scope>/`) is requested.
- An existing slice needs a new dependency on `src/platform/`,
  `src/infrastructure/` or `src/contracts/`.
- The hexagonal dependency direction must be verified after a wiring change:
  domain stays pure, application never reaches adapters, features never
  import each other, and nothing outside `main/` and `platform/` imports
  `electron`.
- A reviewer asks for the slice plus wiring bundle before approving an
  internal-structure change.

Do not activate for an in-slice refactor that adds no new slice and no new
cross-boundary dependency — that is ordinary implementation work.

## Core Principles

- The slice is the unit of reuse. A new slice is a new `src/features/<scope>/`
  directory with `domain/`, `application/`, `adapters/`, `viewmodels/`,
  `views/`, `contracts/` and a barrel `index.ts` — together.
- The dependency direction is invariant. `domain/` imports only the shared
  kernel; `application/` imports domain, the shared kernel and the contracts;
  `adapters/` import the application layer, the contracts and the platform;
  `views/` and `viewmodels/` depend on the port types; `main/`, `core/` and
  the entrypoints wire everything. A wire that reverses this is a BLOCK.
- Ports are consumer-defined. `application/ports.ts` declares the interfaces
  the slice's use cases need; the production adapter lives in
  `adapters/` + `src/infrastructure/`, and the fake lives in
  `tests/_shared/fakes/`.
- The Electron boundary belongs to `main/`, `preload/`, `core/` and
  `platform/`. A slice that needs a platform capability takes it through a
  port; it never imports `electron` or `node:*` itself.
- Slices never import each other. A shape shared by two slices moves down to
  `src/contracts/` (zod) or `src/shared-kernel/` (pure types), never as a
  cross-slice import edge.
- The three trust zones hold. Domain and application run in the core utility
  process; the renderer draws state and sends intents through the typed IPC
  contract; `main/` stays a thin trust anchor.

## Rules

- Anti-hallucination: do not invent file paths, port names or import edges
  that are not in the tree. Every scaffolding step cites a file that exists or
  is being added.
- Every claim needs a source: cite the local playbook or the local file for a
  boundary rule; cite the official Electron documentation for a platform
  behaviour.
- Do not emit the final sketch as a fenced code block when raw output is
  expected — the sketch is plain text with labelled sections.
- Verify the cited files exist before reporting; a wiring step that cites a
  port that is not being added is a hallucination.
- A new slice must appear under `src/features/` **and** be wired from a
  composition root; one without the other is a REVISE.
- An `electron` import outside `main/`, `preload/`, `core/` and `platform/`
  is a BLOCK: the per-target tsconfigs, the `no-restricted-imports` rules and
  dependency-cruiser will fail the build.
- A slice that needs a new IPC channel type, a new capability table entry or
  a new durable record is out of scope for this skill — route it to
  `/new-ipc-channel` or `/storage-migration`.

## Research References

Provenance table — every claim in a finding needs a row. The link column
points at the primary source actually read.

| claim | source | year | link |
| --- | --- | --- | --- |
| The three-process trust model: main is the thin trust anchor, the core utility process holds the application, renderers are untrusted | `PLAYBOOK_DESKTOP_ELECTRON.md` | 2026 | local file |
| Renderers are untrusted web pages: sandboxed, context-isolated, no Node, no network | Electron process model documentation | 2026 | https://www.electronjs.org/docs/latest/tutorial/process-model |
| The slice layout and the dependency direction the linter enforces | `dependency-cruiser.config.cjs`, per-target tsconfigs | 2024 | local file |
| Domain and application know nothing about Electron: they talk through ports | `PLAYBOOK_DESKTOP_ELECTRON.md` | 2026 | local file |

## Output Format

A wiring sketch plus a boundary checklist, anchored to the slice root.
Plain text — not a fenced block:

```
SLICE  src/features/<scope>

  files:
    domain/               -> pure types (shared-kernel imports only)
    application/ports.ts     -> consumer-owned port types
    application/use-cases.ts -> orchestration over the ports
    adapters/             -> production adapters over the platform
    contracts/            -> zod schemas this slice owns
    views/                -> React components + the ViewModel hook
    viewmodels/           -> the state machine, no react-dom, no electron
    index.ts              -> the barrel the composition roots import

  deps:
    src/contracts/        -> the shared zod schemas
    src/main/             -> the IPC policy enforcement point
    src/core/             -> the utility process that runs the use cases
    src/platform/         -> the only owner of per-OS branching
    tests/                -> the tiered tests with the shared fakes

  direction:
    domain/        <- (nothing internal)
    application/   <- domain/ + shared-kernel + contracts
    adapters/      <- application/ + contracts + platform
    views/         <- viewmodels/ + react

CHECKLIST
  [ ] slice declared under src/features/<scope>/ with the file set above
  [ ] barrel index.ts exported and imported by a composition root
  [ ] ports are consumer-defined; one production adapter + one fake
  [ ] renderer reaches the core only through the typed IPC contract
  [ ] dependency direction is inward; no cross-slice import
  [ ] no electron or node:* import outside main/, preload/, core/ and
      platform/
  [ ] unit + contract tests written; pnpm run test green
```

Summary line: `add-slice: N slice(s) scaffolded, M wiring step(s) — verdict:
APPROVE | REVISE`.
