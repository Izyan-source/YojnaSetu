# YojnaSetu executed evaluation

Generated: 2026-10-26T09:34:50.865011+00:00

## Methodology

Curated synthetic component regression study against the existing implementation, not official eligibility validation or a representative population benchmark. Labels were explicitly authored before the scored run. No production rules, API contracts, datasets, UI, or documents were modified. No documents or models were downloaded.

Eligibility uses fixed applicant profiles and explicit per-rule/overall labels. UNKNOWN and UNDETERMINED are their own classes, not failures. Precision/recall/F1 are one-vs-rest; macro-F1 averages classes with gold support. Undefined denominators are JSON null, not a perfect score.

Document truth is manually specified for all 11 fields in four simple synthetic worksheets. Native PDF extraction and raster PNG OCR are separate experiments. Exact normalized-value matching is scored with null fields reported separately; blank fields cannot inflate populated-field accuracy. Age/expiry clocks are frozen only inside the evaluation process at 2026-10-26. No real identity material is used.

Consistency scores only the designated field in each case, avoiding inflation from unrelated missing fields. Low-confidence and missing-information states remain separate from confident mismatch detection.

RAG labels quote inspected passages from the existing official index and pin their URL, page, and chunk hash. Exact whitespace/case-normalized answer containment is a strict proxy, not semantic QA accuracy. Evidence hit@4 tests whether a returned excerpt contains the labeled support. Citation provenance verifies URL/page/title/scheme/excerpt against actual retrieved chunks, not factual correctness or relevance. Abstention tests include private facts unavailable in guidelines and two schemes absent from this index. Offline model failure is a skip, not successful abstention.

## Executed metrics

### Eligibility

Cases: 45; accuracy: 1.000; macro-F1: 1.000.

| Class | Gold n | Predicted n | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| POTENTIALLY_ELIGIBLE | 13 | 13 | 1.000 | 1.000 | 1.000 |
| NOT_ELIGIBLE | 23 | 23 | 1.000 | 1.000 | 1.000 |
| UNDETERMINED | 9 | 9 | 1.000 | 1.000 | 1.000 |

### Consistency

Cases: 16; accuracy: 1.000; macro-F1: 1.000.

| Class | Gold n | Predicted n | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| CONSISTENT | 5 | 5 | 1.000 | 1.000 | 1.000 |
| POTENTIAL_MISMATCH | 4 | 4 | 1.000 | 1.000 | 1.000 |
| MISSING_INFORMATION | 3 | 3 | 1.000 | 1.000 | 1.000 |
| UNABLE_TO_VERIFY | 4 | 4 | 1.000 | 1.000 | 1.000 |

Per-rule decisions: 205; accuracy: 1.000; gold counts: {'PASS': 153, 'FAIL': 23, 'UNKNOWN': 29}.

Confident mismatch subset: precision=1.000, recall=1.000, f1=1.000.

### pdf_text

Status: completed.

- documents_scored: 4
- documents_planned: 4
- fields_scored: 44
- all_field_exact_accuracy: 1.000
- populated_field_exact_accuracy: 1.000
- populated_fields: 23
- absent_fields: 21
- false_extractions_on_absent_fields: 0
- false_extraction_rate: 0.000

### ocr_png

Status: skipped.

- documents_scored: 0
- documents_planned: 4
- fields_scored: 0
- all_field_exact_accuracy: not measured / undefined
- populated_field_exact_accuracy: not measured / undefined
- populated_fields: 0
- absent_fields: 0
- false_extractions_on_absent_fields: 0
- false_extraction_rate: not measured / undefined

### RAG

Status: completed; planned questions: 10.

- answerable_n: 6
- unanswerable_n: 4
- gold_evidence_hit_at_4: 1.000
- strict_answer_match_rate: 1.000
- supported_answer_success_rate: 1.000
- appropriate_abstention_rate: 0.750
- citation_count: 24
- citation_provenance_precision: 1.000

## Approach comparison

| Approach | Eligible metric | Actual measurement |
|---|---|---|
| Profile-only rules | Classification against profile-only labels | 1.000 on 3 paired cases |
| RAG-only | Evidence support and abstention, not applicant classification | 1.000 supported-answer rate on the answerable QA subset |
| Integrated components | Classification after explicit confirmation, consistency and explanation invariants | 1.000 on paired cases; {'n': 12, 'passed': 12, 'rate': 1.0} |

Backend component composition, not a browser/user study. Scheme-specific baseline facts are supported by the API but not all current form fields. The same cases use different, explicitly recorded information before/after human confirmation, so these accuracy values do not establish superiority. RAG answers a related source question and is never used as an eligibility classifier. Consistency compares the original profile to extraction before confirmation.

## Failed, skipped, or errored evaluations

- rag/personal-status: failed labeled expectation; see results.json for expected and actual values.
- ocr_png/alpha: skipped — Tesseract OCR unavailable: tesseract is not installed or it's not in your PATH. See README file for more information.
- ocr_png/beta: skipped — Tesseract OCR unavailable: tesseract is not installed or it's not in your PATH. See README file for more information.
- ocr_png/gamma: skipped — Tesseract OCR unavailable: tesseract is not installed or it's not in your PATH. See README file for more information.
- ocr_png/no-fields: skipped — Tesseract OCR unavailable: tesseract is not installed or it's not in your PATH. See README file for more information.

## Limits and proposed experiments

- Small, hand-curated regression samples are deliberately boundary-heavy. High scores do not establish population accuracy, legal correctness, real document performance, or statistical superiority. No confidence intervals or significance claims are made.
- Boolean scheme conditions do not encode all underlying policy thresholds. The implemented integer-age rule is evaluated as written, not reconciled with more detailed official date-based wording.
- Synthetic clean text worksheets are easier than real scans; OCR is not measured when Tesseract is absent. Proposed only: multilingual, rotated, blurred and multi-page synthetic scans with independently annotated truth.
- The local index covers 3 official documents. Ingestion errors: [{"url": "https://dsel.education.gov.in/sites/default/files/NMMSS_Guidelines_22.pdf", "error": "HTTP Error 404: Not Found"}, {"url": "https://www.education.gov.in/sites/upload_files/mhrd/files/document-reports/PM_Vidyalaxmi_Scheme_Guidelines.pdf", "error": "HTTP Error 404: Not Found"}]. No absent reference answer was invented.
- QA wording and reference spans were curated by the implementer, not independently adjudicated or held out. Citation provenance alone is not answer support. Proposed only: blinded relevance annotation and a larger held-out question set.
- Integrated runs exercise real extraction, eligibility, consistency, and the production JavaScript explanation builder. They simulate explicit human confirmation, not human review quality, browser interactions, RAG overriding rules, or an end-to-end deployment.

## Reproduce

`backend/.venv/bin/python evaluation/run.py` from the repository root. Run metric checks with `backend/.venv/bin/python -m unittest discover -s evaluation/tests -v`. See evaluation/README.md for dependencies, artifact layout and exit codes.

Machine-readable outputs contain every executed case, labels, observed outputs, metric denominators, environment versions and input/code SHA-256 hashes. Generated artifacts are synthetic and isolated under evaluation/results/.
