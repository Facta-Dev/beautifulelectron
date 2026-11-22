---
name: "<app> Electron Upgrade"
description: "Upgrades the <app> Electron desktop app to a new supported major — the release-notes review, the pinned version bump, the fuse re-verification, the native-module rebuild check and the full matrix gate — as a staged, reversible change."
division: client
---

# <app> Electron Upgrade

A reusable workflow for moving the `<app>` Electron desktop app to a new
Electron major. Electron ships Chromium and Node.js, so an upgrade is a
security procedure, not a dependency bump: only the latest three majors are
supported, each major reaches end of life about six months after release, and
a pinned major will expire. The upgrade is staged — release notes review,
pinned bump, verification, matrix gate — and it lands as one reviewable
change with the support matrix re-derived, not hard-coded.

## When to Activate

- A new Electron major has shipped and the app is on the latest or
  latest-minus-one major (the contract's maximum drift).
- A security patch release landed for the pinned major and must be adopted
  within the advisory SLA.
- A reviewer asks whether the app is on a supported major and how an upgrade
  would run.

Do not activate to jump two majors at once, to adopt an alpha or beta major
into the shipped pin, or to re-pin without a reason recorded in the change.

## Core Principles

- One major at a time. The pin moves from the current supported major to the
  next; the diff of the upgrade is reviewable on its own.
- The release notes are read first. Preload and sandbox changes, fuse
  behaviour, ESM support and API removals come from the release notes and the
  breaking-changes list, in this session — never from memory.
- The version is pinned exactly. The package pins an exact supported major,
  never a caret: a floating Electron version is a supply-chain decision
  someone makes at install time, which is unacceptable.
- Fuses are re-flipped and re-read. The upgrade replays the fuse table in the
  packaging step and `@electron/fuses` reads it from the packaged output in
  CI; a fuse that changed meaning between majors is caught there.
- The support matrix is re-derived. OS floors (Electron 44+ requires macOS
  13+), the display servers and the architectures are re-checked against the
  new major and `docs/support-matrix.md` is updated in the same change.

## Rules

- Anti-hallucination: the target version, the breaking changes and the OS
  floors come from the release notes and the playbook read in this session;
  anything version-specific that was not verified at the source is marked
  `(verify)`, not asserted.
- Every claim needs a source: cite the release notes, the playbook or the
  local configuration for each statement.
- Do not emit the final output as a fenced code block when raw output is
  expected.
- Never adopt an unsupported major: only the latest three stable majors are
  in scope, and the shipped pin is the latest or latest-minus-one.
- Native modules (if any survive the ADR that avoids them) are rebuilt per
  the new Electron ABI with `@electron/rebuild`, not shimmed.
- The upgrade gate is the full matrix: all three OS families, x64/arm64,
  X11/Wayland on Linux, and the software-rendering mode; a green
  single-OS run does not close the upgrade.
- The e2e suite runs against the packaged, fused app; an unpackaged dev run
  hides fuse and ASAR regressions.
- Rollback is free: the previous pin is one commit away, and the change
  records how to revert it.

## Research References

Provenance table — every claim in a finding needs a row.

| claim | source | year | link |
| --- | --- | --- | --- |
| A new Electron major ships every 8 weeks; the latest three are supported; each major reaches end of life about six months after release | `PLAYBOOK_DESKTOP_ELECTRON.md` §2.6 | 2026 | local file |
| Electron 45 is the latest stable major (Chromium 156, Node.js 24, released 2026-10-20); Electron 44+ requires macOS 13+ | `PLAYBOOK_DESKTOP_ELECTRON.md` verification note | 2026 | local file |
| Upgrade policy: no more than one major behind, upgrade PR within 2 weeks, patch releases within the advisory SLA | `PLAYBOOK_DESKTOP_ELECTRON.md` §2.6 | 2026 | local file |
| Fuses are flipped in the packaging step before signing and verified in CI | Electron Fuses documentation | 2026 | https://www.electronjs.org/docs/latest/tutorial/fuses |
| The fuse table the upgrade must reproduce | `PLAYBOOK_DESKTOP_ELECTRON.md` §12.3 | 2026 | local file |

## Output Format

An upgrade record plus a gate log. Raw structured prose — not a fenced
block:

```
### <app> electron upgrade

From: electron <current exact version>  ->  To: electron <target exact version>
Sources read: release notes, breaking-changes list, playbook

Breaking changes relevant to this app:
- <change> | impact: <which file or gate> | action: <what was changed or
  why nothing is needed> | or: (verify) with what must be checked

Steps:
1. Pin the exact target version; lockfile updated; typecheck + lint green
2. Fuse table re-applied in packaging; `@electron/fuses` read matches
3. Native modules: none (per ADR) or rebuilt per new ABI
4. Full test suite + e2e against the packaged app
5. Matrix: <list the OS/arch/display/software-rendering runs>
6. Support matrix and docs re-derived and updated

Gates:
  typecheck -> <result>; lint -> <result>; test -> <result>;
  e2e packaged -> <result>; fuse read -> <result>

Verdict: UPGRADED | BLOCKED
```

Summary line: `electron-upgrade: <from> -> <to>, N breaking change(s), gate:
<result> — verdict: UPGRADED | BLOCKED`.
