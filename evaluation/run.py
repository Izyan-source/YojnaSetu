#!/usr/bin/env python3
"""Offline, synthetic, component-level evaluation; never writes production data."""
import argparse
import hashlib
import importlib.metadata
import json
import os
import platform
import shutil
import subprocess
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
HERE = ROOT / 'evaluation'
sys.path.insert(0, str(ROOT / 'backend'))
from app.eligibility import evaluate_scheme
from app.consistency import check_consistency
from metrics import classification, ratio

AS_OF = '2026-10-26'
ELIGIBILITY_LABELS = ['POTENTIALLY_ELIGIBLE', 'NOT_ELIGIBLE', 'UNDETERMINED']
RULE_LABELS = ['PASS', 'FAIL', 'UNKNOWN']
CONSISTENCY_LABELS = ['CONSISTENT', 'POTENTIAL_MISMATCH', 'MISSING_INFORMATION', 'UNABLE_TO_VERIFY']

class EvaluationDate(date):
    @classmethod
    def today(cls):
        return cls.fromisoformat(AS_OF)


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def save(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def norm(text):
    return ' '.join(str(text).casefold().split())


def eligibility(schemes):
    rows, rgold, rpred = [], [], []
    for case in read(HERE/'cases/eligibility.json'):
        result = evaluate_scheme(schemes[case['scheme_id']], case['profile'])
        actual = {r['rule_id']:r['status'] for r in result['rule_results']}
        if set(actual) != set(case['expected_rules']):
            raise ValueError('Rule inventory changed; relabel curated case: ' + case['id'])
        rgold.extend(case['expected_rules'].values())
        rpred.extend(actual[k] for k in case['expected_rules'])
        rows.append({**case, 'actual_status':result['status'], 'actual_rules':actual,
                     'passed': result['status'] == case['expected_status'] and actual == case['expected_rules']})
    coverage = {}
    for row in rows:
        for rule_id, status in row['actual_rules'].items():
            coverage.setdefault(rule_id, set()).add(status)
    return {'status':'completed', 'cases':rows,
            'rule_status_coverage': {key:sorted(values) for key,values in coverage.items()},
            'classification':classification([r['expected_status'] for r in rows], [r['actual_status'] for r in rows], ELIGIBILITY_LABELS),
            'rules':classification(rgold,rpred,RULE_LABELS)}


def consistency():
    rows=[]
    for case in read(HERE/'cases/consistency.json'):
        result = check_consistency(case['profile'], case['documents'])
        finding = next(f for f in result['findings'] if f['field'] == case['field'])
        rows.append({**case, 'actual_status':finding['status'], 'finding':finding, 'passed':finding['status'] == case['expected_status']})
    certain = [r for r in rows if r['expected_status'] in ['CONSISTENT','POTENTIAL_MISMATCH']]
    return {'status':'completed', 'cases':rows,
            'classification':classification([r['expected_status'] for r in rows],[r['actual_status'] for r in rows],CONSISTENCY_LABELS),
            'certain_subset':classification([r['expected_status'] for r in certain],[r['actual_status'] for r in certain],CONSISTENCY_LABELS),
            'certain_subset_note':'Binary mismatch precision/recall/F1 uses the POTENTIAL_MISMATCH class on labeled consistent/mismatch cases only. Missing and low-confidence gold cases are reported separately; predicted abstentions remain errors/FNs on this subset.'}


def documents(output):
    cases = read(HERE/'cases/documents.json')
    modes = {name:{'status':'completed','cases':[]} for name in ['pdf_text','ocr_png']}
    analyses = {}
    try:
        import fitz
        import pytesseract
        from app.documents import analyze_document
        ocr_reason = None
        try:
            pytesseract.get_tesseract_version()
            if 'eng' not in pytesseract.get_languages(config=''):
                ocr_reason = 'Tesseract English language data is unavailable.'
        except Exception as exc:
            ocr_reason = 'Tesseract OCR unavailable: ' + str(exc)
        artifacts = output/'artifacts'
        artifacts.mkdir(exist_ok=True)
        for case in cases:
            doc = fitz.open()
            page = doc.new_page(width=595,height=842)
            page.insert_text((45,55),case['text'],fontsize=12,fontname='helv')
            pdf = doc.tobytes(no_new_id=True)
            png = page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).tobytes('png')
            doc.close()
            for mode, suffix, mime, content in [('pdf_text','pdf','application/pdf',pdf),('ocr_png','png','image/png',png)]:
                filename = 'synthetic-' + case['id'] + '.' + suffix
                (artifacts/filename).write_bytes(content)
                if mode == 'ocr_png' and ocr_reason:
                    modes[mode]['cases'].append({'id':case['id'],'status':'skipped','reason':ocr_reason})
                    continue
                try:
                    analysis=analyze_document(filename,mime,content)
                    required_method = 'OCR' if mode == 'ocr_png' else 'PDF text extraction'
                    if required_method not in analysis['extraction_methods']:
                        raise RuntimeError('Required extraction method did not execute: ' + required_method)
                    comparisons=[]
                    for field, expected in case['expected_fields'].items():
                        actual=analysis['extracted_fields'].get(field,{}).get('value')
                        comparisons.append({'field':field,'expected':expected,'actual':actual,'correct':actual == expected})
                    modes[mode]['cases'].append({'id':case['id'],'status':'completed','fields':comparisons,'passed':all(f['correct'] for f in comparisons),'analysis':analysis,'artifact_sha256':hashlib.sha256(content).hexdigest()})
                    if mode == 'pdf_text': analyses[case['id']] = analysis
                except Exception as exc:
                    modes[mode]['cases'].append({'id':case['id'],'status':'error','reason':str(exc),'passed':False})
        for mode in modes.values():
            completed=[r for r in mode['cases'] if r['status']=='completed']
            mode['status']='skipped' if not completed and all(r['status']=='skipped' for r in mode['cases']) else 'completed'
            fs=[f for r in completed for f in r['fields']]
            populated=[f for f in fs if f['expected'] is not None]
            absent=[f for f in fs if f['expected'] is None]
            mode['metrics']={'documents_scored':len(completed),'documents_planned':len(cases),'fields_scored':len(fs),
                'all_field_exact_accuracy':ratio(sum(f['correct'] for f in fs),len(fs)),
                'populated_field_exact_accuracy':ratio(sum(f['correct'] for f in populated),len(populated)),
                'populated_fields':len(populated),'absent_fields':len(absent),
                'false_extractions_on_absent_fields':sum(f['actual'] is not None for f in absent),
                'false_extraction_rate':ratio(sum(f['actual'] is not None for f in absent),len(absent))}
    except ImportError as exc:
        modes = {name:{'status':'skipped','reason':'Document dependencies unavailable: '+str(exc),'cases':[], 'metrics':None} for name in modes}
    return modes,analyses


def rag(output):
    index=ROOT/'backend/data/rag_index'
    cases=read(HERE/'cases/rag.json')
    required=[index/'chunks.jsonl',index/'vectors.json',index/'manifest.json']
    if not all(p.exists() for p in required):
        return {'status':'skipped','reason':'Official local index is absent. No retrieval scores were computed.','planned':len(cases),'cases':[]}
    chunks=[json.loads(line) for line in (index/'chunks.jsonl').read_text().splitlines() if line.strip()]
    worker=output/'rag-execution.json'
    env=dict(os.environ,HF_HUB_OFFLINE='1',TRANSFORMERS_OFFLINE='1',TOKENIZERS_PARALLELISM='false')
    try:
        proc=subprocess.run([sys.executable,str(HERE/'rag_worker.py'),str(worker)],env=env,capture_output=True,text=True,timeout=120)
        (output/'rag-worker.log').write_text(proc.stderr)
        if proc.returncode or not worker.exists():
            return {'status':'skipped','reason':'Offline RAG worker unavailable; see rag-worker.log.','planned':len(cases),'cases':[]}
        execution=read(worker)
    except subprocess.TimeoutExpired:
        return {'status':'skipped','reason':'Offline RAG evaluation exceeded 120 seconds.','planned':len(cases),'cases':[]}
    if execution['status']=='skipped': return {**execution,'planned':len(cases),'cases':[]}
    by_id={r['id']:r for r in execution['rows']}
    rows=[]; valid_citations=0; citation_count=0
    for case in cases:
        run=by_id[case['id']]
        if run.get('status')=='skipped':
            rows.append({**case,**run}); continue
        evidence_valid=all(any(c['source_url']==e['source_url'] and c['page_number']==e['page_number'] and c['scheme_id']==case['scheme_id'] and e['quote'] in c['text'] and hashlib.sha256(c['text'].encode()).hexdigest()==e['chunk_sha256'] for c in chunks) for e in case['evidence'])
        if not evidence_valid or (case.get('requires_empty_scheme_index') and any(c['scheme_id']==case['scheme_id'] for c in chunks)):
            rows.append({**case,'status':'skipped','reason':'Index changed relative to curated ground truth; manual relabeling required.'}); continue
        response=run['response']; retrieved=run['retrieved']
        integrity=[any(s['source_url']==r['source_url'] and s['page_number']==r['page_number'] and s['document_title']==r['document_title'] and s['scheme_id']==r['scheme_id'] and s['excerpt']==r['text'][:1000] for r in retrieved) for s in response['sources']]
        valid_citations+=sum(integrity); citation_count+=len(integrity)
        supported=any(norm(e['quote']) in norm(s['excerpt']) and e['source_url']==s['source_url'] and e['page_number']==s['page_number'] for e in case['evidence'] for s in response['sources']) if case['answerable'] else None
        answer_match=norm(case['expected_answer']) in norm(response['answer']) if case['answerable'] else None
        abstained=response['status']=='INSUFFICIENT_EVIDENCE' and not response['sources']
        passed=(response['status']=='ANSWERED' and supported and answer_match and bool(integrity) and all(integrity)) if case['answerable'] else abstained
        rows.append({**case,'status':'completed','response':response,'citation_integrity':integrity,'retrieved_gold_support':supported,'strict_answer_contains_gold':answer_match,'appropriate_abstention':abstained if not case['answerable'] else None,'passed':bool(passed)})
    scored=[r for r in rows if r['status']=='completed']; positive=[r for r in scored if r['answerable']]; negative=[r for r in scored if not r['answerable']]
    return {'status':'completed' if scored else 'skipped','cases':rows,'planned':len(cases),'manifest':read(index/'manifest.json'),
            'classification':classification(['ANSWERED' if r['answerable'] else 'INSUFFICIENT_EVIDENCE' for r in scored],[r['response']['status'] for r in scored],['ANSWERED','INSUFFICIENT_EVIDENCE']),
            'metrics':{'answerable_n':len(positive),'unanswerable_n':len(negative),'gold_evidence_hit_at_4':ratio(sum(r['retrieved_gold_support'] for r in positive),len(positive)),
            'strict_answer_match_rate':ratio(sum(r['strict_answer_contains_gold'] for r in positive),len(positive)),
            'supported_answer_success_rate':ratio(sum(r['passed'] for r in positive),len(positive)),
            'appropriate_abstention_rate':ratio(sum(r['appropriate_abstention'] for r in negative),len(negative)),
            'citation_count':citation_count,'citation_provenance_precision':ratio(valid_citations,citation_count)},
            'embedding_model':execution['embedding_model'],'min_similarity':execution['min_similarity']}


def integrated(schemes,analyses,rag_result):
    rows=[]; scheme=schemes['atal-pension-yojana']
    for case in read(HERE/'cases/integrated.json'):
        if case['document_id'] not in analyses:
            rows.append({**case,'status':'skipped','reason':'Required native PDF extraction unavailable.'}); continue
        document=analyses[case['document_id']]
        baseline=evaluate_scheme(scheme,case['profile'])
        # Explicit synthetic human-confirmation choice is part of the fixture.
        # No OCR value enters eligibility unless that exact field was selected.
        reviewed=dict(case['profile']); sources={k:'manually-entered' for k in reviewed}
        for field in case['confirmed_fields']:
            value=document['extracted_fields'][field]['value']
            if value is not None:
                reviewed[field]=int(value) if field in ['age','annual_family_income_inr'] else value
                sources[field]='document-confirmed'
        result=evaluate_scheme(scheme,reviewed)
        finding=next(f for f in check_consistency(case['profile'],[document])['findings'] if f['field']=='age')
        row={**case,'status':'completed','profile_only_result':baseline,'integrated_result':result,'reviewed_profile':reviewed,'age_consistency':finding,
             'profile_only_correct':baseline['status']==case['expected_profile_only'],'integrated_correct':result['status']==case['expected_integrated'],
             'consistency_correct':finding['status']==case['expected_age_consistency'],
             'rag_question_result':next((r['response'] for r in rag_result.get('cases',[]) if r['id']==case['question_id'] and r.get('status')=='completed'),None)}
        try:
            proc=subprocess.run(['node',str(HERE/'explain.mjs')],input=json.dumps({'result':result,'context':{'profile':reviewed,'profileSources':sources,'documents':[document],'scheme':scheme}}),capture_output=True,text=True,check=True,timeout=20)
            explanation=json.loads(proc.stdout)
            row['explanation']=explanation
            row['explanation_checks']={
                'same_rule_statuses':{r['rule_id']:r['status'] for r in explanation['rules']}=={r['rule_id']:r['status'] for r in result['rule_results']},
                'blocking_failure_flag':explanation['hasBlockingFailure']==(case['expected_integrated']=='NOT_ELIGIBLE'),
                'same_engine_reasons':all(next(x for x in result['rule_results'] if x['rule_id']==r['rule_id'])['explanation']==r['explanation'] for r in explanation['rules']),
                'no_invented_source_urls':all(s['url']==scheme['official_source_url'] for s in explanation['sources']),
                'actual_age_conditions_described':all(
                    phrase in next(r for r in explanation['rules'] if r['rule_id']==rule_id)['whyItMatters']
                    for rule_id,phrase in [('apy_min_age','at least 18 (inclusive)'),('apy_max_age','at most 40 (inclusive)')]),
                'unknown_information_identified':all(r['informationNeeded'] and r['possibleOutcomes'] for r in explanation['rules'] if r['status']=='UNKNOWN'),
                'unconfirmed_document_does_not_override':bool(case['confirmed_fields']) or result==baseline,
            }
        except (OSError,subprocess.SubprocessError,ValueError) as exc:
            row['explanation_skipped']=str(exc)
        row['passed']=row['profile_only_correct'] and row['integrated_correct'] and row['consistency_correct'] and all(row.get('explanation_checks',{}).values())
        rows.append(row)
    scored=[r for r in rows if r['status']=='completed']
    checks=[v for r in scored for v in r.get('explanation_checks',{}).values()]
    return {'status':'completed' if scored else 'skipped','cases':rows,
            'profile_only':classification([r['expected_profile_only'] for r in scored],[r['profile_only_result']['status'] for r in scored],ELIGIBILITY_LABELS),
            'integrated':classification([r['expected_integrated'] for r in scored],[r['integrated_result']['status'] for r in scored],ELIGIBILITY_LABELS),
            'explanation_invariants':{'n':len(checks),'passed':sum(checks),'rate':ratio(sum(checks),len(checks))},
            'note':'Backend component composition, not a browser/user study. Scheme-specific baseline facts are supported by the API but not all current form fields. The same cases use different, explicitly recorded information before/after human confirmation, so these accuracy values do not establish superiority. RAG answers a related source question and is never used as an eligibility classifier. Consistency compares the original profile to extraction before confirmation.'}


def format_value(value):
    return 'not measured / undefined' if value is None else f'{value:.3f}' if isinstance(value,float) else str(value)


def report(data):
    lines=['# YojnaSetu executed evaluation', '', 'Generated: '+data['environment']['executed_at'], '',
           '## Methodology', '',
           'Curated synthetic component regression study against the existing implementation, not official eligibility validation or a representative population benchmark. Labels were explicitly authored before the scored run. No production rules, API contracts, datasets, UI, or documents were modified. No documents or models were downloaded.',
           '', 'Eligibility uses fixed applicant profiles and explicit per-rule/overall labels. UNKNOWN and UNDETERMINED are their own classes, not failures. Precision/recall/F1 are one-vs-rest; macro-F1 averages classes with gold support. Undefined denominators are JSON null, not a perfect score.',
           '', 'Document truth is manually specified for all 11 fields in four simple synthetic worksheets. Native PDF extraction and raster PNG OCR are separate experiments. Exact normalized-value matching is scored with null fields reported separately; blank fields cannot inflate populated-field accuracy. Age/expiry clocks are frozen only inside the evaluation process at '+AS_OF+'. No real identity material is used.',
           '', 'Consistency scores only the designated field in each case, avoiding inflation from unrelated missing fields. Low-confidence and missing-information states remain separate from confident mismatch detection.',
           '', 'RAG labels quote inspected passages from the existing official index and pin their URL, page, and chunk hash. Exact whitespace/case-normalized answer containment is a strict proxy, not semantic QA accuracy. Evidence hit@4 tests whether a returned excerpt contains the labeled support. Citation provenance verifies URL/page/title/scheme/excerpt against actual retrieved chunks, not factual correctness or relevance. Abstention tests include private facts unavailable in guidelines and two schemes absent from this index. Offline model failure is a skip, not successful abstention.',
           '', '## Executed metrics', '']
    for name,key in [('Eligibility','eligibility'),('Consistency','consistency')]:
        sec=data[key]; m=sec.get('classification',{})
        lines+=['### '+name,'',f"Cases: {m.get('n',0)}; accuracy: {format_value(m.get('accuracy'))}; macro-F1: {format_value(m.get('macro_f1_supported_classes'))}.",'','| Class | Gold n | Predicted n | Precision | Recall | F1 |','|---|---:|---:|---:|---:|---:|']
        for label,c in m.get('per_class',{}).items(): lines.append(f"| {label} | {c['support']} | {m['predicted_counts'].get(label,0)} | {format_value(c['precision'])} | {format_value(c['recall'])} | {format_value(c['f1'])} |")
        lines+=['']
    er=data['eligibility'].get('rules',{})
    coverage=data['eligibility'].get('rule_status_coverage',{})
    lines += [f"Per-rule decisions: {er.get('n',0)}; accuracy: {format_value(er.get('accuracy'))}; gold counts: {er.get('gold_counts',{})}.",
              f"Rules observed in all three statuses: {sum(set(values)==set(RULE_LABELS) for values in coverage.values())}/{len(coverage)}.",'']
    cm=data['consistency'].get('certain_subset',{}).get('per_class',{}).get('POTENTIAL_MISMATCH',{})
    lines += ['Confident mismatch subset: '+', '.join(k+'='+format_value(cm.get(k)) for k in ['precision','recall','f1'])+'.','']
    for mode,sec in data['documents'].items():
        lines+=['### '+mode,'', 'Status: '+sec['status']+'.','']
        lines += [f'- {k}: {format_value(v)}' for k,v in (sec.get('metrics') or {}).items()]
        if sec.get('reason'): lines.append(sec['reason'])
        lines+=['']
    r=data['rag'];lines+=['### RAG','',f"Status: {r['status']}; planned questions: {r.get('planned',0)}.",'']
    if r.get('reason'):lines.append(r['reason'])
    lines += [f'- {k}: {format_value(v)}' for k,v in r.get('metrics',{}).items()]
    lines += ['','RAG response-status accuracy: '+format_value(r.get('classification',{}).get('accuracy'))+'.',
              '| Response class | Gold n | Precision | Recall | F1 |','|---|---:|---:|---:|---:|']
    for label,c in r.get('classification',{}).get('per_class',{}).items():
        lines.append(f"| {label} | {c['support']} | {format_value(c['precision'])} | {format_value(c['recall'])} | {format_value(c['f1'])} |")
    lines+=['','## Approach comparison','','| Approach | Eligible metric | Actual measurement |','|---|---|---|',
            '| Profile-only rules | Classification against profile-only labels | '+format_value(data['integrated'].get('profile_only',{}).get('accuracy'))+' on '+str(data['integrated'].get('profile_only',{}).get('n',0))+' paired cases |',
            '| RAG-only | Evidence support and abstention, not applicant classification | '+format_value(r.get('metrics',{}).get('supported_answer_success_rate'))+' supported-answer rate on the answerable QA subset |',
            '| Integrated components | Classification after explicit confirmation, consistency and explanation invariants | '+format_value(data['integrated'].get('integrated',{}).get('accuracy'))+' on paired cases; '+str(data['integrated'].get('explanation_invariants',{}))+' |','',data['integrated'].get('note','Integrated component evaluation unavailable.'),'',
            '| Paired case | Profile-only result | Integrated result | Confirmation | RAG question status |',
            '|---|---|---|---|---|']
    for row in data['integrated'].get('cases',[]):
        if row.get('status')=='completed':
            lines.append(f"| {row['id']} | {row['profile_only_result']['status']} | {row['integrated_result']['status']} | {', '.join(row['confirmed_fields']) or 'None'} | {(row.get('rag_question_result') or {}).get('status','not measured')} |")
    lines += ['','## Failed, skipped, or errored evaluations','']
    events=[]
    sections=[('eligibility',data['eligibility']),('consistency',data['consistency']),('rag',r),('integrated',data['integrated'])]+list(data['documents'].items())
    for name,sec in sections:
        if sec.get('status') in ['skipped','error'] and sec.get('reason'):events.append(f"- {name}: {sec['status']} — {sec['reason']}")
        for row in sec.get('cases',[]):
            if row.get('status') in ['skipped','error']:events.append(f"- {name}/{row['id']}: {row['status']} — {row.get('reason','')}")
            elif row.get('passed') is False:events.append(f"- {name}/{row['id']}: failed labeled expectation; see results.json for expected and actual values.")
            if row.get('explanation_skipped'):events.append(f"- {name}/{row['id']}: explanation evaluation skipped — {row['explanation_skipped']}")
    lines+=events or ['None.']
    lines+=['','## Limits and proposed experiments','',
            '- Small, hand-curated regression samples are deliberately boundary-heavy. High scores do not establish population accuracy, legal correctness, real document performance, or statistical superiority. No confidence intervals or significance claims are made.',
            '- Boolean scheme conditions do not encode all underlying policy thresholds. The implemented integer-age rule is evaluated as written, not reconciled with more detailed official date-based wording.',
            '- Synthetic clean text worksheets are easier than real scans; OCR is not measured when Tesseract is absent. Proposed only: multilingual, rotated, blurred and multi-page synthetic scans with independently annotated truth.',
            '- The local index covers '+str(r.get('manifest',{}).get('document_count','unknown'))+' official documents. Ingestion errors: '+json.dumps(r.get('manifest',{}).get('ingestion_errors',[]))+'. No absent reference answer was invented.',
            '- QA wording and reference spans were curated by the implementer, not independently adjudicated or held out. Citation provenance alone is not answer support. Proposed only: blinded relevance annotation and a larger held-out question set.',
            '- Integrated runs exercise real extraction, eligibility, consistency, and the production JavaScript explanation builder. They simulate explicit human confirmation, not human review quality, browser interactions, RAG overriding rules, or an end-to-end deployment.',
            '', '## Reproduce','', '`backend/.venv/bin/python evaluation/run.py` from the repository root. Run metric checks with `backend/.venv/bin/python -m unittest discover -s evaluation/tests -v`. See evaluation/README.md for dependencies, artifact layout and exit codes.',
            '', 'Machine-readable outputs contain every executed case, labels, observed outputs, metric denominators, environment versions and input/code SHA-256 hashes. Generated artifacts are synthetic and isolated under evaluation/results/.']
    return '\n'.join(lines)+'\n'


def guarded(fn):
    try: return fn()
    except Exception as exc: return {'status':'error','reason':type(exc).__name__+': '+str(exc),'cases':[]}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',default=str(HERE/'results/latest'))
    args=parser.parse_args(); output=Path(args.output).resolve()
    if HERE/'results' not in output.parents:
        parser.error('Output must be a subdirectory of evaluation/results/')
    output.mkdir(parents=True,exist_ok=True)
    packages={}
    for package in ['PyMuPDF','Pillow','pytesseract','sentence-transformers','numpy','torch']:
        try: packages[package]=importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError: packages[package]=None
    tracked=list((HERE/'cases').glob('*.json'))+list((HERE).glob('*.py'))+[HERE/'explain.mjs']+list((ROOT/'backend/app').glob('*.py'))+list((ROOT/'backend/app/rag').glob('*.py'))+[ROOT/'backend/data/schemes.json',ROOT/'frontend/src/eligibilityExplanations.js']+list((ROOT/'backend/data/rag_index').glob('*.json*'))
    env={'executed_at':datetime.now(timezone.utc).isoformat(),'python':sys.version,'platform':platform.platform(),'packages':packages,'tesseract':shutil.which('tesseract'),'node':subprocess.getoutput('node --version'),'as_of':AS_OF,'offline':True,
         'sha256':{str(p.relative_to(ROOT)):digest(p) for p in tracked}}
    schemes={s['scheme_id']:s for s in read(ROOT/'backend/data/schemes.json')}
    with patch('app.documents.date',EvaluationDate), patch('app.consistency.date',EvaluationDate):
        data={'environment':env,'eligibility':guarded(lambda:eligibility(schemes)),'consistency':guarded(consistency)}
        try: data['documents'],analyses=documents(output)
        except Exception as exc:
            data['documents']={'pdf_text':{'status':'error','reason':str(exc),'cases':[]},'ocr_png':{'status':'error','reason':str(exc),'cases':[]}}; analyses={}
        data['rag']=guarded(lambda:rag(output))
        data['integrated']=guarded(lambda:integrated(schemes,analyses,data['rag']))
    sections=[data[k] for k in ['eligibility','consistency','rag','integrated']]+list(data['documents'].values())
    failures=sum(sec.get('status')=='error' for sec in sections)+sum(r.get('passed') is False or r.get('status')=='error' for sec in sections for r in sec.get('cases',[]))
    skips=sum(sec.get('status')=='skipped' and not sec.get('cases') for sec in sections)+sum(r.get('status')=='skipped' or bool(r.get('explanation_skipped')) for sec in sections for r in sec.get('cases',[]))
    data['execution_summary']={'failed_cases_or_sections':failures,'skipped_cases_or_sections':skips,'exit_code':1 if failures else 0}
    save(output/'results.json',data)
    (output/'report.md').write_text(report(data),encoding='utf-8')
    print(json.dumps({'results':str(output/'results.json'),'report':str(output/'report.md'),'failed_cases_or_sections':failures,'skipped_cases_or_sections':skips},indent=2))
    return 1 if failures else 0

if __name__ == '__main__':
    sys.exit(main())
