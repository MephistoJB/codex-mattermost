from __future__ import annotations

import importlib.util
import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "plugins" / "mattermost-workflows"
SKILL = PLUGIN / "skills" / "mattermost-workflows"
MANIFEST = PLUGIN / ".codex-plugin" / "plugin.json"
MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"
TEST_CASES = ROOT / "submission" / "test-cases.json"
ATTRIBUTION = (
    "Based on Mattermost Workflows for Codex by Nikolai Shangin "
    "(shanginn@gmail.com)."
)


def load_url_helper():
    path = SKILL / "scripts" / "check_mattermost_url.py"
    spec = importlib.util.spec_from_file_location("check_mattermost_url", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ManifestTests(unittest.TestCase):
    def setUp(self) -> None:
        self.manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    def test_required_identity_and_version(self) -> None:
        self.assertEqual(self.manifest["name"], "mattermost-workflows")
        self.assertRegex(self.manifest["version"], r"^\d+\.\d+\.\d+$")
        self.assertEqual(self.manifest["author"]["name"], "Nikolai Shangin")
        self.assertEqual(self.manifest["author"]["email"], "shanginn@gmail.com")
        self.assertEqual(
            self.manifest["license"], "LicenseRef-Shangin-Attribution-1.0"
        )

    def test_manifest_paths_exist(self) -> None:
        self.assertTrue((PLUGIN / self.manifest["skills"]).is_dir())
        interface = self.manifest["interface"]
        for field in ("composerIcon", "logo", "logoDark"):
            self.assertTrue((PLUGIN / interface[field]).is_file(), field)

    def test_starter_prompts_are_marketplace_safe(self) -> None:
        prompts = self.manifest["interface"]["defaultPrompt"]
        self.assertEqual(len(prompts), 3)
        self.assertTrue(all(isinstance(prompt, str) for prompt in prompts))
        self.assertTrue(all(1 <= len(prompt) <= 128 for prompt in prompts))

    def test_marketplace_points_to_plugin(self) -> None:
        marketplace = json.loads(MARKETPLACE.read_text(encoding="utf-8"))
        entry = marketplace["plugins"][0]
        self.assertEqual(entry["name"], self.manifest["name"])
        self.assertEqual(entry["source"]["path"], "./plugins/mattermost-workflows")
        self.assertEqual(entry["policy"]["installation"], "AVAILABLE")
        self.assertEqual(entry["policy"]["authentication"], "ON_INSTALL")


class SkillSafetyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.skill_text = (SKILL / "SKILL.md").read_text(encoding="utf-8")

    def test_frontmatter_and_name(self) -> None:
        self.assertTrue(self.skill_text.startswith("---\n"))
        self.assertRegex(self.skill_text, r"(?m)^name: mattermost-workflows$")
        self.assertRegex(self.skill_text, r"(?m)^description: .{80,}$")

    def test_write_requires_exact_explicit_approval(self) -> None:
        lowered = self.skill_text.lower()
        self.assertIn("explicit approval", lowered)
        self.assertIn("exact channel", lowered)
        self.assertIn("exact draft", lowered)
        self.assertIn("create_post", self.skill_text)

    def test_unsafe_capabilities_are_excluded(self) -> None:
        lowered = self.skill_text.lower()
        for phrase in (
            "never use `create_post_as_user`",
            "impersonation",
            "never ask the user to paste a personal access token",
            "do not silently search unrelated teams or channels",
        ):
            self.assertIn(phrase, lowered)

    def test_no_placeholders_remain(self) -> None:
        for path in ROOT.rglob("*"):
            if path.is_file() and path.suffix.lower() in {".md", ".json", ".yaml"}:
                self.assertNotIn("[TODO:", path.read_text(encoding="utf-8"), str(path))


class DocumentationTests(unittest.TestCase):
    def test_bilingual_pairs_exist(self) -> None:
        pairs = (
            ("README.md", "README.ru.md"),
            ("PRIVACY.md", "PRIVACY.ru.md"),
            ("TERMS.md", "TERMS.ru.md"),
            ("SUPPORT.md", "SUPPORT.ru.md"),
            ("CONTRIBUTING.md", "CONTRIBUTING.ru.md"),
            ("docs/MVP.md", "docs/MVP.ru.md"),
            ("docs/SETUP.md", "docs/SETUP.ru.md"),
            ("submission/listing.en.md", "submission/listing.ru.md"),
            ("submission/release-notes.en.md", "submission/release-notes.ru.md"),
            ("submission/test-cases.en.md", "submission/test-cases.ru.md"),
        )
        for english, russian in pairs:
            self.assertTrue((ROOT / english).is_file(), english)
            self.assertTrue((ROOT / russian).is_file(), russian)

    def test_attribution_is_prominent(self) -> None:
        self.assertIn(ATTRIBUTION, (ROOT / "LICENSE").read_text(encoding="utf-8"))
        self.assertIn(ATTRIBUTION, (ROOT / "README.md").read_text(encoding="utf-8"))
        self.assertIn(ATTRIBUTION, (ROOT / "NOTICE").read_text(encoding="utf-8"))

    def test_submission_case_counts(self) -> None:
        cases = json.loads(TEST_CASES.read_text(encoding="utf-8"))
        self.assertEqual(len(cases["positive"]), 5)
        self.assertEqual(len(cases["negative"]), 3)
        ids = [case["id"] for group in cases.values() for case in group]
        self.assertEqual(len(ids), len(set(ids)))


class EndpointHelperTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.helper = load_url_helper()

    def test_derives_production_endpoint(self) -> None:
        self.assertEqual(
            self.helper.derive_endpoint("https://chat.example.com/"),
            "https://chat.example.com/plugins/mattermost-ai/mcp-server/mcp",
        )

    def test_preserves_full_endpoint(self) -> None:
        endpoint = "https://chat.example.com/plugins/mattermost-ai/mcp-server/mcp"
        self.assertEqual(self.helper.derive_endpoint(endpoint), endpoint)

    def test_rejects_insecure_production_url(self) -> None:
        with self.assertRaisesRegex(ValueError, "must use HTTPS"):
            self.helper.derive_endpoint("http://chat.example.com")

    def test_allows_local_http_development(self) -> None:
        self.assertEqual(
            self.helper.derive_endpoint("http://localhost:8065"),
            "http://localhost:8065/plugins/mattermost-ai/mcp-server/mcp",
        )

    def test_rejects_relative_url(self) -> None:
        with self.assertRaisesRegex(ValueError, "absolute"):
            self.helper.derive_endpoint("chat.example.com")


if __name__ == "__main__":
    unittest.main()
