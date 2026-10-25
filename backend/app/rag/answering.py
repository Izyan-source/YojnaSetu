import re
from typing import Any, Dict, List, Mapping, Protocol, Sequence


class AnswerGenerator(Protocol):
    """Interface for replacing the extractive default with a configured LLM."""

    def generate(self, question: str, evidence: Sequence[Mapping[str, Any]]) -> str:
        ...


class ExtractiveAnswerGenerator:
    """Return source sentences only; never infer missing facts."""

    def generate(self, question: str, evidence: Sequence[Mapping[str, Any]]) -> str:
        if not evidence:
            return "I could not verify an answer from the available scheme documents."

        ignored = {"what", "when", "where", "which", "who", "does", "do", "the", "a", "an", "is", "are", "of", "in", "on", "for", "to", "from", "and", "or", "about", "say", "state", "tell", "me", "source", "available", "scheme", "document", "documents"}
        query_terms = {token for token in re.findall(r"[a-z0-9]+", question.casefold()) if token not in ignored}
        scored_sentences = []
        seen = set()
        order = 0
        for item in evidence:
            text = " ".join(str(item.get("text", "")).split())
            candidates = [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]
            if not candidates and text:
                candidates = [text]
            for sentence in candidates:
                normalized = sentence.casefold()
                if normalized in seen:
                    continue
                seen.add(normalized)
                sentence_terms = set(re.findall(r"[a-z0-9]+", normalized))
                overlap = len(query_terms & sentence_terms)
                # Give exact query term overlap priority while keeping retrieved
                # evidence order as a stable tie breaker.
                if not query_terms or overlap:
                    scored_sentences.append((overlap, order, sentence))
                order += 1

        if not scored_sentences:
            return "I could not verify an answer from the available scheme documents."
        scored_sentences.sort(key=lambda item: (-item[0], item[1]))
        sentences = [item[2] for item in scored_sentences[:3]]
        return "The available source text states:\n\n" + "\n\n".join(sentences)
