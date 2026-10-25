import unittest
import asyncio
import io

import fitz
from starlette.datastructures import Headers, UploadFile

from app.documents import DocumentAnalysisError, analyze_document, extract_fields
from app.main import analyze_uploaded_document


class DocumentExtractionTests(unittest.TestCase):
    def test_extracts_embedded_pdf_text_without_ocr(self):
        pdf = fitz.open()
        page = pdf.new_page()
        page.insert_text((72, 72), "Applicant Name: Asha Kumari\nDOB: 12/04/1998\nAnnual family income: INR 240000\nMaharashtra State")
        content = pdf.tobytes()
        pdf.close()
        result = analyze_document("application.pdf", "application/pdf", content)
        self.assertEqual(result["extraction_methods"], ["PDF text extraction"])
        self.assertEqual(result["extracted_fields"]["applicant_name"]["value"], "Asha Kumari")
        self.assertIn("does not verify document authenticity", result["authenticity_notice"])

    def test_upload_endpoint_analyzes_multipart_file_and_closes_it(self):
        pdf = fitz.open()
        page = pdf.new_page()
        page.insert_text((72, 72), "Applicant Name: Asha Kumari")
        upload = UploadFile(
            filename="application.pdf",
            file=io.BytesIO(pdf.tobytes()),
            headers=Headers({"content-type": "application/pdf"}),
        )
        pdf.close()
        result = asyncio.run(analyze_uploaded_document(upload))
        self.assertEqual(result["extracted_fields"]["applicant_name"]["value"], "Asha Kumari")
        self.assertTrue(upload.file.closed)

    def test_extracts_labelled_values_with_page_and_confidence(self):
        pages = ["Applicant Name: Asha Kumari\nDOB: 12/04/1998\nAnnual family income: Rs. 240,000\nState: Maharashtra", "Income Certificate\nCertificate No: MH-INC-2045"]
        fields, warnings = extract_fields(pages)
        self.assertEqual(fields["applicant_name"]["value"], "Asha Kumari")
        self.assertEqual(fields["applicant_name"]["source_page"], 1)
        self.assertGreater(fields["date_of_birth"]["confidence"], 0)
        self.assertEqual(fields["annual_family_income_inr"]["value"], "240000")
        self.assertEqual(fields["state"]["value"], "Maharashtra")
        self.assertEqual(fields["certificate_number"]["value"], "MH-INC-2045")
        self.assertTrue(any("address" in warning for warning in warnings))

    def test_rejects_empty_oversized_and_unsupported_files(self):
        cases = [
            ("scan.gif", "image/gif", b"content"),
            ("scan.png", "image/png", b""),
            ("large.jpg", "image/jpeg", b"x" * (10 * 1024 * 1024 + 1)),
        ]
        for filename, content_type, content in cases:
            with self.subTest(filename=filename), self.assertRaises(DocumentAnalysisError):
                analyze_document(filename, content_type, content)


if __name__ == "__main__":
    unittest.main()
