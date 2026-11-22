---
name: new-policy-key
description: "Registers a managed-policy key for the <app> Electron desktop app — the zod policy schema entry in src/contracts/policy.ts, the defaults and resolver wiring, the admin-guide and permissions-register documentation, and the tests that pin the precedence order."
division: security
---

# <app> New Policy Key

A reusable workflow for adding a managed-policy key to the `<app>` Electron
desktop app. A policy key is an administrator's control over the product: it
changes what a managed fleet can do and what the app may execute. The key is
declared once in the zod policy schema with `additionalProperties` closed, it
flows through the pure resolver with the precedence **managed > user >
defaults**, and it is documented and pinned by tests in the same change — so
a fleet administration surface never lands undocumented or unpinned.

## When to Activate

- A new key is added to the managed policy schema — a toggle, an enum, a
  bound number or a URL.
- An existing key's type, enum set or default changes.
- A reviewer asks whether a proposed key is enforceable, validated and
  documented.

Do not activate for a change that touches no policy key — a pure refactor or
a policy-free feature needs nothing here.

## Core Principles

- The schema is the contract. Every key lives in `src/contracts/policy.ts`
  with an explicit zod type, an enum or a bound value, and the schema closes
  the surface so an unknown key cannot slip through.
- Precedence is fixed. Policies override user settings; the UI shows locked
  controls as managed by the organization. The pure resolver applies
  **managed over user over defaults**, and the precedence is pinned by a
  test, not by convention.
- Read in main, apply in core. Policy sources are read in the main process
  with no shell interpolation, validated against the schema, and the resolved
  result is handed across; an invalid value is ignored, not coerced.
- The documentation comes with the key. `docs/admin-guide.md` names the key,
  its type, its effect and its sources per OS (Windows registry under
  `HKLM\Software\Policies\<Vendor>\<Product>`, macOS managed preferences, the
  Linux policy file); `docs/permissions-register.md` gains an entry when the
  key changes what the app may read or request.
- The posture is pinned by a test. A new key ships with a resolver test that
  covers managed override, user override, the default, and an invalid value
  being ignored.

## Rules

- Anti-hallucination: the key name, its type and its defaults must be written
  down in the sketch; never invent a key that no code reads.
- Every claim needs a source: cite the local policy schema and the local
  resolver for the wiring, and the playbook for the per-OS policy sources.
- Do not emit the final output as a fenced code block when raw output is
  expected.
- A key that lets user settings win over managed policy is a BLOCK.
- A key without schema validation on the read path is a BLOCK: raw policy
  input is untrusted data, never cast and used.
- An invalid or missing value must fall back to the default, never to a
  permissive behaviour; a key whose invalid path is more permissive than its
  default is a REVISE.
- A key that changes the permission surface names the permissions-register
  entry as part of the same change.
- A kill-switch-shaped key (network stop, read-only mode) must remain
  effective when every other policy source fails to load.

## Research References

Provenance table — every claim in a finding needs a row.

| claim | source | year | link |
| --- | --- | --- | --- |
| Managed policy sources per OS: Windows registry with ADMX/ADML or PROGRAMDATA JSON, macOS managed preferences, Linux policy file | `PLAYBOOK_DESKTOP_ELECTRON.md` §13.1 | 2026 | local file |
| Policies override user settings and locked controls are shown as managed | `PLAYBOOK_DESKTOP_ELECTRON.md` §13.1 | 2026 | local file |
| Policy is read in main with no shell interpolation and handed to core validated | `PLAYBOOK_DESKTOP_ELECTRON.md` §13.1 | 2026 | local file |
| The policy schema, its enum types and the closed surface | `src/contracts/policy.ts` | 2026 | local file |
| The pure resolver and its precedence | `src/infrastructure/policy/resolver.ts` | 2026 | local file |

## Output Format

A policy change sketch plus a test checklist. Plain text — not a fenced
block:

```
KEY  RealtimeMode (exists) / <NewKey> (proposed)

  schema:
    src/contracts/policy.ts — the key, its zod type, its enum or its bounds
    schema surface closed: unknown keys rejected

  defaults:
    src/infrastructure/policy/resolver.ts — the default value; managed
    over user over defaults; an invalid value falls back to the default

  sources:
    Windows: HKLM\Software\Policies\<Vendor>\<Product> (ADMX/ADML)
    macOS:   /Library/Managed Preferences/<bundle-id>.plist
    Linux:   /etc/<product>/policy.json

  docs:
    docs/admin-guide.md — the key, its type, its effect, per-OS sources,
    and the UI state when locked
    docs/permissions-register.md — only when the key changes what the app
    may read or request

  tests:
    tests/infrastructure/policy-resolver.test.ts
      - managed wins over user; user wins over the default
      - an invalid value is ignored and the default applies
      - the schema rejects an unknown key

CHECKLIST
  [ ] schema entry added with an explicit type and closed surface
  [ ] default recorded in the resolver
  [ ] precedence test written (managed > user > default)
  [ ] invalid-value path falls back to the default, not to a permissive one
  [ ] admin-guide table row added; register entry when the permission
      surface changes
  [ ] pnpm run typecheck + pnpm run test green
```

Summary line: `new-policy-key: N key(s) registered, N precedence test(s) —
verdict: APPROVE | REVISE`.
