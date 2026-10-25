import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from .answering import AnswerGenerator, ExtractiveAnswerGenerator
from .ingestion import INDEX_DIR
from .retrieval import SentenceTransformerEmbedder, VectorRetriever

INSUFFICIENT_ANSWER = "I could not verify an answer from the available scheme documents. Please consult the official source links."


class RagService:
    def __init__(
        self,
        index_dir: Path = INDEX_DIR,
        answer_generator: Optional[AnswerGenerator] = None,
        embedder: Optional[Any] = None,
        min_similarity: Optional[float] = None,
    ) -> None:
        self.index_dir = index_dir
        self.answer_generator = answer_generator or ExtractiveAnswerGenerator()
        self.embedder = embedder
        try:
            self.min_similarity = float(
                min_similarity if min_similarity is not None else os.getenv("YOJNASETU_RAG_MIN_SIMILARITY", "0.38")
            )
        except ValueError:
            self.min_similarity = 0.38
        self._retriever = None
        self._load_error = ""

    def _load(self) -> Optional[VectorRetriever]:
        if self._retriever is not None:
            return self._retriever
        if self._load_error:
            return None

        chunks_path = self.index_dir / "chunks.jsonl"
        vectors_path = self.index_dir / "vectors.json"
        if not chunks_path.exists() or not vectors_path.exists():
            self._load_error = "No document index is available. Run the ingestion command first."
            return None

        try:
            chunks = [
                json.loads(line)
                for line in chunks_path.read_text(encoding="utf-8").splitlines()
                if line.strip()
            ]
            vectors = json.loads(vectors_path.read_text(encoding="utf-8"))
            if not chunks or not vectors:
                self._load_error = "The document index contains no extractable evidence."
                return None
            self._retriever = VectorRetriever(
                chunks, vectors, self.embedder or SentenceTransformerEmbedder()
            )
            return self._retriever
        except Exception as exc:
            self._load_error = str(exc)
            return None

    def ask(self, question: str, scheme_id: Optional[str] = None) -> Dict[str, Any]:
        retriever = self._load()
        if retriever is None:
            return {
                "status": "INSUFFICIENT_EVIDENCE",
                "answer": INSUFFICIENT_ANSWER,
                "sources": [],
                "notice": self._load_error,
            }

        try:
            matches = retriever.search(question, top_k=4, scheme_id=scheme_id)
        except Exception as exc:
            return {
                "status": "INSUFFICIENT_EVIDENCE",
                "answer": INSUFFICIENT_ANSWER,
                "sources": [],
                "notice": "The local embedding model is unavailable; no answer was generated.",
                "detail": str(exc),
            }

        matches = [item for item in matches if item["similarity"] >= self.min_similarity]
        if not matches:
            return {
                "status": "INSUFFICIENT_EVIDENCE",
                "answer": INSUFFICIENT_ANSWER,
                "sources": [],
                "notice": "Retrieved evidence was missing or below the configured relevance threshold.",
            }

        answer = self.answer_generator.generate(question, matches)
        sources: List[Dict[str, Any]] = []
        for match in matches:
            sources.append(
                {
                    "document_title": match.get("document_title", "Untitled source document"),
                    "page_number": match.get("page_number"),
                    "source_url": match.get("source_url", ""),
                    "scheme_id": match.get("scheme_id"),
                    "excerpt": match.get("text", "")[:1000],
                    "similarity": round(float(match["similarity"]), 4),
                }
            )
        return {
            "status": "ANSWERED",
            "answer": answer,
            "sources": sources,
            "notice": "Extractive answer based only on retrieved text. Confirm details in the cited official document.",
        }
