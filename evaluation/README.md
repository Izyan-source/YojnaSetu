# Reproducible research evaluation

This directory evaluates existing components; it does not change the application or make official eligibility decisions. All applicant/document fixtures are synthetic. The official RAG evidence is read only from the existing local index.

## Run

From the repository root, using the existing backend environment and Node.js:

```sh
backend/.venv/bin/python -m unittest discover -s evaluation/tests -v
backend/.venv/bin/python evaluation/run.py
```

Alternatively activate the existing environment and use `python evaluation/run.py`. No additional packages are required beyond the application's dependencies. Python evaluates the real backend functions; Node imports the production frontend explanation builder. Missing optional dependencies are reported rather than replaced with mocks or fabricated scores.

Outputs default to `evaluation/results/latest/`. To keep a separate run, use `--output evaluation/results/run-name`. Output paths must stay beneath `evaluation/results/`. Exit code **1** means at least one measured expectation failed or an evaluation errored. Exit code **0** means no measured failures, but can still include skipped experiments: always inspect `execution_summary` and the report. A research finding is intentionally not patched away merely to get a zero exit code.

RAG execution is offline (`HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`), in a subprocess with a 120-second limit. The local model must already be cached, and its configured identity must match the index manifest. The evaluation does not download models, rebuild the index, change similarity thresholds, or update official sources. See the application's existing setup instructions if an index is unavailable. A missing index/model skips retrieval quality evaluation; it does not count as correct abstention. The official index currently covers only three of the five scheme records.

OCR requires the existing Tesseract executable and English language data. Raster image scores are skipped when it is unavailable, while native PDF extraction is measured separately if its dependencies exist. The simple PDF/PNG worksheets contain conspicuous synthetic labels, no official logos, and no real identity numbers. They are not representative of real identity documents.

## Files and ground truth

- `cases/eligibility.json`: 45 manually specified profiles, exact overall labels and per-rule labels across all five actual schemes. Includes inclusive boundaries, zero, null/missing values, boolean false, categorical normalization, contradictory qualifying/excluding facts, and mandatory failure with unknown facts. No new production rules are introduced.
- `cases/documents.json`: four hand-labeled text worksheets, 11 target fields each, including absent fields. Expected age values use **2026-10-26**. Only the evaluation process's date dependencies are patched to this fixed date, making age and expiry behavior repeatable without changing production code.
- `cases/consistency.json`: 16 known field-level scenarios, including equivalent formatting, conflicting high-confidence values, missing data, invalid dates, and the existing 0.7 confidence boundary. Only the declared target field is scored; other missing fields do not inflate the results.
- `cases/rag.json`: six answerable questions labeled from inspected official index passages and four unanswerable questions. Answer labels contain exact evidence text plus source URL, page and SHA-256 of the inspected chunk. No answer is inferred from a scheme record when the corresponding document is absent from the index. If pinned support changes, those cases are skipped for manual relabeling. The two absent-scheme negatives also require their scheme index to remain empty.
- `cases/integrated.json`: paired component scenarios with explicit simulated human confirmation. Original extracted values, reviewed profile values, and consistency findings remain separate. Unconfirmed OCR is never substituted. These are not browser, human-subject or deployment tests.
- `run.py`, `metrics.py`, `rag_worker.py`, `explain.mjs`: orchestration, transparent metric calculations, isolated real RAG execution, and the production JavaScript explanation bridge.
- `tests/test_metrics.py`: independent checks of confusion matrices, abstentions, zero denominators and precision/recall/F1.

Ground truth was curated by the implementer from the actual rules and indexed passages, not independently adjudicated. It is a small regression benchmark, not a held-out representative sample. Do not describe high scores as evidence of real-world population accuracy.

## Metrics and comparisons

Eligibility reports three-class accuracy and one-vs-rest precision/recall/F1 with UNKNOWN/UNDETERMINED kept separate. Rule-level metrics are separate from applicant classifications. Undefined ratios are `null`; macro-F1 averages only classes with gold support.

Extraction reports exact accuracy over populated fields, accuracy including absent fields, and false extraction rates on absent fields. The values being compared are production-normalized outputs against explicitly labeled normalized strings; the evaluator performs no additional fuzzy matching. Text-PDF scores must never be reported as OCR scores.

Consistency reports four-class metrics. Confident mismatch detection precision/recall/F1 uses only known CONSISTENT/POTENTIAL_MISMATCH examples; missing and low-confidence cases are separately scored. A predicted abstention on a known mismatch is still a missed detection, not silently dropped.

RAG reports labeled evidence hit@4, exact answer-span containment, supported answer success, citation provenance precision, and correct abstention. Citation provenance compares every returned citation to the actual retained retrieved chunks, including source URL, title, page, scheme and excerpt. It does not establish relevance: a citation can be valid while the question remains unanswered. Exact expected-span matching is a strict extractive proxy, not a general semantic correctness score. Raw responses and actual retrieval results are retained for independent review.

The paired comparison evaluates profile-only labels before confirmation and integrated labels after explicitly specified confirmation. Those information conditions differ, so neither equal nor different accuracies establish superiority. RAG-only answers a related source question and receives QA metrics; no applicant classification score is manufactured for RAG. Integrated explanation checks are narrow invariants, not full semantic or human usability evaluation.

## Artifacts and reproducibility

- `results.json`: all labels, observed outputs, metrics, counts, errors/skips, Python/package/Node information, fixed clock, and SHA-256 of case files, production logic, evaluation scripts and index files.
- `report.md`: generated methodology, measured metrics, approach comparison, failures, skips and proposed-only extensions.
- `rag-execution.json`: real model responses and retrieved chunks, with model identity and threshold.
- `artifacts/`: generated synthetic PDFs and PNGs, ignored by Git and safely regenerated.
- `rag-worker.log`: optional model-runtime diagnostics, ignored by Git.

Scores and reports are computed from execution, never stored as expected numeric scores. Outputs are overwritten only in the chosen evaluation result directory. For paper archival, retain the result JSON, cases, code revision, index hashes, model identifier and package versions. This does not guarantee byte-identical model execution on different hardware. An independent human relevance audit, larger held-out corpus, multilingual/degraded scans, and a real-user workflow study remain proposed experiments, not measured results.
