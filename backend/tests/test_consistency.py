import unittest

from app.consistency import check_consistency, normalize_value


class ConsistencyTests(unittest.TestCase):
    def test_normalizes_case_spacing_dates_income_and_reference_formatting(self):
        self.assertEqual(normalize_value("applicant_name", "  ASHA   Kumari "), "asha kumari")
        self.assertEqual(normalize_value("date_of_birth", "12/04/1998"), "1998-04-12")
        self.assertEqual(normalize_value("annual_family_income_inr", "₹ 2,40,000"), "240000")
        self.assertEqual(normalize_value("certificate_number", "MH-INC / 2045"), "mhinc2045")

    def test_matching_document_values_are_consistent(self):
        result = check_consistency(
            {"applicant_name": "Asha Kumari", "date_of_birth": "1998-04-12"},
            [{"filename": "id.pdf", "extracted_fields": {
                "applicant_name": {"value": "  ASHA   KUMARI ", "confidence": 0.9, "source_page": 1},
                "date_of_birth": {"value": "12/04/1998", "confidence": 0.95, "source_page": 1},
            }}],
        )
        findings = {item["field"]: item for item in result["findings"]}
        self.assertEqual(findings["applicant_name"]["status"], "CONSISTENT")
        self.assertEqual(findings["date_of_birth"]["status"], "CONSISTENT")
        self.assertEqual(findings["applicant_name"]["values"][1]["source"], "id.pdf · page 1")

    def test_conflicting_high_confidence_values_are_potential_mismatch(self):
        result = check_consistency(
            {"certificate_number": "MH-INC-2045"},
            [{"filename": "income.pdf", "extracted_fields": {"certificate_number": {"value": "MH INC 2046", "confidence": 0.94}}}],
        )
        finding = next(item for item in result["findings"] if item["field"] == "certificate_number")
        self.assertEqual(finding["status"], "POTENTIAL_MISMATCH")
        self.assertTrue(finding["manual_review"])
        self.assertIn("not a finding of fraud", finding["explanation"])

    def test_low_confidence_conflict_is_unable_to_verify(self):
        result = check_consistency(
            {"state": "Maharashtra"},
            [{"filename": "scan.jpg", "extracted_fields": {"state": {"value": "Gujarat", "confidence": 0.42}}}],
        )
        finding = next(item for item in result["findings"] if item["field"] == "state")
        self.assertEqual(finding["status"], "UNABLE_TO_VERIFY")
        self.assertTrue(finding["manual_review"])

    def test_missing_values_are_not_mismatches(self):
        result = check_consistency(
            {"annual_family_income_inr": None},
            [{"filename": "form.pdf", "extracted_fields": {"annual_family_income_inr": {"value": None, "confidence": None}}}],
        )
        finding = next(item for item in result["findings"] if item["field"] == "annual_family_income_inr")
        self.assertEqual(finding["status"], "MISSING_INFORMATION")

    def test_expiry_is_flagged_only_for_explicit_valid_until_date(self):
        result = check_consistency({}, [{"filename": "certificate.pdf", "extracted_fields": {
            "certificate_valid_until": {"value": "2000-01-01", "confidence": 0.9}
        }}])
        self.assertEqual(len(result["expiry_reviews"]), 1)
        self.assertIn("no additional validity period was inferred", result["expiry_reviews"][0]["explanation"])


if __name__ == "__main__":
    unittest.main()
