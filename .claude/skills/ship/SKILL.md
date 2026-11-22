---
name: "<app> Ship"
description: "Prepares the <app> Electron desktop release — the green gate evidence, the pinned version bump, the fuse and packaging verification, the changelog entry and the pull request body — without publishing, deploying or committing on its own."
division: core
---

# <app> Ship

A reusable workflow for preparing a release of the `<app>` Electron desktop
app. The skill assembles the evidence a reviewer needs — the gate output, the
pinned Electron and app versions, the fuse verification, the security posture
— and drafts the pull request body. It never publishes, never pushes, never
merges, never tags and never signs: those are human actions on a repository
and on credentials the agent does not own.

## When to Activate

- The user asks to ship, release or open a pull request for the app.
- A change set is complete and every gate is green, and the release
  preparation is the remaining work.
- A release process needs the version, the fuse verification, the security
  posture and the changelog assembled.

Do not activate for an ordinary commit in the middle of a feature, and do
not activate to bypass a red gate — a failing gate stops the release, it
does not annotate it.

## Core Principles

- The gate output is the evidence. The release notes quote the actual gate
  and packaged-verification results from this session, not a recollection of
  an earlier run.
- The version lives in one place. The pinned app version and the pinned
  Electron major come from `package.json` and the lockfile; a floating
  Electron version is not releasable.
- The security posture is restated on every release. The fuse table read
  from the packaged output, the ASAR integrity platform scope and the
  renderer hardening posture are listed in the pull request body, because
  a reviewer must see the security surface without opening the diff.
- The public surface is declared. A change to the IPC capability table, the
  policy schema, the storage schema or the updater feed is called out
  explicitly, because those are the parts an installation actually depends
  on.
- The agent prepares; the human publishes. No tag is pushed, no release is
  published, no signing job is triggered and no branch is force-pushed by
  this workflow.

## Rules

- No fabricated data: the gate results, the commit hashes and the versions
  come from commands actually run in this session, or the release stops with
  a named missing step.
- Every claim needs a source: cite the command whose output supports each
  statement in the pull request body.
- Do not emit the final pull request body as a fenced code block when raw
  output is expected — it is plain Markdown to be pasted.
- Never force-push and never push to a shared branch without the user's
  explicit instruction.
- If a gate is red, stop and report which gate failed and its output; do not
  ship a known-red build.
- Never report a fuse verification that was not read from the packaged
  artifact; "the config sets it" is not verification.
- The changelog entry describes user-visible change only; internal refactors
  are listed as housekeeping, not as features.
- Do not include secrets, tokens, customer identifiers or environment values
  in the pull request body.

## Research References

Provenance table — every claim in a finding needs a row.

| claim | source | year | link |
| --- | --- | --- | --- |
| The pipeline order: build, package, flip fuses, verify fuses, sign, notarize, verify, publish | `PLAYBOOK_DESKTOP_ELECTRON.md` §15.2 | 2026 | local file |
| The fuse table that must be read back from the packaged output | `PLAYBOOK_DESKTOP_ELECTRON.md` §12.3 | 2026 | local file |
| `@electron/fuses` reads the fuses from the packaged binary | Electron Fuses documentation | 2026 | https://www.electronjs.org/docs/latest/tutorial/fuses |
| The gates that must be green before a release | `Makefile`, `package.json` | 2024 | local file |
| The template verifies itself by staging a renamed copy and running every gate on it | `scripts/verify-template.sh` | 2024 | local file |

## Output Format

Raw structured prose plus a paste-ready pull request body. Not a fenced
block:

```
### <app> ship — release preparation

Gate evidence (run in this session):
  typecheck + lint + test + build -> <actual result>
  evals                          -> <actual result>
  packaged fuse read             -> <actual result>

Version:  <app version> (Electron pinned at <exact Electron version>,
Chromium <version>, Node <version>)

Security posture:
  fuses: <the verified table, or the named gap>
  asar integrity: <macOS/Windows claimed; not claimed on Linux>
  renderer hardening: <the webPreferences defaults confirmed>

Public surface changed:
  - IPC capability table / policy schema / storage schema / updater feed /
    none

CHECKLIST
  [ ] every gate green in this session
  [ ] versions pinned exactly
  [ ] fuse verification read from the packaged artifact
  [ ] no lockfile drift or unexplained version change
  [ ] changelog entry written (user-visible change only)
  [ ] pull request body reviewed by a human before publishing

--- pull request body ---

Title: <type>: <summary>

Body:
  What changed and why, in two or three sentences.
  The gates that were run and their result, including the packaged
  verification.
  The security posture, unchanged or with the named change.
  The user-visible change, or "none".
  The risks and the rollback.

--- end pull request body ---

Next (human): review, merge, tag, sign and publish.
```

Summary line: `ship: <version> — gates: N passed, N failed — verdict: READY
| BLOCKED`.
