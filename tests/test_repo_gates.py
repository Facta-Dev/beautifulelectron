#!/usr/bin/env python3
"""Gate tests: the repository's own validators must pass, and the repo gates
stay wired — the plugin manifests agree with skills/ both directions, the CI
jobs are present, the examples ledger points at real files with reasons, and
check-build.sh is runnable. Read-only on the real repo.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

ROOT_MANIFEST = REPO_ROOT / "plugin.json"
CLAUDE_MANIFEST = REPO_ROOT / ".claude-plugin" / "plugin.json"
CLAUDE_MARKET = REPO_ROOT / ".claude-plugin" / "marketplace.json"
AGENTS_MARKET = REPO_ROOT / ".agents" / "plugins" / "marketplace.json"
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "check.yml"
LEDGER = REPO_ROOT / "scripts" / "examples.json"
GROUNDED_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"


def run(*command: str) -> subprocess.CompletedProcess:
    return subprocess.run(command, cwd=REPO_ROOT, capture_output=True, text=True)


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def skill_dirs() -> list:
    base = REPO_ROOT / "skills"
    return sorted(
        child.name
        for child in base.iterdir()
        if child.is_dir() and (child / "SKILL.md").is_file()
    ) if base.is_dir() else []


class Gates(unittest.TestCase):
    def test_skill_validator_passes(self):
        result = run(sys.executable, "scripts/check-skill.py")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_examples_are_balanced(self):
        result = run(sys.executable, "scripts/check-examples.py")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


class ManifestPairing(unittest.TestCase):
    def test_skills_list_matches_folders_both_directions(self):
        claude = _load(CLAUDE_MANIFEST)
        listed = sorted(entry.removeprefix("./skills/") for entry in claude.get("skills", []))
        on_disk = skill_dirs()
        self.assertTrue(on_disk, "no skill folders with SKILL.md under skills/")
        self.assertEqual(listed, on_disk, "skills[] and skills/ folders have drifted")

    def test_root_and_claude_manifests_agree_on_name_version(self):
        root = _load(ROOT_MANIFEST)
        claude = _load(CLAUDE_MANIFEST)
        self.assertEqual(root.get("name"), claude.get("name"))
        self.assertEqual(root.get("version"), claude.get("version"))

    def test_marketplaces_name_the_plugin(self):
        name = _load(CLAUDE_MANIFEST).get("name")
        for market_path in (CLAUDE_MARKET, AGENTS_MARKET):
            market = _load(market_path)
            self.assertEqual(
                market.get("name"), name,
                "%s: name does not match plugin.json" % market_path,
            )
            for entry in market.get("plugins", []):
                self.assertEqual(
                    entry.get("name"), name,
                    "%s: plugins[] entry does not match plugin.json" % market_path,
                )

    def test_schema_pin(self):
        self.assertEqual(_load(ROOT_MANIFEST).get("$schema"), GROUNDED_SCHEMA)


class CiJobs(unittest.TestCase):
    def test_jobs_present(self):
        text = WORKFLOW.read_text(encoding="utf-8")
        for job in ("  check:", "  lints:", "  examples:", "  tests:"):
            self.assertIn(job, text)

    def test_gate_entrypoints_present(self):
        text = WORKFLOW.read_text(encoding="utf-8")
        for step in ("python3 scripts/check-skill.py",
                     "bash scripts/check-lints.sh",
                     "python3 scripts/check-examples.py",
                     "unittest discover",
                     "-s tests -t ."):
            self.assertIn(step, text)

    def test_node_toolchain_pinned(self):
        self.assertIn("actions/setup-node", WORKFLOW.read_text(encoding="utf-8"))

    def test_examples_gate_never_silently_downgrades(self):
        self.assertIn("--require-toolchain", WORKFLOW.read_text(encoding="utf-8"))


class ExamplesLedger(unittest.TestCase):
    def test_every_ledgered_path_exists_on_disk(self):
        data = _load(LEDGER)
        for path, entry in (data.get("files") or {}).items():
            self.assertIsInstance(entry, dict, "%s: entry must be an object" % path)
            self.assertTrue(
                (REPO_ROOT / path).is_file(),
                "ledgered path %s does not exist" % path,
            )

    def test_every_skip_has_a_nonempty_reason(self):
        data = _load(LEDGER)
        for path, entry in (data.get("files") or {}).items():
            blocks = entry.get("blocks")
            if not isinstance(blocks, dict):
                continue
            for key, spec in blocks.items():
                if not isinstance(spec, dict) or "skip" not in spec:
                    continue
                reason = str(spec.get("skip") or "").strip()
                self.assertTrue(
                    reason,
                    "%s block %s: skip is ledgered without a reason" % (path, key),
                )


@unittest.skipUnless(shutil.which("node") and shutil.which("npm"), "node/npm not installed")
class BuildGate(unittest.TestCase):
    def test_example_builds_when_node_is_present(self):
        result = run("bash", "scripts/check-build.sh")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
