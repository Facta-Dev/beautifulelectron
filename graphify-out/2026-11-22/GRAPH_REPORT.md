# Graph Report - .  (2026-11-22)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 938 nodes · 1167 edges · 143 communities (87 shown, 56 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05c09566`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Path
- CheckSkillTests
- Electron best practices
- check-examples.py
- interface
- What You Must Do When Invoked
- NotesViewModel
- GateScript
- test_repo_gates.py
- Beautiful Electron
- compilerOptions
- compilerOptions
- package.json
- package.json
- Electron security digest
- Electron platform digest
- 2. Legacy Electron to Electron 45 mapping
- BestPractices
- 2. Categories, in ranking order
- graphify reference: extra exports and benchmark
- PackageTests
- <app> IPC Surface Reviewer Agent
- <app> Packaging Updater Reviewer Agent
- <app> Renderer Security Reviewer Agent
- `<app>` Renderer UI Reviewer
- <app> Architect Agent
- <app> Build Resolver Agent
- <app> Code Explorer Agent
- <app> Code Reviewer Agent
- <app> Planner Agent
- <app> TDD Guide Agent
- <app> Electron Security Reviewer Agent
- <app> Test Author Agent
- <app> Add Slice
- <app> Claim Check skill
- <app> Clean-Room Rebuild skill
- <app> Corpus Retrieval skill
- <app> Diagnosing Bugs skill
- <app> Domain Modeling skill
- <app> Electron Security Check
- <app> Electron Upgrade
- <app> Grilling skill
- <app> Learn
- <app> New IPC Channel
- <app> New Policy Key
- `<app>` perf-regression skill
- <app> Plan
- <app> Research skill
- <app> Review
- <app> Ship
- <app> Spec
- <app> Storage Migration
- <app> Test-Driven Development skill
- <app> Verified Status skill
- <app> Visual Review skill
- ambient.d.ts
- TypeScript strict digest
- graphify reference: query, path, explain
- review-insecure-ipc.md
- The report
- build
- Electron port
- Electron review
- The minimal example
- beautifulelectron — agent instructions
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- consistent-type-imports.ts
- check-lints.sh
- guard-bash.sh
- /add-slice
- /claim-check
- /clean-room-rebuild
- /corpus-retrieval
- /diagnosing-bugs
- /domain-modeling
- /electron-security-check
- /electron-upgrade
- /grilling
- /learn
- /new-ipc-channel
- /new-policy-key
- /perf-regression
- /plan
- /research
- /review
- /ship
- /spec
- /storage-migration
- /tdd
- /verified-status
- /visual-review
- Playbooks for `beautifulelectron` — load on demand
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- restricted-sdk.ts
- switch-exhaustiveness.ts
- check-build.sh
- CLAUDE.md
- README.md
- CREDITS.md
- CREDITS.md
- CREDITS.md
- CREDITS.md
- CREDITS.md
- extraction-spec.md
- CREDITS.md
- CREDITS.md
- CREDITS.md
- CREDITS.md
- CREDITS.md
- eval.ts
- new-func.ts
- no-unnecessary-type-assertion.ts
- restricted-node.ts
- read
- second
- ready
- runtime
- runtime
- client
- broken
- broken

## God Nodes (most connected - your core abstractions)
1. `CheckSkillTests` - 37 edges
2. `build_valid_repo()` - 32 edges
3. `Checker` - 26 edges
4. `write()` - 24 edges
5. `check_repo()` - 17 edges
6. `Electron best practices` - 17 edges
7. `YamlParser` - 16 edges
8. `interface` - 14 edges
9. `Beautiful Electron` - 14 edges
10. `compilerOptions` - 13 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (143 total, 56 thin omitted)

### Community 0 - "Path"
Cohesion: 0.11
Nodes (25): Exception, check_repo(), Checker, _fold_block(), format_problem(), _is_relative(), _json_key_line(), main() (+17 more)

### Community 1 - "CheckSkillTests"
Cohesion: 0.16
Nodes (10): add_portable_plugin(), build_valid_repo(), CheckSkillTests, error_messages(), formatted(), load_checker(), png_header(), portable_with() (+2 more)

### Community 2 - "Electron best practices"
Cohesion: 0.04
Nodes (38): Added, Changelog, [Unreleased], Contributing, Good first contributions, License, Making a change, Style (+30 more)

### Community 3 - "check-examples.py"
Cohesion: 0.13
Nodes (33): apply_harness(), as_text(), Block, build_project(), check_brackets(), check_quotes(), check_repo(), doc_files() (+25 more)

### Community 4 - "interface"
Cohesion: 0.07
Nodes (29): author, name, url, interface, publication, description, extensions, com.openai (+21 more)

### Community 5 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 6 - "NotesViewModel"
Cohesion: 0.11
Nodes (10): ALLOWED_TYPES, handleRpc(), notes, reject(), InMemoryNotes, Note, NotesPort, NotesViewModel (+2 more)

### Community 7 - "GateScript"
Cohesion: 0.09
Nodes (10): load_script(), Shared helpers for the beautifulelectron test suites., Load a repo script (e.g. "check-examples.py") as a module by file path., ConfigPairing, explicit_rules(), GateScript, HarnessCoverage, marker_names() (+2 more)

### Community 8 - "test_repo_gates.py"
Cohesion: 0.12
Nodes (10): CompletedProcess, BuildGate, CiJobs, ExamplesLedger, Gates, _load(), ManifestPairing, Path (+2 more)

### Community 9 - "Beautiful Electron"
Cohesion: 0.12
Nodes (17): A worked example, Agent kit (Claude Code), Any agent, Beautiful Electron, Claude Code, Contributing, Install, License (+9 more)

### Community 10 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, noUncheckedIndexedAccess, outDir, rootDir (+6 more)

### Community 11 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, baseUrl, lib, module, moduleResolution, noEmit, noUncheckedIndexedAccess, paths (+6 more)

### Community 12 - "package.json"
Cohesion: 0.14
Nodes (13): description, devDependencies, electron, @types/node, typescript, main, name, private (+5 more)

### Community 13 - "package.json"
Cohesion: 0.14
Nodes (13): description, devDependencies, eslint, @eslint-community/eslint-plugin-eslint-comments, @eslint/js, typescript, typescript-eslint, name (+5 more)

### Community 14 - "Electron security digest"
Cohesion: 0.17
Nodes (11): 10. Auth and update trust, 1. Threat model (condensed), 2. Renderer hardening defaults (mandatory), 3. Content Security Policy, 4. Navigation lockdown, 5. Fuses and ASAR integrity, 6. Secrets and `safeStorage`, 7. IPC and bridge hardening (+3 more)

### Community 15 - "Electron platform digest"
Cohesion: 0.18
Nodes (10): 1. Runtime facts, 2. Process model, 3. App lifecycle and OS events, 4. Windows and WebContents essentials, 5. Linux display servers and desktop, 6. Per-OS capability matrix (condensed from the playbook), 7. Packaging matrix and support policy, 8. Electron upgrade routine (condensed) (+2 more)

### Community 16 - "2. Legacy Electron to Electron 45 mapping"
Cohesion: 0.18
Nodes (11): 2.10 Other common legacy APIs, 2.1 `nodeIntegration: true`, disabled `contextIsolation`/`sandbox`, 2.2 The `remote` module, 2.3 `ipcRenderer.sendSync` and `event.returnValue`, 2.4 `file://` app content, 2.5 In-app login (`BrowserWindow` to the IdP, `<webview>` logins), 2.6 `localStorage`, IndexedDB and other renderer storage, 2.7 Generic IPC (`invoke(channel, …)`, ad-hoc string channels, dynamic payloads) (+3 more)

### Community 17 - "BestPractices"
Cohesion: 0.29
Nodes (4): BestPractices, bp_body(), ReviewSkill, rv_body()

### Community 18 - "2. Categories, in ranking order"
Cohesion: 0.20
Nodes (10): 2. Categories, in ranking order, Accessibility and i18n, Architecture contracts (always Must fix, ranked first), IPC and preload, Navigation and content loading, Packaging and updates, Performance, Secrets and auth (+2 more)

### Community 19 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 21 - "<app> IPC Surface Reviewer Agent"
Cohesion: 0.29
Nodes (6): <app> IPC Surface Reviewer Agent, Core Mission, Expertise Areas, Guiding Principles, Output Format, Quality Standards

### Community 22 - "<app> Packaging Updater Reviewer Agent"
Cohesion: 0.29
Nodes (6): <app> Packaging Updater Reviewer Agent, Core Mission, Expertise Areas, Guiding Principles, Output Format, Quality Standards

### Community 23 - "<app> Renderer Security Reviewer Agent"
Cohesion: 0.29
Nodes (6): <app> Renderer Security Reviewer Agent, Core Mission, Expertise Areas, Guiding Principles, Output Format, Quality Standards

### Community 24 - "`<app>` Renderer UI Reviewer"
Cohesion: 0.29
Nodes (6): `<app>` Renderer UI Reviewer, Core Mission, Expertise Areas, Guiding Principles, Output Format, Quality Standards

### Community 25 - "<app> Architect Agent"
Cohesion: 0.29
Nodes (6): <app> Architect Agent, Core Mission, Expertise Areas, Guiding Principles, Output Format, Quality Standards

### Community 26 - "<app> Build Resolver Agent"
Cohesion: 0.29
Nodes (6): <app> Build Resolver Agent, Core Mission, Expertise Areas, Guiding Principles, Output Format, Quality Standards

### Community 27 - "<app> Code Explorer Agent"
Cohesion: 0.29
Nodes (6): <app> Code Explorer Agent, Core Mission, Expertise Areas, Guiding Principles, Output Format, Quality Standards

### Community 28 - "<app> Code Reviewer Agent"
Cohesion: 0.29
Nodes (6): <app> Code Reviewer Agent, Core Mission, Expertise Areas, Guiding Principles, Output Format, Quality Standards

### Community 29 - "<app> Planner Agent"
Cohesion: 0.29
Nodes (6): <app> Planner Agent, Core Mission, Expertise Areas, Guiding Principles, Output Format, Quality Standards

### Community 30 - "<app> TDD Guide Agent"
Cohesion: 0.29
Nodes (6): <app> TDD Guide Agent, Core Mission, Expertise Areas, Guiding Principles, Output Format, Quality Standards

### Community 31 - "<app> Electron Security Reviewer Agent"
Cohesion: 0.29
Nodes (6): <app> Electron Security Reviewer Agent, Core Mission, Expertise Areas, Guiding Principles, Output Format, Quality Standards

### Community 32 - "<app> Test Author Agent"
Cohesion: 0.29
Nodes (6): <app> Test Author Agent, Core Mission, Expertise Areas, Guiding Principles, Output Format, Quality Standards

### Community 33 - "<app> Add Slice"
Cohesion: 0.29
Nodes (6): <app> Add Slice, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 34 - "<app> Claim Check skill"
Cohesion: 0.29
Nodes (6): <app> Claim Check skill, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 35 - "<app> Clean-Room Rebuild skill"
Cohesion: 0.29
Nodes (6): <app> Clean-Room Rebuild skill, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 36 - "<app> Corpus Retrieval skill"
Cohesion: 0.29
Nodes (6): <app> Corpus Retrieval skill, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 37 - "<app> Diagnosing Bugs skill"
Cohesion: 0.29
Nodes (6): <app> Diagnosing Bugs skill, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 38 - "<app> Domain Modeling skill"
Cohesion: 0.29
Nodes (6): <app> Domain Modeling skill, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 39 - "<app> Electron Security Check"
Cohesion: 0.29
Nodes (6): <app> Electron Security Check, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 40 - "<app> Electron Upgrade"
Cohesion: 0.29
Nodes (6): <app> Electron Upgrade, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 41 - "<app> Grilling skill"
Cohesion: 0.29
Nodes (6): <app> Grilling skill, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 42 - "<app> Learn"
Cohesion: 0.29
Nodes (6): <app> Learn, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 43 - "<app> New IPC Channel"
Cohesion: 0.29
Nodes (6): <app> New IPC Channel, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 44 - "<app> New Policy Key"
Cohesion: 0.29
Nodes (6): <app> New Policy Key, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 45 - "`<app>` perf-regression skill"
Cohesion: 0.29
Nodes (6): `<app>` perf-regression skill, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 46 - "<app> Plan"
Cohesion: 0.29
Nodes (6): <app> Plan, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 47 - "<app> Research skill"
Cohesion: 0.29
Nodes (6): <app> Research skill, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 48 - "<app> Review"
Cohesion: 0.29
Nodes (6): <app> Review, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 49 - "<app> Ship"
Cohesion: 0.29
Nodes (6): <app> Ship, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 50 - "<app> Spec"
Cohesion: 0.29
Nodes (6): <app> Spec, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 51 - "<app> Storage Migration"
Cohesion: 0.29
Nodes (6): <app> Storage Migration, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 52 - "<app> Test-Driven Development skill"
Cohesion: 0.29
Nodes (6): <app> Test-Driven Development skill, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 53 - "<app> Verified Status skill"
Cohesion: 0.29
Nodes (6): <app> Verified Status skill, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 54 - "<app> Visual Review skill"
Cohesion: 0.29
Nodes (6): <app> Visual Review skill, Core Principles, Output Format, Research References, Rules, When to Activate

### Community 55 - "ambient.d.ts"
Cohesion: 0.29
Nodes (3): electron, node:fs, react

### Community 56 - "TypeScript strict digest"
Cohesion: 0.29
Nodes (6): 1. Compiler settings, 2. Branded ids and route values, 3. Boundary types, 4. Lint expectations (from the drop-in config), 5. Zod and generation, TypeScript strict digest

### Community 57 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 59 - "The report"
Cohesion: 0.33
Nodes (6): Must fix, Notes, Should fix, The report, Verdict, Waived gates

### Community 60 - "build"
Cohesion: 0.53
Nodes (5): build(), main(), package_files(), Path, Files to package, relative to root, in a stable order.

### Community 61 - "Electron port"
Cohesion: 0.33
Nodes (6): 1. The order of work, 3. Web, Tauri and Qt to Electron, 4. Behavior parity checklist, 5. What not to do, 6. Cross-skill contract, Electron port

### Community 62 - "Electron review"
Cohesion: 0.33
Nodes (6): 1. Report shape, 3. Waived gates, 4. How to review, 5. Worked example, 6. Cross-skill contract, Electron review

### Community 63 - "The minimal example"
Cohesion: 0.40
Nodes (5): Layout, Run the gates, The minimal example, What it does not do, What it proves

### Community 64 - "beautifulelectron — agent instructions"
Cohesion: 0.50
Nodes (3): beautifulelectron — agent instructions, graphify, Model routing (Claude Code + Ollama)

### Community 65 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 66 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 67 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 69 - "check-lints.sh"
Cohesion: 0.83
Nodes (3): bounded(), fail(), check-lints.sh script

### Community 70 - "guard-bash.sh"
Cohesion: 0.83
Nodes (3): has(), has_i(), guard-bash.sh script

## Knowledge Gaps
- **452 isolated node(s):** `name`, `version`, `private`, `description`, `main` (+447 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `render()` connect `check-examples.py` to `Path`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `Beautiful Electron` connect `Beautiful Electron` to `Electron best practices`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _469 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Path` be split into smaller, more focused modules?**
  _Cohesion score 0.10615079365079365 - nodes in this community are weakly interconnected._
- **Should `Electron best practices` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `check-examples.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1319073083778966 - nodes in this community are weakly interconnected._
- **Should `interface` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._