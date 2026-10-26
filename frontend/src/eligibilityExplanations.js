// Presentation only: statuses and reasons always come from the existing engine.
// This module describes metadata; it never evaluates a profile or predicts an overall result.
const fieldLabels = {
  age: 'Age in completed years', state: 'State of residence',
  annual_family_income_inr: 'Annual family income (INR)', parental_income_inr: 'Annual parental income from all sources (INR)',
  education_level: 'Education level', occupation: 'Occupation', category: 'Social category',
  indian_citizen: 'Indian citizenship', has_savings_bank_account: 'Savings bank or post office savings account status',
  is_income_taxpayer: 'Current or previous income-tax payer status on the application date',
  gender: 'Gender', poor_household_declaration: 'Poor-household deprivation declaration status',
  household_has_existing_lpg_connection: 'Existing LPG connection in the household',
  school_class: 'School class at the selection stage', school_type: 'School type',
  passed_nmmss_selection_test: 'Applicable State/UT selection-test requirement status',
  meets_nmmss_marks_requirement: 'Class VII marks requirement status, including applicable relaxation',
  family_owns_cultivable_land: 'Family ownership of cultivable land',
  has_qualifying_pm_kisan_land_record: 'Applicable land-record date and succession requirement status',
  pm_kisan_exclusion_applies: 'Whether a PM-KISAN exclusion applies',
  admitted_to_eligible_qhei: 'Admission to an eligible QHEI in India',
  admission_by_merit: 'Admission through merit or an open competitive examination',
  programme_type: 'Programme type',
}

const sourceAliases = { annual_family_income_inr: 'income', education_level: 'education' }
const editableFields = new Set(['age', 'state', 'annual_family_income_inr', 'education_level', 'occupation', 'category'])
const present = (value) => value !== null && value !== undefined && value !== ''
const scalar = (value) => typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && value.trim() !== '')
const unavailable = 'The system cannot determine the hypothetical outcome from available information. The matching rule metadata is missing, incomplete, or unsupported.'

export function describeOrigin(origin) {
  return ({
    'document-confirmed': 'Document value confirmed by you',
    'manually-entered': 'User-provided answer',
    'report-entered': 'Entered in the report',
    'report-reviewed': 'Reviewed report draft; earlier origin not recorded',
  })[origin] || 'Submitted answer; origin not recorded'
}

export function profileOrigin(sources, attribute) {
  return sources?.[attribute] || sources?.[sourceAliases[attribute]]
}

// Bind explanations to the submitted request, not a later draft or storage update.
export function createExplanationContext({ profile, profileSources = {}, documents = [], scheme }) {
  return JSON.parse(JSON.stringify({ profile, profileSources, documents: Array.isArray(documents) ? documents : [], scheme }))
}

function displayValue(value, attribute) {
  if (typeof value === 'boolean') return value ? 'Yes (true)' : 'No (false)'
  // Locale formatting rounds fractional values by default. Preserve the exact
  // encoded comparison value rather than presenting a rounded threshold.
  if (typeof value === 'number') return `${attribute?.endsWith('_inr') ? '₹' : ''}${Number.isInteger(value) ? value.toLocaleString('en-IN') : String(value)}`
  if (typeof value === 'string') return `“${value}”`
  return 'an unusable value'
}

function describeCondition(rule) {
  if (!rule || !Object.hasOwn(rule, 'value')) return null
  const { operator, value, attribute } = rule
  const expected = displayValue(value, attribute)
  if (['min', 'max'].includes(operator) && typeof value === 'number' && Number.isFinite(value)) {
    return operator === 'min'
      ? { pass: `is at least ${expected} (inclusive)`, fail: `is below ${expected}`, note: 'The comparison requires a numeric value.' }
      : { pass: `is at most ${expected} (inclusive)`, fail: `is above ${expected}`, note: 'The comparison requires a numeric value.' }
  }
  if (operator === 'equals' && scalar(value)) {
    return {
      pass: `equals ${expected}`,
      fail: typeof value === 'boolean' ? `equals ${displayValue(!value, attribute)}` : `does not equal ${expected}`,
      note: typeof value === 'boolean'
        ? 'Only a yes/no condition is encoded. How to establish that fact, including underlying thresholds or exceptions, is not encoded here; consult the official guidelines.'
        : typeof value === 'string' ? 'Text comparisons ignore capitalization and surrounding spaces.' : 'The comparison requires the recorded numeric value.',
    }
  }
  if (['in', 'state_in'].includes(operator) && Array.isArray(value) && value.length && value.every(scalar)) {
    const options = value.map((item) => displayValue(item, attribute)).join(', ')
    return { pass: `is one of: ${options}`, fail: `is outside that recorded list`, note: 'Text comparisons ignore capitalization and surrounding spaces.' }
  }
  return null
}

function rulePriority(rule) {
  if (rule.status === 'FAIL' && rule.mandatory) return 0
  if (rule.status === 'UNKNOWN' && rule.mandatory) return rule.canReviewProfile ? 1 : 2
  if (rule.status === 'FAIL') return 3
  return rule.status === 'UNKNOWN' ? 4 : 5
}

export function explainEligibility(result, context = {}) {
  const { profile, profileSources = {}, documents = [], scheme } = context || {}
  const hasSnapshot = profile != null
  const matchingScheme = scheme?.scheme_id === result.scheme_id ? scheme : null
  const rules = (result.rule_results || []).map((outcome) => {
    const { attribute, status } = outcome
    const field = fieldLabels[attribute] || attribute?.replaceAll('_', ' ') || 'Unspecified profile field'
    const matches = matchingScheme?.eligibility_rules?.filter((rule) => rule.rule_id === outcome.rule_id && rule.attribute === attribute) || []
    const metadata = matches.length === 1 ? matches[0] : null
    const condition = describeCondition(metadata)
    const value = profile?.[attribute]
    const supplied = hasSnapshot && present(value)
    const origin = supplied ? describeOrigin(profileOrigin(profileSources, attribute)) : null
    const currentSituation = !hasSnapshot ? 'The submitted profile snapshot is unavailable; the engine reason below remains authoritative.'
      : supplied ? `${field} submitted for this check: ${displayValue(value, attribute)}. ${origin}.`
        : `No ${field.toLowerCase()} was submitted for this check. No value is assumed.`
    const documentValues = documents.flatMap((document) => {
      const extracted = document.extracted_fields?.[attribute]
      if (!present(extracted?.value)) return []
      return [{ filename: document.filename, value: displayValue(extracted.value, attribute), page: extracted.source_page,
        confidence: extracted.confidence, needsReview: extracted.confidence == null || extracted.confidence < 0.7 }]
    })
    const canReviewProfile = editableFields.has(attribute) && Boolean(condition)
    const informationNeeded = status !== 'UNKNOWN' ? null : !hasSnapshot
      ? `Review ${field.toLowerCase()} and run the check again to capture its submitted value.`
      : supplied ? `Review and confirm a usable ${field.toLowerCase()}. A value was submitted, but the engine could not evaluate this condition; use its reason below.`
        : `Supply and confirm ${field.toLowerCase()}. An upload or an assumption alone is not a submitted answer.`
    let nextStep = null
    if (status === 'FAIL') {
      nextStep = `Review the submitted ${field.toLowerCase()} against “${outcome.label}” and the official source. Correct only factual or extraction errors, then rerun the check if needed.`
    } else if (status === 'UNKNOWN') {
      nextStep = !condition ? 'Consult the official scheme guidelines: supplying a value alone may not resolve missing or unsupported rule metadata.'
        : canReviewProfile ? `Review and confirm ${field.toLowerCase()} in the existing profile form, then rerun the check.`
          : `Consult the official scheme guidelines to establish ${field.toLowerCase()}. The current forms do not collect this field, so this check will leave it UNKNOWN.`
    }
    if (attribute === 'parental_income_inr' && status === 'UNKNOWN') {
      nextStep += ' Annual family income is a different field and is not substituted for parental income.'
    }
    if (status === 'UNKNOWN' && documentValues.length) {
      nextStep += ' Review the original document and its extracted value in Document Assistant; extraction alone does not resolve this rule.'
    }
    return {
      ...outcome, field, currentSituation, informationNeeded, documentValues, canReviewProfile,
      whyItMatters: condition ? `The recorded rule passes when ${field.toLowerCase()} ${condition.pass}.` : unavailable,
      metadataNote: condition?.note,
      possibleOutcomes: status === 'UNKNOWN' ? condition ? [
        `If the genuine, confirmed ${field.toLowerCase()} ${condition.pass}, this rule would return PASS.`,
        `If the genuine, confirmed ${field.toLowerCase()} ${condition.fail}, this rule would return FAIL.`,
        'Without a usable answer, this condition remains UNKNOWN.',
      ] : [unavailable] : [],
      nextStep,
    }
  }).sort((a, b) => rulePriority(a) - rulePriority(b))

  const failedMandatory = rules.filter((rule) => rule.mandatory && rule.status === 'FAIL')
  const unknownMandatory = rules.filter((rule) => rule.mandatory && rule.status === 'UNKNOWN')
  const mandatory = rules.filter((rule) => rule.mandatory)
  const outcomeExplanation = failedMandatory.length
    ? `A mandatory FAIL already determines the current result: ${failedMandatory.map((rule) => rule.label).join('; ')}. Resolving other UNKNOWN conditions alone cannot change that result while this failure remains. These failures describe submitted information, not independent verification of the facts.`
    : !mandatory.length ? 'There are no evaluated mandatory conditions available to establish eligibility. Consult the official scheme guidelines.'
      : unknownMandatory.length ? 'No mandatory condition returned FAIL, but mandatory conditions remain UNKNOWN. Missing information is not proof of ineligibility.'
        : 'The engine reports that the encoded mandatory conditions pass. This covers only those conditions and does not establish official eligibility or approval.'
  const nextSteps = rules.filter((rule) => rule.nextStep)
    .filter((rule, index, items) => items.findIndex((item) => item.attribute === rule.attribute && item.status === rule.status) === index)
  const sourceCandidates = [...(result.source_references || []), ...(matchingScheme?.official_source_url ? [{ url: matchingScheme.official_source_url, name: matchingScheme.name }] : [])]
  const sources = sourceCandidates.filter((source, index) => /^https?:\/\//.test(source.url || '') && sourceCandidates.findIndex((item) => item.url === source.url) === index)
  const documentWarnings = unknownMandatory.length ? documents.flatMap((document) => (document.warnings || []).map((warning) => ({ filename: document.filename, warning }))) : []
  return { rules, outcomeExplanation, nextSteps, sources, documentWarnings, hasBlockingFailure: failedMandatory.length > 0 }
}
