"""Separate process contains embedding load failures and enforces offline execution."""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
from app.rag.service import RagService


def main():
    index = ROOT / 'backend/data/rag_index'
    output = Path(sys.argv[1])
    cases = json.loads((ROOT / 'evaluation/cases/rag.json').read_text())
    service = RagService(index_dir=index)
    retriever = service._load()
    if retriever is None:
        output.write_text(json.dumps({'status':'skipped', 'reason':service._load_error}))
        return
    manifest = json.loads((index / 'manifest.json').read_text())
    configured = os.getenv('YOJNASETU_EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
    if manifest.get('embedding_model') != configured:
        output.write_text(json.dumps({'status':'skipped', 'reason':'Configured embedding model differs from the indexed model.'}))
        return
    rows = []
    for case in cases:
        try:
            retrieved = [r for r in retriever.search(case['question'], top_k=4, scheme_id=case['scheme_id']) if r['similarity'] >= service.min_similarity]
            response = service.ask(case['question'], case['scheme_id'])
            if response.get('detail'):
                raise RuntimeError(response['detail'])
            rows.append({'id':case['id'], 'response':response, 'retrieved':retrieved})
        except Exception as exc:
            rows.append({'id':case['id'], 'status':'skipped', 'reason':str(exc)})
    output.write_text(json.dumps({'status':'completed', 'embedding_model':configured, 'min_similarity':service.min_similarity, 'rows':rows}, indent=2))

if __name__ == '__main__':
    main()
