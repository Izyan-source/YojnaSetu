from typing import Any, Dict, List, Mapping


def chunk_text(
    text: str,
    metadata: Mapping[str, Any],
    chunk_size: int = 1000,
    overlap: int = 160,
) -> List[Dict[str, Any]]:
    """Split page text into overlapping chunks and copy its source metadata."""
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be non-negative and smaller than chunk_size")

    normalized = " ".join(text.split())
    if not normalized:
        return []

    chunks = []
    start = 0
    while start < len(normalized):
        end = min(start + chunk_size, len(normalized))
        if end < len(normalized):
            boundary = normalized.rfind(" ", start + chunk_size // 2, end)
            if boundary > start:
                end = boundary

        excerpt = normalized[start:end].strip()
        if excerpt:
            chunk = dict(metadata)
            chunk["chunk_index"] = len(chunks)
            chunk["text"] = excerpt
            chunks.append(chunk)

        if end >= len(normalized):
            break
        start = max(end - overlap, start + 1)

    return chunks
