---
name: "perf-regression"
description: "Measures and reports <app> performance against the playbook budgets: startup time and the snapshot, GPU safe-mode behaviour, memory, and the SSE/realtime paths, with a baseline diff and (verify) markers for unmeasured claims."
division: testing
---

# `<app>` perf-regression skill

> Reusable workflow for detecting performance regressions in the `<app>` app
> against the playbook's budgets. An agent invokes this skill; the skill
> measures, compares against the baseline and reports — it does not optimise
> in the same pass.

## When to Activate

Activate this skill when a change could plausibly affect the budgets:
renderer startup, bundle size, the core round-trip cost, the SSE parser
throughput, memory at idle, or the GPU safe-mode path.

Do NOT activate this skill when:

- The change is purely in storage without user-visible data volume.
- There is no baseline to compare against — establish one first and say so,
  do not invent numbers.
- The request is a one-off tuning spike, not a regression check.

## Core Principles

- **The budget is the test.** The playbook's performance budgets (startup on
  the floor hardware, memory, interaction cost) are the acceptance numbers;
  personal taste is not a finding.
- **Measure, never estimate.** Every number in the report comes from a run of
  a command the report names; a claim without a measurement carries `(verify)`
  or is dropped.
- **The no-GPU path is a first-class surface.** GPU safe mode is part of the
  contract; a regression that only appears with acceleration off is a
  regression all the same.
- **Baselines are recorded, not recalled.** One baseline per release, the
  hardware and environment noted, the diff computed against it.
- **A regression is a gate.** If the diff breaks a budget, the verdict gates
  the merge the same way a failing test would.

## Rules

- State the measurement environment: the hardware, the OS, the build profile
  and whether the app was packaged or dev-run; numbers without environment are
  noise.
- Re-run any surprising number before reporting it; a single noisy sample is
  not a verdict.
- Do not optimise during the regression pass; findings become their own
  changes.
- Realtime performance claims (SSE event processing cost, WebSocket behaviour)
  are measured against the actual parser and mode in the tree, or marked
  `(verify)`.
- Never fabricate a frame time, startup number or memory figure.
- The regular test gates still run; a perf check never replaces `make ci`.

## Research References

| Claim | Source | Year | Link |
|-------|--------|------|------|
| Reference hardware ("the floor") and the budget table | `PLAYBOOK_DESKTOP_ELECTRON.md` §2.2–2.3 | - | `PLAYBOOK_DESKTOP_ELECTRON.md` |
| Performance engineering rules | `PLAYBOOK_DESKTOP_ELECTRON.md` §2.4 | - | `PLAYBOOK_DESKTOP_ELECTRON.md` |
| GPU safe mode (no-GPU guarantee) and relaunch logic | `PLAYBOOK_DESKTOP_ELECTRON.md` §2.5, Appendix G | - | `PLAYBOOK_DESKTOP_ELECTRON.md` |
| Startup behaviour and the snapshot mechanism claims | `PLAYBOOK_DESKTOP_ELECTRON.md` §2, §14 | - | `PLAYBOOK_DESKTOP_ELECTRON.md` |
| Performance gates and evidence requirements | `PLAYBOOK_DESKTOP_ELECTRON.md` §16.4 | - | `PLAYBOOK_DESKTOP_ELECTRON.md` |

## Output Format

```
Perf check: <app> — <build profile, environment>
Baseline: <commit, date, environment>
Measurements:
  startup  <measured X> vs budget <Y> — <PASS | FAIL>
  memory   <measured X> vs budget <Y> — <PASS | FAIL>
  realtime <measured X> vs budget <Y> — <PASS | FAIL>
  gpu-safe <result on the safe path>
Diff vs baseline: <metric> <±value> — <improvement | regression | noise>
Verdict: PASS | FAIL — <one line>
(verify): <claims needing measurements on floor hardware, or none>
```
