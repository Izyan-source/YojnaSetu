import json
import unittest
from pathlib import Path

from app.eligibility import (
    FAIL,
    NOT_ELIGIBLE,
    PASS,
    POTENTIALLY_ELIGIBLE,
    UNDETERMINED,
    UNKNOWN,
    evaluate_rule,
    evaluate_scheme,
)


def rule(operator, attribute="value", expected=10):
    return {
        "rule_id": "test_rule",
        "label": "A test rule",
        "attribute": attribute,
        "operator": operator,
        "value": expected,
        "mandatory": True,
    }


class RuleEvaluationTests(unittest.TestCase):
    def test_minimum_age_rule_passes_at_boundary(self):
        self.assertEqual(evaluate_rule(rule("min", "age", 18), {"age": 18})["status"], PASS)

    def test_maximum_income_rule_fails_above_boundary(self):
        self.assertEqual(evaluate_rule(rule("max", "income", 350000), {"income": 350001})["status"], FAIL)

    def test_equals_rule_passes_case_insensitively(self):
        self.assertEqual(evaluate_rule(rule("equals", "occupation", "student"), {"occupation": "Student"})["status"], PASS)

    def test_in_rule_supports_education_or_occupation_options(self):
        self.assertEqual(evaluate_rule(rule("in", "school_type", ["government", "government_aided"]), {"school_type": "Government"})["status"], PASS)

    def test_occupation_rule_passes_for_matching_occupation(self):
        self.assertEqual(evaluate_rule(rule("equals", "occupation", "Student"), {"occupation": "Student"})["status"], PASS)

    def test_education_level_rule_supports_allowed_values(self):
        self.assertEqual(evaluate_rule(rule("in", "education_level", ["Secondary", "Higher secondary"]), {"education_level": "Secondary"})["status"], PASS)

    def test_state_in_rule_fails_for_out_of_scope_state(self):
        self.assertEqual(evaluate_rule(rule("state_in", "state", ["Assam", "Meghalaya"]), {"state": "Kerala"})["status"], FAIL)

    def test_missing_attribute_is_unknown(self):
        result = evaluate_rule(rule("min", "age", 18), {})
        self.assertEqual(result["status"], UNKNOWN)
        self.assertIn("not provided", result["explanation"])

    def test_explicit_none_is_unknown(self):
        self.assertEqual(evaluate_rule(rule("equals", "gender", "female"), {"gender": None})["status"], UNKNOWN)

    def test_unknown_operator_is_not_treated_as_pass(self):
        self.assertEqual(evaluate_rule(rule("unimplemented", "age", 18), {"age": 20})["status"], UNKNOWN)


class SchemeOutcomeTests(unittest.TestCase):
    def setUp(self):
        self.scheme = {
            "scheme_id": "test-scheme",
            "name": "Test scheme",
            "official_source_url": "https://example.gov.in/scheme",
            "source_verification_status": "official_source_checked",
            "required_documents": ["Identity document"],
            "documents_note": "Check official instructions.",
            "eligibility_rules": [rule("min", "age", 18)],
        }

    def test_all_mandatory_rules_pass_is_potentially_eligible(self):
        result = evaluate_scheme(self.scheme, {"age": 22})
        self.assertEqual(result["status"], POTENTIALLY_ELIGIBLE)
        self.assertEqual(result["rule_results"][0]["status"], PASS)

    def test_failed_mandatory_rule_is_not_eligible_even_if_another_rule_is_unknown(self):
        scheme = dict(self.scheme)
        scheme["eligibility_rules"] = [
            rule("min", "age", 18),
            dict(rule("equals", "citizen", True), rule_id="citizenship"),
        ]
        result = evaluate_scheme(scheme, {"age": 16})
        self.assertEqual(result["status"], NOT_ELIGIBLE)
        self.assertEqual([item["status"] for item in result["rule_results"]], [FAIL, UNKNOWN])

    def test_missing_mandatory_rule_is_undetermined(self):
        self.assertEqual(evaluate_scheme(self.scheme, {})["status"], UNDETERMINED)

    def test_document_readiness_is_separate_from_eligibility(self):
        result = evaluate_scheme(self.scheme, {"age": 22})
        self.assertEqual(result["status"], POTENTIALLY_ELIGIBLE)
        self.assertEqual(result["document_readiness"]["status"], "NOT_ASSESSED")
        self.assertEqual(result["document_readiness"]["required_documents"], ["Identity document"])

    def test_dataset_has_consistent_required_fields_and_official_sources(self):
        data_path = Path(__file__).resolve().parents[1] / "data" / "schemes.json"
        schemes = json.loads(data_path.read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(schemes), 5)
        required_fields = {
            "scheme_id", "name", "department", "applicability", "category", "description",
            "official_source_url", "source_verification_status", "eligibility_rules",
            "required_documents", "documents_status",
        }
        for scheme in schemes:
            self.assertTrue(required_fields.issubset(scheme))
            self.assertTrue(scheme["official_source_url"].startswith("https://"))


if __name__ == "__main__":
    unittest.main()
