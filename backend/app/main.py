import json
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .eligibility import evaluate_all
from .documents import DocumentAnalysisError, MAX_UPLOAD_BYTES, analyze_document
from .consistency import check_consistency
from .models import AskRequest, ConsistencyCheckRequest, EligibilityCheckRequest
from .rag.service import RagService

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "schemes.json"


def load_schemes() -> List[Dict[str, Any]]:
    with DATA_PATH.open(encoding="utf-8") as scheme_file:
        return json.load(scheme_file)


SCHEMES = load_schemes()
SCHEMES_BY_ID = {scheme["scheme_id"]: scheme for scheme in SCHEMES}
RAG_SERVICE = RagService()

app = FastAPI(title="YojnaSetu API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/schemes")
def list_schemes() -> List[Dict[str, Any]]:
    return SCHEMES


@app.get("/api/schemes/{scheme_id}")
def get_scheme(scheme_id: str) -> Dict[str, Any]:
    scheme = SCHEMES_BY_ID.get(scheme_id)
    if scheme is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return scheme


@app.post("/api/eligibility/check")
def check_eligibility(request: EligibilityCheckRequest) -> Dict[str, Any]:
    profile_model = request.profile
    if hasattr(profile_model, "model_dump"):
        profile = profile_model.model_dump(exclude_unset=True)
    else:
        profile = profile_model.dict(exclude_unset=True)
    if request.scheme_id and request.scheme_id not in SCHEMES_BY_ID:
        raise HTTPException(status_code=404, detail="Scheme not found")
    selected_schemes = [SCHEMES_BY_ID[request.scheme_id]] if request.scheme_id else SCHEMES
    return {
        "results": evaluate_all(selected_schemes, profile),
        "notice": "These deterministic results cover only the rules listed in the dataset. They are guidance, not an official eligibility decision or guarantee of approval.",
    }


@app.post("/api/ask")
def ask_scheme_question(request: AskRequest) -> Dict[str, Any]:
    if request.scheme_id and request.scheme_id not in SCHEMES_BY_ID:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return RAG_SERVICE.ask(request.question.strip(), request.scheme_id)


@app.post("/api/documents/analyze")
async def analyze_uploaded_document(file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        content = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File exceeds the 10 MB upload limit.")
        try:
            return analyze_document(file.filename or "upload", file.content_type or "application/octet-stream", content)
        except DocumentAnalysisError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        await file.close()


@app.post("/api/documents/consistency-check")
def check_document_consistency(request: ConsistencyCheckRequest) -> Dict[str, Any]:
    profile_model = request.profile
    profile = profile_model.model_dump(exclude_unset=True) if hasattr(profile_model, "model_dump") else profile_model.dict(exclude_unset=True)
    documents = [document.model_dump() if hasattr(document, "model_dump") else document.dict() for document in request.documents]
    return check_consistency(profile, documents)
