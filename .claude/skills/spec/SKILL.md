---
name: spec
description: "Files a scoped, redaction-scanned specification for the <app> Electron desktop app — the user-visible behaviour, the acceptance criteria, the non-goals and the open questions — before any plan or code exists."
division: core
---

# <app> Spec

A reusable workflow for writing the specification of a change in the
`<app>` Electron desktop app. The spec states the behaviour the user will
observe, the acceptance criteria that will be tested, and the non-goals that
keep the change small. It is written before the plan and long before the
code, and it is deliberately free of implementation detail: a spec that
names files and functions is a plan wearing a spec's clothes.

## When to Activate

- A request arrives with more than one reading, or an unclear boundary.
- A change touches a user-visible surface — a window, a settings view, a
  background behaviour, an admin or update surface.
- A new capability, IPC type, policy key or durable record is proposed.
- A reviewer asks what exactly is being built before the plan is written.

Do not activate for a well-specified bug fix with an unambiguous expected
behaviour — the failing test is the specification in that case.

## Core Principles

- Behaviour, not implementation. The spec describes what the user sees and
  what the app guarantees, not which file changes.
- Acceptance criteria are testable. Each one names an observable outcome
  that a test can assert; "works well" is not a criterion.
- Non-goals are mandatory. The list of what this change deliberately does
  not do is what keeps the diff small and the review short.
- The trust, policy and privacy surface is part of the spec. If the change
  touches what a window may reach, what a renderer can send, what the app
  stores or sends, that is stated in the spec, not discovered in review.
- Open questions are surfaced, not guessed. A question the requester must
  answer is written as a question, and the plan waits for the answer.

## Rules

- Anti-hallucination: every claim about current behaviour cites the file
  that was read; nothing is asserted about the existing code that was not
  verified.
- Every claim needs a source: cite the local file for a repository behaviour
  and the official Electron documentation for a platform constraint.
- Do not emit the final spec as a fenced code block when raw output is
  expected — the spec is plain Markdown text.
- Never write a real secret, token, cookie value, host-specific customer
  data or personal identifier into a spec. Describe the shape, not the value.
- Every acceptance criterion maps to exactly one test tier: `unit`,
  `viewmodel`, `contract` or `platform`.
- A spec with no non-goals is incomplete; a spec with no open questions must
  state that there are none.
- No implementation nouns in the acceptance criteria: no file names, no
  function names, no class names.

## Research References

Provenance table — every claim in a finding needs a row.

| claim | source | year | link |
| --- | --- | --- | --- |
| The app's surfaces span the main, core and renderer processes and the windows they host | `PLAYBOOK_DESKTOP_ELECTRON.md` §3 | 2026 | local file |
| The trust, policy and security surface the spec must respect: sandboxed renderers, the typed IPC contract, managed policy, safeStorage | `PLAYBOOK_DESKTOP_ELECTRON.md` §5, §12, §13 | 2026 | local file |
| The test tiers the acceptance criteria map to | `PLAYBOOK_TESTS.md` | 2024 | local file |
| The window capability table and the policy keys that bound a spec | `src/contracts/ipc.ts`, `src/contracts/policy.ts` | 2026 | local file |

## Output Format

The spec document, written to `docs/specs/<slug>.md` (the directory is
created on demand). Plain Markdown — not a fenced block:

```
# Spec — <title>

## Status
draft | ready-for-plan | ready-for-implementation

## Context
What exists today, with the file that proves each claim.

## Behaviour
The user-visible outcome, described without naming a file or a function.

## Acceptance criteria
1. <observable outcome>
   Tier: unit | viewmodel | contract | platform
2. ...

## Non-goals
- <what this change deliberately does not do>

## Trust, policy and data surface
What the app reads, stores and sends as a result of this change, which
trust zone runs it, and whether the IPC capability table, the policy schema
or the permission posture changes. If it does, the corresponding register
or contract step is named as a prerequisite.

## Open questions
- <question> — needs an answer from: <requester>

## Risks
What could make this spec wrong, and what would reveal it early.
```

Summary line: `spec: <title> — N criteria, N non-goals, N open question(s)
— verdict: READY | NEEDS-CLARIFICATION`.
