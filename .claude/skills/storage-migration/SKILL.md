---
name: "<app> Storage Migration"
description: "Migrates a durable <app> desktop record in SQLite — the forward-only migration in code, the user_version bump, the fixture of the previous schema and the backup/reset path — so an existing installation keeps its data and stays repairable."
division: client
---

# <app> Storage Migration

A reusable workflow for changing the shape of a durable record in the
`<app>` Electron desktop app's SQLite database. Every shipped installation
already holds the old schema on disk, so a shape change without a version
bump is a data-loss defect that no test in the repository will catch. This
skill produces the version bump, the forward-only migration, the fixture of
the previous schema and the corrupt-database path together.

## When to Activate

- A durable record's shape changes: a column is added, removed, renamed or
  retyped.
- A migration chain has a gap — a version shipped with no migration to the
  next.
- A reviewer asks whether an existing installation survives a change.

Do not activate for a change that touches no durable state: a projection
cache key a renderer invents for itself, an in-memory store or an in-flight
IPC payload needs no migration.

## Core Principles

- Version first. The database version — for example `PRAGMA user_version` —
  is bumped in the same change as the schema, and each migration is named for
  the pair it bridges.
- Migrations are forward-only and in code. There is no down migration: the
  server holds the truth, so a reset-and-resync replaces a rollback. Every
  migration runs from every released schema — the chain is exercised from the
  oldest supported shape, not only from the newest.
- The migration is pure where it can be. Schema rewrites are deterministic
  functions of the old data; row backfills that need a timestamp receive it
  as a parameter. A migration that reaches for the clock, the network or
  global state is a REVISE.
- Backup before migrating, integrity check after a crash. The migration step
  copies the database aside first; after a crash the integrity check runs
  before the app reads data.
- Fail soft toward the server. A database beyond repair is reset and
  resynced from the backend — never silently destroyed, and never left as a
  corrupt file the app keeps reading.

## Rules

- Anti-hallucination: the version constant, the migration file names and the
  table names must exist in the tree; do not invent a version that was never
  shipped.
- Every claim needs a source: cite the local migration file for the current
  version and the Python/Node SQLite or Electron platform documentation for
  the storage behaviour.
- Do not emit the final output as a fenced code block when raw output is
  expected.
- A shape change without a version bump and a migration is a BLOCK.
- A migration that is not forward-only, or that a fresh install cannot skip
  cleanly, is a REVISE.
- Every migration ships with a fixture of the previous schema so the chain
  is exercised from the oldest shipped shape.
- The corrupt-database path is covered: a fixture that fails the integrity
  check moves to the on-disk backup and the app resyncs from the server,
  never crashes.
- Storage lives in the core process in the user data dir obtained from
  `app.getPath('userData')`, never next to the executable.

## Research References

Provenance table — every claim in a finding needs a row.

| claim | source | year | link |
| --- | --- | --- | --- |
| SQLite in the core process with WAL, forward-only migrations in code tested from every released schema, backup before migrating, and reset-and-resync on corruption | `PLAYBOOK_DESKTOP_ELECTRON.md` §10 | 2026 | local file |
| `app.getPath('userData')` is the place for per-user data, never next to the executable | `PLAYBOOK_DESKTOP_ELECTRON.md` §10 | 2026 | local file |
| `PRAGMA user_version` stores the schema version the migrations step through | SQLite documentation | 2024 | https://www.sqlite.org/pragma.html |
| The migration layout and the fixture convention | `src/infrastructure/storage/migrations.ts` | 2026 | local file |

## Output Format

A migration plan plus a chain summary. Plain text — not a fenced block:

```
MIGRATION  notes  v2 -> v3

  version bump:
    src/infrastructure/storage/migrations.ts — user_version 2 -> 3

  migration:
    src/infrastructure/storage/migrations.ts
      migrateV2toV3(db): ALTER TABLE / backfill with the timestamp passed in
      forward-only; a fresh install applies the full chain in order

  backup:
    the database file is copied aside before the migration runs

  fixture:
    tests/infrastructure/fixtures/notes-v2.json — the oldest shipped
      schema, so the whole chain is exercised

  corrupt path:
    an integrity check failure moves the file aside and triggers
    reset-and-resync from the backend

CHAIN
  v1 -> v2  present
  v2 -> v3  present (this change)
  gap: none

CHECKLIST
  [ ] version bumped in the same change
  [ ] migration is forward-only and deterministic
  [ ] the chain has no gap and covers every shipped version
  [ ] a fixture of the previous schema exists and the test walks the chain
  [ ] backup-before-migrate and the corrupt-database path are covered
  [ ] data lives in the core process under the user data dir
  [ ] pnpm run test green
```

Summary line: `storage-migration: N record(s) migrated, chain gap: none —
verdict: APPROVE | REVISE`.
