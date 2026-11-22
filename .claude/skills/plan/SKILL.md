---
name: plan
description: "Writes the <app> plan document under docs/plans/ — problem, constraints, design, files, risks, tests and gate commands — as an ordered, verifiable sequence that ends at the full gate."
division: core
---

# <app> Plan

A reusable workflow for producing the plan document of a change in the
`<app>` Electron desktop app. The plan is a sequence of gate-checked steps,
not a wish list: each step names the files it touches, the order it must
land in, and the command that proves it. The output is the plan document
itself plus the ordered step list.

## When to Activate

- A feature request needs to be broken into ordered steps before any code is
  written.
- A change touches more than one trust zone — a slice, the contracts, the
  main process, the core or the preload bridge.
- A change adds an IPC type, a policy key, a storage migration or a packaging
  step, and the ordering matters.
- A reviewer asks "what is the order here?" before approving the work.

Do not activate for a single-file, single-layer change that one engineer can
sequence in their head — the plan for that is the diff.

## Core Principles

- Every step is verifiable. A step without a named gate command is not a
  step; "test it" is not a command.
- Order is part of the plan. An IPC schema lands before the dispatcher and
  the handler that parse it, a migration lands before the reader, a fuse
  change lands before the artifact that must carry it.
- The blast radius is stated up front: which trust zones and layers are
  touched, which are deliberately not, and what the IPC, policy and storage
  consequences are.
- The smallest correct change. The plan extends the existing seams — the
  existing port, the existing slice, the existing contract — instead of
  introducing a new package, port or dependency.
- The plan ends at the full gate. Typecheck, lint, test, build and the
  packaged verification are the definition of done; a plan that stops
  earlier is incomplete.

## Rules

- Anti-hallucination: every file path in the plan must exist or be created
  by a named step; never cite a path that was not read.
- Every claim needs a source: cite the local file or playbook for a
  repository rule; cite the official Electron documentation for a platform
  behaviour.
- Do not emit the final plan as a fenced code block when raw output is
  expected — the document is plain Markdown text.
- Each step names exactly one gate command, so a failure points at the step
  that caused it.
- A plan never proposes an `electron` or `node:*` import outside
  `main/`, `preload/`, `core/` and `platform/`, never a cross-slice import,
  and never a new IPC type, policy key or packaged surface without its
  contract step earlier in the sequence.
- A plan that changes a durable record includes the version bump, the
  forward-only migration and the fixture of the previous schema as explicit
  steps.
- Do not schedule work the request does not need: no speculative refactors,
  no future-proofing, no second abstraction.

## Research References

Provenance table — every claim in a finding needs a row.

| claim | source | year | link |
| --- | --- | --- | --- |
| The three-process trust model: main orchestrates, the core utility process runs the application, renderers draw state | `PLAYBOOK_DESKTOP_ELECTRON.md` §3 | 2026 | local file |
| IPC is one typed validated contract, brokered through the main-process policy enforcement point | `PLAYBOOK_DESKTOP_ELECTRON.md` §5, `src/contracts/ipc.ts` | 2026 | local file |
| The layer rules and the dependency direction | `PLAYBOOK_DESKTOP_ELECTRON.md` §3.2, `PLAYBOOK_FRONTEND.md` | 2026 | local file |
| The gate commands and what each one proves | `Makefile`, `package.json` | 2024 | local file |
| The enforced architecture rules | `dependency-cruiser.config.cjs`, `eslint.config.mjs`, per-target tsconfigs | 2024 | local file |

## Output Format

The plan document, written to `docs/plans/<slug>.md` (the directory is
created on demand), then the ordered step list. Plain Markdown — not a
fenced block:

```
# Plan — <title>

## Problem
One paragraph: what is missing today and what changes for the user.

## Constraints
The rules that bound the solution: the trust zones, the IPC contract, the
policy schema, the storage version, the gates.

## Design
The chosen approach and the alternatives rejected, with the reason.

## Files
The files created and edited, with one line each.

## Risks
What can go wrong, how it is detected, and what happens if it does.

## Tests
The tests to write, per tier, and the red-first order.

## Steps
1. <file> — <what changes>
   Gate: <command>
2. ...

## Definition of done
Typecheck, lint, test, build and evals green; the packaged smoke pass done;
docs updated where the public surface changed.
```

Summary line: `plan: <slug> — N step(s), M risk(s) — verdict: READY |
NEEDS-CLARIFICATION`.
