import json
import tempfile
import unittest
from pathlib import Path

from app.rag.answering import ExtractiveAnswerGenerator
from app.rag.chunking import chunk_text
from app.rag.ingestion import ingest_scheme_documents
from app.rag.retrieval import VectorRetriever
from app.rag.service import RagService


class FakeEmbedder:
    def __init__(self, vector=None):
        self.vector = vector or [1.0, 0.0]

    def embed(self, text):
        return self.vector


class RagTests(unittest.TestCase):
    def test_chunking_preserves_metadata_and_overlap(self):
        text = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu"
        metadata = {
            "document_title": "Example source",
            "source_url": "https://example.gov.in/source.pdf",
            "page_number": 3,
            "scheme_id": "sample-scheme",
        }
        chunks = chunk_text(text, metadata, chunk_size=32, overlap=8)
        self.assertGreaterEqual(len(chunks), 2)
        self.assertEqual(chunks[0]["page_number"], 3)
        self.assertEqual(chunks[0]["source_url"], metadata["source_url"])
        self.assertEqual(chunks[0]["scheme_id"], "sample-scheme")
        self.assertEqual([chunk["chunk_index"] for chunk in chunks], list(range(len(chunks))))
        self.assertTrue(set(chunks[0]["text"][-5:]).issubset(set(chunks[1]["text"])))

    def test_vector_retrieval_ranks_semantically_similar_vectors_and_filters_scheme(self):
        chunks = [
            {"text": "Relevant retirement pension eligibility text", "scheme_id": "apy"},
            {"text": "Unrelated crop assistance text", "scheme_id": "kisan"},
        ]
        vectors = [[0.98, 0.2], [0.0, 1.0]]
        matches = VectorRetriever(chunks, vectors, FakeEmbedder()).search("pension eligibility")
        self.assertEqual(matches[0]["scheme_id"], "apy")
        self.assertGreater(matches[0]["similarity"], matches[1]["similarity"])
        filtered = VectorRetriever(chunks, vectors, FakeEmbedder()).search(
            "pension eligibility", scheme_id="kisan"
        )
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["scheme_id"], "kisan")

    def test_ingestion_stores_source_title_url_page_and_scheme_id(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            summary = ingest_scheme_documents(
                [{
                    "scheme_id": "sample-scheme",
                    "name": "Sample Scheme",
                    "documents": [{"title": "Guidelines", "url": "https://example.gov.in/guidelines.pdf"}],
                }],
                fetcher=lambda _url: b"%PDF sample bytes",
                page_extractor=lambda _pdf: ["A source sentence about eligibility. " * 8],
                embedder=FakeEmbedder(),
                index_dir=Path(temp_dir),
            )
            stored = json.loads((Path(temp_dir) / "chunks.jsonl").read_text(encoding="utf-8").splitlines()[0])
            self.assertEqual(summary["document_count"], 1)
            self.assertEqual(stored["document_title"], "Guidelines")
            self.assertEqual(stored["source_url"], "https://example.gov.in/guidelines.pdf")
            self.assertEqual(stored["page_number"], 1)
            self.assertEqual(stored["scheme_id"], "sample-scheme")

    def test_answer_is_extractive_and_cites_only_available_evidence(self):
        answer = ExtractiveAnswerGenerator().generate(
            "What savings account details are needed?",
            [{"text": "The subscriber must have a savings account. Nominee details are required."}],
        )
        self.assertIn("savings account", answer)

    def test_answer_selects_sentences_relevant_to_question(self):
        answer = ExtractiveAnswerGenerator().generate(
            "What is the joining age range?",
            [{"text": "APY is a voluntary pension scheme. A person can join APY in the age bracket of 18-40 years."}],
        )
        self.assertIn("18-40", answer)
        self.assertNotIn("voluntary pension scheme", answer)

    def test_missing_index_returns_explicit_insufficient_evidence(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            response = RagService(index_dir=Path(temp_dir)).ask("What is the benefit?")
        self.assertEqual(response["status"], "INSUFFICIENT_EVIDENCE")
        self.assertIn("could not verify", response["answer"].lower())
        self.assertEqual(response["sources"], [])

    def test_weak_retrieval_returns_insufficient_evidence(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            index_dir = Path(temp_dir)
            chunk = {
                "document_title": "Official rules",
                "source_url": "https://example.gov.in/rules.pdf",
                "page_number": 1,
                "scheme_id": "sample-scheme",
                "text": "Only unrelated text is available.",
            }
            (index_dir / "chunks.jsonl").write_text(json.dumps(chunk) + "\n", encoding="utf-8")
            (index_dir / "vectors.json").write_text(json.dumps([[0.0, 1.0]]), encoding="utf-8")
            response = RagService(index_dir=index_dir, embedder=FakeEmbedder(), min_similarity=0.5).ask(
                "What are the pension age rules?"
            )
        self.assertEqual(response["status"], "INSUFFICIENT_EVIDENCE")
        self.assertEqual(response["sources"], [])

    def test_successful_answer_response_includes_page_and_source_metadata(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            index_dir = Path(temp_dir)
            chunk = {
                "document_title": "Official APY FAQ",
                "source_url": "https://example.gov.in/apy.pdf",
                "page_number": 4,
                "scheme_id": "apy",
                "text": "APY applicants must be aged between 18 and 40 years.",
            }
            (index_dir / "chunks.jsonl").write_text(json.dumps(chunk) + "\n", encoding="utf-8")
            (index_dir / "vectors.json").write_text(json.dumps([[1.0, 0.0]]), encoding="utf-8")
            response = RagService(index_dir=index_dir, embedder=FakeEmbedder()).ask(
                "What is the APY age range?", scheme_id="apy"
            )
        self.assertEqual(response["status"], "ANSWERED")
        self.assertEqual(response["sources"][0]["document_title"], "Official APY FAQ")
        self.assertEqual(response["sources"][0]["page_number"], 4)
        self.assertEqual(response["sources"][0]["source_url"], "https://example.gov.in/apy.pdf")


if __name__ == "__main__":
    unittest.main()
