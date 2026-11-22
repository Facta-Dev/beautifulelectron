---
name: review
description: "Runs the <app> Electron pre-landing checklist — trust zones, IPC surface, navigation and content loading, secrets and auth, storage and realtime, packaging and updates, performance, accessibility and test adequacy — producing a severity-ranked verdict against the full gate."
division: core
---

# <app> Review

A reusable pre-landing review checklist for the `<app>` Electron desktop
app. An agent invokes this skill; the agent supplies the contextual
judgement, the skill supplies the deterministic procedure. Nine fixed
categories are walked in the same order every time, ranked by how far the
damage reaches: trust zones and architecture first, then the IPC surface,
then packaging and updates, then the rest. The output is raw structured
prose with a verdict, never a fenced block.

## When to Activate

- Before landing any change under `src/`, `forge.config.ts`, the vite
  configs or the packaging hooks.
- Whenever a request asks for a "review", a "gate check" or a "pre-landing
  pass".
- A change touches a window, a `webPreferences` object, an IPC type, the
  core dispatcher, the storage layer or the fuse table.
- A follow-up review after fixes from a prior `/review` pass.

Do not activate for documentation-only changes with no source edits. This
skill COMPLEMENTS the `code-reviewer` core agent rather than replacing it:
the agent reasons freely about intent and tradeoffs, while this skill walks
the same nine categories in the same order every time.

## Core Principles

- **Checklist, not judgement.** Nine fixed categories, always in this order:
  trust zones and architecture, IPC and preload, navigation and content
  loading, secrets and auth, storage and realtime, packaging and updates,
  performance, accessibility and i18n, test adequacy.
- **Renderers are untrusted.** A renderer with `contextIsolation` disabled,
  `sandbox` off, Node access, or its own network path is a BLOCK; the
  sandboxed, isolated, CSP-bound renderer is the default, and the review
  states which rule caught the violation.
- **Validate, then parse.** A message handled before the sender origin, the
  top-frame status and the window capability are checked in
  `src/main/ipc-policy.ts` is a BLOCK.
- **The preload exposes functions, never `ipcRenderer`.** A generic channel
  passthrough or a prototype-bearing object across `contextBridge` is a
  BLOCK.
- **Packaging is security.** Fuses flipped before signing and read back from
  the packaged output, ASAR integrity claimed only where it exists (macOS and
  Windows), and no `--no-sandbox` anywhere on Linux.
- **Secrets never reach the renderer.** Tokens live in the core's memory and
  in `safeStorage` blobs; a token in an IPC payload, a log line or a crash
  dump is a BLOCK.

## Rules

- No fabricated data: do not invent file paths or line numbers. If a file
  was not read this session, list it under "not reviewed" instead of
  guessing.
- Every claim needs a source: a finding cites the file and line actually
  read, or it is tagged "unverified".
- No code-fenced final output where raw output is expected: the verdict is
  raw structured prose.
- Read each touched file before reporting on it; unread files are listed
  separately.
- BLOCK only on a real finding: a trust-zone violation, an unvalidated
  sender, an IPC type without its two tests, a relaxed
  `webPreferences` default, a fuse drift, a secret in renderer reach, an
  unbumped database version, or an `electron` import outside the process
  boundary files.
- WARN on style-grade issues: a thin but present justification, a duplicated
  constant that belongs in `src/contracts/`, a test that could assert more
  precisely.
- APPROVE only when all nine categories show no BLOCK-level finding.

## Research References

Provenance table — every claim in a finding needs a row.

| claim | source | year | link |
| --- | --- | --- | --- |
| The three-process trust model and the mandatory `webPreferences` defaults | `PLAYBOOK_DESKTOP_ELECTRON.md` §3, §12.2 | 2026 | local file |
| Sender verification: sender origin, top frame, known window, capability table | `PLAYBOOK_DESKTOP_ELECTRON.md` §5.1, `src/main/ipc-policy.ts` | 2026 | local file |
| The envelope, the per-type schemas and the window capability table | `src/contracts/ipc.ts` | 2026 | local file |
| The fuse table and the ASAR integrity platform matrix | `PLAYBOOK_DESKTOP_ELECTRON.md` §12.3 | 2026 | local file |
| The Electron security checklist the categories mirror | Electron security tutorial | 2026 | https://www.electronjs.org/docs/latest/tutorial/security |
| The test tiers and the gates | `PLAYBOOK_TESTS.md` | 2024 | local file |

## Output Format

Raw structured prose — not a code fence:

```
### <app> review — pre-landing checklist

Gate: typecheck + lint + test + build + evals

Findings:
- [BLOCK|WARN] trust-zones @ <file>:<line> — <what> | fix: <suggestion>
- [BLOCK|WARN] ipc-preload @ <file>:<line> — <what> | fix: <suggestion>
- [BLOCK|WARN] navigation-content @ <file>:<line> — <what> | fix: <suggestion>
- [BLOCK|WARN] secrets-auth @ <file>:<line> — <what> | fix: <suggestion>
- [BLOCK|WARN] storage-realtime @ <file>:<line> — <what> | fix: <suggestion>
- [BLOCK|WARN] packaging-updates @ <file>:<line> — <what> | fix: <suggestion>
- [BLOCK|WARN] performance @ <file>:<line> — <what> | fix: <suggestion>
- [BLOCK|WARN] a11y-i18n @ <file>:<line> — <what> | fix: <suggestion>
- [BLOCK|WARN] test-adequacy @ <file>:<line> — <what> | fix: <suggestion>

Not reviewed (not read):
- <file>

Verdict: APPROVE | WARN | BLOCK
```
