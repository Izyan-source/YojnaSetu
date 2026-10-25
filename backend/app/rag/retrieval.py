import math
import os
from typing import Any, Dict, List, Mapping, Optional, Protocol, Sequence


class Embedder(Protocol):
    def embed(self, text: str) -> Sequence[float]:
        ...


class SentenceTransformerEmbedder:
    """Lazy local semantic embedder using a small, configurable sentence model."""

    def __init__(self, model_name: Optional[str] = None) -> None:
        self.model_name = model_name or os.getenv(
            "YOJNASETU_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
        )
        self._model = None

    def _load(self) -> Any:
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:
                raise RuntimeError(
                    "Sentence Transformers is not installed. Install backend requirements and run the ingestion command."
                ) from exc
            try:
                self._model = SentenceTransformer(self.model_name)
            except Exception as exc:
                raise RuntimeError(
                    "The local embedding model is unavailable. Check model access and YOJNASETU_EMBEDDING_MODEL."
                ) from exc
        return self._model

    def embed(self, text: str) -> Sequence[float]:
        return self.embed_many([text])[0]

    def embed_many(self, texts: Sequence[str]) -> List[List[float]]:
        vectors = self._load().encode(list(texts), normalize_embeddings=True, show_progress_bar=False)
        return [vector.tolist() if hasattr(vector, "tolist") else list(vector) for vector in vectors]


def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    if len(left) != len(right) or not left:
        return 0.0
    dot = sum(float(a) * float(b) for a, b in zip(left, right))
    left_norm = math.sqrt(sum(float(value) ** 2 for value in left))
    right_norm = math.sqrt(sum(float(value) ** 2 for value in right))
    if not left_norm or not right_norm:
        return 0.0
    return dot / (left_norm * right_norm)


class VectorRetriever:
    """Exact cosine vector search, appropriate for this small local corpus."""

    def __init__(
        self,
        chunks: Sequence[Mapping[str, Any]],
        vectors: Sequence[Sequence[float]],
        embedder: Embedder,
    ) -> None:
        if len(chunks) != len(vectors):
            raise ValueError("Each document chunk must have one embedding vector")
        self.chunks = list(chunks)
        self.vectors = list(vectors)
        self.embedder = embedder

    def search(
        self,
        question: str,
        top_k: int = 4,
        scheme_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query_vector = self.embedder.embed(question)
        scored = []
        for chunk, vector in zip(self.chunks, self.vectors):
            if scheme_id and chunk.get("scheme_id") != scheme_id:
                continue
            score = cosine_similarity(query_vector, vector)
            result = dict(chunk)
            result["similarity"] = score
            scored.append(result)
        scored.sort(key=lambda item: item["similarity"], reverse=True)
        return scored[: max(0, top_k)]
