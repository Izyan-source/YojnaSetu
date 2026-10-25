import json
import os
import urllib.request
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

from .chunking import chunk_text
from .retrieval import SentenceTransformerEmbedder

BACKEND_DIR = Path(__file__).resolve().parents[2]
SCHEMES_PATH = BACKEND_DIR / "data" / "schemes.json"
INDEX_DIR = BACKEND_DIR / "data" / "rag_index"


def download_pdf(url: str, timeout: int = 30) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "YojnaSetu document-ingestion/1.0"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        content_type = response.headers.get("Content-Type", "").lower()
        content = response.read()
    if not content.startswith(b"%PDF") and "application/pdf" not in content_type:
        raise ValueError("The source URL did not return a PDF document")
    return content


def extract_pdf_pages(pdf_bytes: bytes) -> List[str]:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("pypdf is not installed. Install backend requirements first.") from exc
    reader = PdfReader(BytesIO(pdf_bytes))
    if reader.is_encrypted:
        try:
            reader.decrypt("")
        except Exception as exc:
            raise ValueError("The PDF is encrypted and cannot be read") from exc
    return [page.extract_text() or "" for page in reader.pages]


def chunks_from_pages(
    pages: Iterable[str],
    document_title: str,
    source_url: str,
    scheme_id: Optional[str],
    chunk_size: int = 1000,
    overlap: int = 160,
) -> List[Dict[str, Any]]:
    all_chunks: List[Dict[str, Any]] = []
    for page_number, text in enumerate(pages, start=1):
        metadata = {
            "document_title": document_title,
            "source_url": source_url,
            "page_number": page_number,
            "scheme_id": scheme_id,
        }
        all_chunks.extend(chunk_text(text, metadata, chunk_size, overlap))
    return all_chunks


def embed_chunks(
    chunks: Sequence[Mapping[str, Any]],
    embedder: Optional[Any] = None,
) -> List[List[float]]:
    model = embedder or SentenceTransformerEmbedder()
    if hasattr(model, "embed_many"):
        return model.embed_many([str(chunk["text"]) for chunk in chunks])
    return [list(model.embed(str(chunk["text"]))) for chunk in chunks]


def write_index(
    chunks: Sequence[Mapping[str, Any]],
    vectors: Sequence[Sequence[float]],
    index_dir: Path = INDEX_DIR,
    model_name: Optional[str] = None,
    errors: Optional[Sequence[Mapping[str, str]]] = None,
) -> None:
    if len(chunks) != len(vectors):
        raise ValueError("Chunk and vector counts do not match")
    index_dir.mkdir(parents=True, exist_ok=True)
    (index_dir / "chunks.jsonl").write_text(
        "".join(json.dumps(chunk, ensure_ascii=False) + "\n" for chunk in chunks),
        encoding="utf-8",
    )
    (index_dir / "vectors.json").write_text(
        json.dumps(vectors, separators=(",", ":")), encoding="utf-8"
    )
    manifest = {
        "built_at": datetime.now(timezone.utc).isoformat(),
        "embedding_model": model_name
        or os.getenv("YOJNASETU_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"),
        "chunk_count": len(chunks),
        "document_count": len({chunk.get("source_url") for chunk in chunks}),
        "ingestion_errors": list(errors or []),
    }
    (index_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def ingest_scheme_documents(
    schemes: Sequence[Mapping[str, Any]],
    fetcher=download_pdf,
    page_extractor=extract_pdf_pages,
    embedder: Optional[Any] = None,
    index_dir: Path = INDEX_DIR,
) -> Dict[str, Any]:
    chunks: List[Dict[str, Any]] = []
    errors: List[Dict[str, str]] = []
    seen_urls = set()

    for scheme in schemes:
        for document in scheme.get("documents", []):
            url = document.get("url")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            title = document.get("title") or scheme["name"]
            try:
                pages = page_extractor(fetcher(url))
                document_chunks = chunks_from_pages(
                    pages, title, url, scheme.get("scheme_id")
                )
                if not document_chunks:
                    errors.append({"url": url, "error": "No extractable text was found in the PDF."})
                chunks.extend(document_chunks)
            except Exception as exc:
                errors.append({"url": url, "error": str(exc)})

    if chunks:
        try:
            vectors = embed_chunks(chunks, embedder)
        except Exception as exc:
            write_index([], [], index_dir, errors=errors + [{"url": "embedding-model", "error": str(exc)}])
            return {"chunk_count": 0, "document_count": 0, "errors": errors + [{"url": "embedding-model", "error": str(exc)}]}
    else:
        vectors = []

    write_index(chunks, vectors, index_dir, errors=errors)
    return {
        "chunk_count": len(chunks),
        "document_count": len({chunk.get("source_url") for chunk in chunks}),
        "errors": errors,
    }


def load_schemes(path: Path = SCHEMES_PATH) -> List[Dict[str, Any]]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    result = ingest_scheme_documents(load_schemes())
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
