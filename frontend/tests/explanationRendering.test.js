import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createExplanationContext } from '../src/eligibilityExplanations.js'

test('eligibility and preflight render the shared explanation with real engine results', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const scratch = await mkdtemp(root + '.explanation-test-')
  const schemes = JSON.parse(await readFile(new URL('../../backend/data/schemes.json', import.meta.url)))
  const profile = { age:16 }
  const eligibility = JSON.parse(execFileSync('python3', ['-c', 'import json; from pathlib import Path; from app.eligibility import evaluate_scheme; schemes=json.loads(Path("data/schemes.json").read_text()); print(json.dumps(evaluate_scheme(schemes[0], {"age":16})))'], {
    cwd:fileURLToPath(new URL('../../backend/', import.meta.url)), encoding:'utf8',
  }))
  const context = createExplanationContext({profile, scheme:schemes[0], profileSources:{age:'manually-entered'}})
  const stored = new Map()
  globalThis.sessionStorage = {getItem:key => stored.get(key) ?? null}
  globalThis.__explanationReport = {eligibility, profile, explanationContext:context, consistency:{findings:[]}, evidence:null, generatedAt:'Test fixture'}
  try {
    // Export the existing results component and seed only report state in this
    // temporary test bundle. Production source and request handlers stay intact.
    const outfile = scratch + '/render.mjs'
    await build({
      stdin:{contents:'export { EligibilityResults } from "./src/App.jsx"; export { default as PreflightReport } from "./src/PreflightReport.jsx"',resolveDir:root},
      outfile,bundle:true,format:'esm',platform:'node',jsx:'automatic',loader:{'.css':'empty'},external:['react','react-dom','react/jsx-runtime'],
      plugins:[{name:'render-report-fixture',setup(builder) {
        builder.onLoad({filter:/\/App\.jsx$/},async ({path}) => ({loader:'jsx',contents:await readFile(path,'utf8') + '\nexport { EligibilityResults };'}))
        builder.onLoad({filter:/\/PreflightReport\.jsx$/},async ({path}) => ({loader:'jsx',contents:(await readFile(path,'utf8')).replace('const [report, setReport] = useState(null)','const [report, setReport] = useState(globalThis.__explanationReport)')}))
      }}],
    })
    const { EligibilityResults, PreflightReport } = await import(pathToFileURL(outfile))
    const resultsMarkup = renderToStaticMarkup(React.createElement(EligibilityResults,{results:[eligibility],schemes,explanationContext:context,onReviewProfile() {}}))
    assert.match(resultsMarkup,/Why this result\?/)
    assert.match(resultsMarkup,/why-rule why-fail" open=""/)
    assert.match(resultsMarkup,/check: 16\. User-provided answer/)
    assert.match(resultsMarkup,/UNKNOWN conditions alone cannot change/)
    assert.match(resultsMarkup,/Review profile answers/)
    assert.match(resultsMarkup,/Document readiness · separate from eligibility/)
    const reportMarkup = renderToStaticMarkup(React.createElement(PreflightReport,{scheme:schemes[0],initialProfile:profile,profileSources:{age:'manually-entered'},documents:[],documentReadiness:null}))
    assert.match(reportMarkup,/href="#report-rules"/)
    assert.match(reportMarkup,/id="report-rules" tabindex="-1" class="why-result report-block"/)
    assert.match(reportMarkup,/id="report-rules-title">Why this result\?/)
    assert.match(reportMarkup,/check: 16\. User-provided answer/)
    assert.match(reportMarkup,/Exact profile field: <code>indian_citizen<\/code>/)
    assert.ok(reportMarkup.includes(schemes[0].official_source_url))
    assert.match(reportMarkup,/Print \/ Save as PDF/)
    for (const id of ['report-documents','report-consistency','report-sources','report-next-steps']) assert.ok(reportMarkup.includes(`id="${id}"`))

    // A report/consistency draft may have overwritten an older document value.
    globalThis.__explanationReport = null
    stored.set('yojnasetu-preflight-profile',JSON.stringify({age:'30'}))
    const draftMarkup = renderToStaticMarkup(React.createElement(PreflightReport,{scheme:schemes[0],initialProfile:{age:25},profileSources:{age:'document-confirmed'},documents:[],documentReadiness:null}))
    assert.match(draftMarkup,/value="30"/)
    assert.match(draftMarkup,/earlier origin not recorded/)
    assert.doesNotMatch(draftMarkup,/Document value confirmed by you/)
  } finally {
    delete globalThis.__explanationReport
    delete globalThis.sessionStorage
    await rm(scratch,{recursive:true,force:true})
  }
})
