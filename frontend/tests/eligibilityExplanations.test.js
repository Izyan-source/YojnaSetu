import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createExplanationContext, explainEligibility, describeOrigin } from '../src/eligibilityExplanations.js'

const backend = fileURLToPath(new URL('../../backend/', import.meta.url))
const schemes = JSON.parse(readFileSync(new URL('../../backend/data/schemes.json', import.meta.url)))
const apy = schemes[0]
const nmmss = schemes.find((scheme) => scheme.scheme_id === 'national-means-cum-merit-scholarship')
// Exercise the actual unchanged Python engine, rather than inventing its results.
function evaluate(scheme, profile) {
  return JSON.parse(execFileSync('python3', ['-c', 'import json,sys; from app.eligibility import evaluate_scheme; data=json.load(sys.stdin); print(json.dumps(evaluate_scheme(data["scheme"], data["profile"])))'], {
    cwd: backend, input: JSON.stringify({ scheme, profile }), encoding: 'utf8',
  }))
}
function explain(scheme, profile, extra = {}) {
  const result = evaluate(scheme, profile)
  return { result, explanation: explainEligibility(result, createExplanationContext({ scheme, profile, ...extra })) }
}
function singleRule(operator, value, extra = {}) {
  return { ...apy, eligibility_rules: [{ rule_id: 'example', label: 'Test condition', attribute: 'age', operator, value, mandatory: true, ...extra }] }
}

test('mandatory FAIL remains decisive when other facts are UNKNOWN', () => {
  const { result, explanation } = explain(apy, { age:16 }, { profileSources:{age:'manually-entered'} })
  assert.equal(result.status, 'NOT_ELIGIBLE')
  assert.equal(explanation.rules[0].status, 'FAIL')
  assert.match(explanation.outcomeExplanation, /UNKNOWN conditions alone cannot change/)
  assert.match(explanation.rules[0].currentSituation, /16.*User-provided/)
  assert.match(explanation.rules[0].whyItMatters, /at least 18 \(inclusive\)/)
  assert.deepEqual(explanation.rules[0].possibleOutcomes, [])
})

test('all missing remains UNKNOWN and actions identify fields unavailable in current forms', () => {
  const { result, explanation } = explain(apy, {})
  assert.equal(result.status, 'UNDETERMINED')
  assert.ok(explanation.rules.every((rule) => rule.status === 'UNKNOWN'))
  assert.match(explanation.outcomeExplanation, /Missing information is not proof of ineligibility/)
  assert.equal(explanation.nextSteps.filter((rule) => rule.attribute === 'age').length, 1)
  const citizenship = explanation.rules.find((rule) => rule.attribute === 'indian_citizen')
  assert.match(citizenship.informationNeeded, /Indian citizenship/i)
  assert.match(citizenship.nextStep, /current forms do not collect/)
  assert.equal(citizenship.canReviewProfile, false)
})

test('parental income threshold is exact and family income is never substituted', () => {
  const { result, explanation } = explain(nmmss, { annual_family_income_inr:100000 })
  const rule = explanation.rules.find((item) => item.attribute === 'parental_income_inr')
  assert.equal(rule.status, 'UNKNOWN')
  assert.match(rule.currentSituation, /No annual parental income/)
  assert.match(rule.possibleOutcomes[0], /at most ₹3,50,000 \(inclusive\)/)
  assert.match(rule.possibleOutcomes[1], /above ₹3,50,000/)
  assert.match(rule.nextStep, /not substituted for parental income/)
  assert.equal(evaluate(nmmss, {parental_income_inr:350000}).rule_results[0].status, 'PASS')
  assert.equal(evaluate(nmmss, {parental_income_inr:350001}).rule_results[0].status, 'FAIL')
  assert.equal(result.rule_results[0].status, 'UNKNOWN')
})

test('zero and false are provided values, not missing information', () => {
  const { explanation } = explain(apy, {age:0, is_income_taxpayer:false})
  const age = explanation.rules.find((rule) => rule.rule_id === 'apy_min_age')
  const tax = explanation.rules.find((rule) => rule.attribute === 'is_income_taxpayer')
  assert.equal(age.status, 'FAIL')
  assert.match(age.currentSituation, /check: 0/)
  assert.equal(tax.status, 'PASS')
  assert.match(tax.currentSituation, /No \(false\)/)
  assert.equal(tax.informationNeeded, null)
})

test('boolean hypothetical outcomes follow the actual false comparison', () => {
  const { explanation } = explain(apy, {})
  const tax = explanation.rules.find((rule) => rule.attribute === 'is_income_taxpayer')
  assert.match(tax.possibleOutcomes[0], /equals No \(false\).*PASS/)
  assert.match(tax.possibleOutcomes[1], /equals Yes \(true\).*FAIL/)
  assert.match(tax.metadataNote, /underlying thresholds or exceptions.*not encoded/)
})

test('compound boolean criteria do not invent score cutoffs or dates', () => {
  const { explanation } = explain(nmmss, {})
  const marks = explanation.rules.find((rule) => rule.attribute === 'meets_nmmss_marks_requirement')
  assert.match(marks.metadataNote, /not encoded here/)
  assert.doesNotMatch(marks.possibleOutcomes.join(' '), /55|50|percent|%/)
})

test('supported numeric, equality, and membership operators describe exact metadata', () => {
  for (const [operator, value, phrase] of [
    ['min',18,/at least 18/], ['max',40,/at most 40/], ['max',40.123456,/at most 40\.123456/], ['equals',8,/equals 8/],
    ['equals','Student',/equals “Student”/], ['in',['degree','diploma'],/“degree”, “diploma”/],
    ['state_in',['Assam','Meghalaya'],/“Assam”, “Meghalaya”/],
  ]) {
    const { explanation } = explain(singleRule(operator, value), {})
    assert.match(explanation.rules[0].possibleOutcomes[0], phrase)
    assert.match(explanation.rules[0].possibleOutcomes[2], /UNKNOWN/)
  }
})

test('unsupported operator and invalid supplied type retain the actual engine reason', () => {
  const unsupported = explain(singleRule('unimplemented',18), {age:20})
  assert.match(unsupported.explanation.rules[0].explanation, /unsupported operator/)
  assert.match(unsupported.explanation.rules[0].possibleOutcomes[0], /cannot determine/)
  assert.equal(unsupported.explanation.rules[0].canReviewProfile, false)
  const invalid = explain(singleRule('min',18), {age:'unreadable'})
  assert.equal(invalid.explanation.rules[0].status, 'UNKNOWN')
  assert.match(invalid.explanation.rules[0].explanation, /could not be compared/)
  assert.match(invalid.explanation.rules[0].currentSituation, /“unreadable”/)
})

test('missing, mismatched, duplicate, or incomplete metadata cannot create hypothetical outcomes', () => {
  const result = evaluate(apy, {})
  for (const scheme of [undefined, {...apy,scheme_id:'other'}, {...apy,eligibility_rules:[]},
    {...apy, eligibility_rules: apy.eligibility_rules.map(({value,...rule}) => rule)},
    {...apy, eligibility_rules:[...apy.eligibility_rules, ...apy.eligibility_rules]},
  ]) {
    const explanation = explainEligibility(result, {profile:{}, scheme})
    assert.ok(explanation.rules.every((rule) => rule.possibleOutcomes.length === 1 && rule.possibleOutcomes[0].includes('cannot determine')))
  }
})

test('malformed comparison metadata falls back without parsing a threshold from its label', () => {
  const result = evaluate(singleRule('max',40), {})
  for (const [operator, value] of [['max','40'], ['equals',null], ['equals',{}], ['in',[]], ['in',[null]]]) {
    const explanation = explainEligibility(result, {profile:{}, scheme:singleRule(operator,value)})
    assert.match(explanation.rules[0].possibleOutcomes[0], /cannot determine/)
  }
})

test('OCR is contextual evidence and never a replacement for missing profile answers', () => {
  const documents = [{filename:'scan.pdf', reviewed_values:{age:'25'}, extracted_fields:{age:{value:'25',confidence:0.4,source_page:2}}, warnings:['Page appears unreadable.']}]
  const { result, explanation } = explain(apy, {}, {documents})
  assert.equal(result.rule_results[0].status, 'UNKNOWN')
  const rule = explanation.rules.find((item) => item.rule_id === 'apy_min_age')
  assert.match(rule.currentSituation, /No age/)
  assert.equal(rule.documentValues[0].needsReview, true)
  assert.equal(rule.documentValues[0].confidence, 0.4)
  assert.equal(rule.documentValues[0].page, 2)
  assert.match(rule.nextStep, /extraction alone does not resolve/)
  assert.equal(explanation.documentWarnings[0].warning, 'Page appears unreadable.')
})

test('confirmed document provenance is distinct from raw extraction and manual answers', () => {
  const { explanation } = explain(apy, {age:25}, {profileSources:{age:'document-confirmed'}, documents:[{filename:'scan.pdf',extracted_fields:{age:{value:'52',confidence:null}}}]})
  const rule = explanation.rules.find((item) => item.rule_id === 'apy_min_age')
  assert.match(rule.currentSituation, /25.*Document value confirmed by you/)
  assert.equal(rule.documentValues[0].value, '“52”')
  assert.equal(rule.documentValues[0].needsReview, true)
  assert.equal(describeOrigin('report-entered'), 'Entered in the report')
  assert.match(describeOrigin('report-reviewed'), /earlier origin not recorded/)
})

test('explanations are bound to a submitted snapshot and do not mutate engine output', () => {
  const input = {profile:{age:16}, profileSources:{age:'document-confirmed'}, scheme:structuredClone(apy), documents:[]}
  const result = evaluate(apy, input.profile)
  const before = structuredClone(result)
  const snapshot = createExplanationContext(input)
  input.profile.age = 25
  input.profileSources.age = 'manually-entered'
  input.scheme.eligibility_rules[0].value = 10
  const explanation = explainEligibility(result, snapshot)
  assert.match(explanation.rules[0].currentSituation, /16.*Document value confirmed by you/)
  assert.match(explanation.rules[0].whyItMatters, /at least 18/)
  assert.deepEqual(result, before)
  assert.match(explainEligibility(result, null).rules[0].currentSituation, /snapshot is unavailable/)
})

test('optional failures do not become mandatory blockers and no-rules is not approval', () => {
  const scheme = {...apy,eligibility_rules:[apy.eligibility_rules[0], {...apy.eligibility_rules[1],mandatory:false}]}
  const { result, explanation } = explain(scheme, {age:50})
  assert.equal(result.status, 'POTENTIALLY_ELIGIBLE')
  assert.equal(explanation.hasBlockingFailure, false)
  assert.match(explanation.outcomeExplanation, /does not establish official eligibility or approval/)
  assert.match(explain({...apy,eligibility_rules:[]}, {}).explanation.outcomeExplanation, /no evaluated mandatory conditions/)
})

test('only existing official references are reused, without duplicate or invented citations', () => {
  const { result, explanation } = explain(apy, {})
  assert.deepEqual(explanation.sources, result.source_references)
  assert.equal(explainEligibility({...result, source_references:[]}, {profile:{}}).sources.length, 0)
})

test('all actual scheme rule statuses and reasons survive explanation generation', () => {
  for (const scheme of schemes) {
    const { result, explanation } = explain(scheme, {})
    for (const rule of result.rule_results) {
      const described = explanation.rules.find((item) => item.rule_id === rule.rule_id)
      assert.equal(described.status, rule.status)
      assert.equal(described.explanation, rule.explanation)
      assert.match(described.possibleOutcomes[0], /this rule would return PASS/)
    }
  }
})
