# YojnaSetu

YojnaSetu is an AI-assisted government scheme discovery and application-readiness platform. This repository contains the initial project foundation: a React + Vite frontend and an independent FastAPI backend.

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
uvicorn app.main:app --reload
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
