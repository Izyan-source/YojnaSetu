import unittest

from fastapi import HTTPException
from pydantic import ValidationError

from app.main import check_document_consistency, check_eligibility, get_scheme, list_schemes
from app.models import ConsistencyCheckRequest, EligibilityCheckRequest


class SchemeApiTests(unittest.TestCase):
    def test_list_endpoint_returns_all_dataset_entries(self):
        records = list_schemes()
        self.assertEqual(len(records), 5)
        self.assertTrue(all(record["official_source_url"].startswith("https://") for record in records))

    def test_detail_endpoint_returns_record_by_id(self):
        result = get_scheme("atal-pension-yojana")
        self.assertEqual(result["name"], "Atal Pension Yojana (APY)")

    def test_detail_endpoint_returns_not_found_for_unknown_id(self):
        with self.assertRaises(HTTPException) as raised:
            get_scheme("missing-scheme")
        self.assertEqual(raised.exception.status_code, 404)

    def test_eligibility_endpoint_returns_rule_and_document_results(self):
        request = EligibilityCheckRequest(profile={
            "state": "Delhi",
            "age": 29,
            "annual_family_income_inr": 300000,
            "education_level": "Undergraduate",
            "occupation": "Employed",
        })
        response = check_eligibility(request)
        self.assertEqual(len(response["results"]), 5)
        apy = next(item for item in response["results"] if item["scheme_id"] == "atal-pension-yojana")
        self.assertEqual(apy["status"], "UNDETERMINED")
        self.assertEqual(apy["document_readiness"]["status"], "NOT_ASSESSED")
        self.assertTrue(apy["source_references"][0]["url"].startswith("https://"))

    def test_eligibility_endpoint_can_evaluate_only_selected_scheme_with_missing_values(self):
        request = EligibilityCheckRequest(profile={}, scheme_id="atal-pension-yojana")
        response = check_eligibility(request)
        self.assertEqual(len(response["results"]), 1)
        self.assertEqual(response["results"][0]["status"], "UNDETERMINED")
        self.assertTrue(all(rule["status"] == "UNKNOWN" for rule in response["results"][0]["rule_results"]))

    def test_consistency_endpoint_returns_findings_for_confirmed_profile_and_ocr_data(self):
        request = ConsistencyCheckRequest(
            profile={"applicant_name": "Asha Kumari"},
            documents=[{"filename": "id.pdf", "extracted_fields": {
                "applicant_name": {"value": "Asha Kumari", "confidence": 0.9, "source_page": 1}
            }}],
        )
        response = check_document_consistency(request)
        finding = next(item for item in response["findings"] if item["field"] == "applicant_name")
        self.assertEqual(finding["status"], "CONSISTENT")
        self.assertEqual(finding["values"][1]["source"], "id.pdf · page 1")

    def test_profile_validation_rejects_out_of_range_age(self):
        with self.assertRaises(ValidationError):
            EligibilityCheckRequest(profile={"age": 121})


if __name__ == "__main__":
    unittest.main()
