# YojnaSetu

YojnaSetu is an AI-assisted government scheme discovery and application-readiness platform. This repository contains the application: a React + Vite frontend and an independent FastAPI backend.

## Requirements

- Node.js 18+ and npm
- Python 3.10+

## Run the backend

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload
```

The API runs at <http://127.0.0.1:8000>. Its health endpoint is <http://127.0.0.1:8000/api/health>.

The scheme dataset is in `backend/data/schemes.json`. Run the deterministic engine tests from `backend/` with the virtual environment activated:

```bash
python3 -m unittest discover -s tests -v
```

Available endpoints are `GET /api/schemes`, `GET /api/schemes/{scheme_id}`, `POST /api/eligibility/check`, `POST /api/ask`, `POST /api/documents/analyze`, and `POST /api/documents/consistency-check`.

Document analysis is available at `POST /api/documents/analyze` as a multipart form upload with field name `file`. Supported formats are PDF, PNG, JPG, and JPEG; uploads are limited to 10 MB and PDFs to 20 pages. Files are analyzed in memory and are not kept as application records. OCR text is only an extraction aid and does not verify authenticity or eligibility.

Cross-document consistency review is available at `POST /api/documents/consistency-check`. Send a reviewed `profile` object and a `documents` array containing each filename and the original `extracted_fields` returned by document analysis. Results are informational and do not affect eligibility outcomes.

### OCR system dependency

Install Tesseract separately from Python packages:

```bash
# macOS (Homebrew)
brew install tesseract

# Debian or Ubuntu
sudo apt-get install tesseract-ocr
```

Text-based PDFs can be read without OCR; scanned PDF pages and images use Tesseract. If the executable is unavailable, the API returns a clear warning/error instead of sending the upload to an external service.

### Build the local document index

With the backend virtual environment activated, run once (and again when the scheme document list changes):

```bash
python3 -m app.rag.ingestion
```

This downloads the PDF URLs listed in `backend/data/schemes.json`, extracts page text, and writes a local index under `backend/data/rag_index/`. The embedding model is downloaded by Sentence Transformers on first use. The Q&A endpoint uses an extractive answerer by default; it needs no LLM API key and only returns text supported by retrieved chunks. Missing index, unavailable documents, or weak evidence produces an explicit “could not verify” response.

Optional environment variables:

- `YOJNASETU_EMBEDDING_MODEL` — Sentence Transformers model name (default: `sentence-transformers/all-MiniLM-L6-v2`).
- `YOJNASETU_RAG_MIN_SIMILARITY` — minimum cosine similarity accepted as evidence (default: `0.38`).

## Run the frontend

In a second terminal, from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite forwards `/api` requests to the backend at `http://127.0.0.1:8000`.

The frontend and backend run independently. Start both servers to see the live backend health status on the landing page.

## Configuration

Copy `.env.example` when adding local configuration. No API keys are required. PDF downloads and first-time model setup need internet access; the app can run without them, but `/api/ask` will return an explicit insufficient-evidence result until an index exists.

## Frontend pages and session behavior

- `/`: introduction, three-step workflow, feature highlights, and transparency.
- `/explore`: scheme search and category, geography, and department filters.
- `/explore/:scheme_id`: linked scheme details, official source, document requirements, and eligibility handoff.
- `/eligibility?scheme_id=...`: applicant form, review, rule results and explanations, and next steps.
- `/documents`: upload/OCR, extracted-field review, and readiness checklist. `/documents#consistency-review` opens consistency comparison; `/documents#scheme-questions` opens cited scheme Q&A. Section navigation preserves work while switching sections. Save review keeps reviewed extraction in this tab without leaving the page.
- `/application`: consolidated preflight report, collapsible profile editor, section links, and Print / Save as PDF. Printing expands source and rule disclosures for the saved copy.

Navigation uses the browser history API. Vite supports direct route refreshes; a production static host must serve `index.html` for frontend paths and forward `/api` separately.

Applicant drafts and extracted document data use this tab's `sessionStorage`. They can survive a refresh but are not account records or durable storage. Original files are not saved. Reopen an analyzed document using Review, or remove it from this tab. Reports must be regenerated after returning to the page; save a PDF for a lasting copy.

Existing limits: the form collects general applicant fields only, so uncollected scheme-specific rules stay unknown. Readiness tracks one explicitly mapped document requirement at a time, while consistency review supports up to ten uploads. RAG requires the local index described above; image/scanned-document OCR requires Tesseract.

Build the frontend with `cd frontend && npm run build`.

## Rule-derived eligibility explanations

Eligibility results and the preflight report share a **Why this result?** section. It joins the unchanged engine's PASS, FAIL, UNKNOWN outcomes and reasons to the selected scheme's rule metadata. It describes supported comparisons (`min`, `max`, `equals`, `in`, `state_in`) without reevaluating the applicant or changing the result. A mandatory FAIL remains decisive even when other conditions are UNKNOWN.

Explanations use a snapshot of the submitted profile, available field origins, original document extractions, and scheme metadata. Original OCR values and confidence are shown separately; they are never substituted for missing answers. Editing a report value removes its older document-confirmed origin, and an older report/consistency draft with no reliable provenance is labelled accordingly.

Limits are explicit: missing or unsupported metadata cannot support hypothetical outcomes. Boolean rules describe only the encoded yes/no comparison, not unencoded score thresholds, exceptions, evidence requirements, or dates. Scheme-specific fields absent from the current forms remain UNKNOWN and link back to official guidance. Annual family income is not substituted for parental income. No new required documents, citations, or eligibility decisions are generated.

Run `cd frontend && npm test` for explanation and rendering tests. These tests require the existing Python 3 installation to obtain actual results from the backend rule engine; no new packages are needed. Print uses the existing report disclosure-expansion handler and includes the explanation source URLs.

## Frontend design system

The interface uses warm paper, forest ink, sage surfaces, and a restrained saffron accent. Shared palette, typography, spacing, radius, and shadow tokens live in `frontend/src/tokens.css`; component and responsive styles live in `frontend/src/style.css`. Display type uses locally available Iowan/Palatino/Georgia, paired with the existing system sans-serif stack, with no external font or image dependency.

`frontend/src/ui.jsx` contains shared brand, icon, button-link, page-introduction, and source-status components. `frontend/src/HomePage.jsx` renders the editorial landing page and a real scheme preview from the existing scheme API. Working pages retain the existing feature components and endpoints. Print styles remove the application chrome and include source URLs in the report.
