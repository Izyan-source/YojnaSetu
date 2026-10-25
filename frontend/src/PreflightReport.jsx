import { useState } from 'react'

const fieldLabels = {
  applicant_name: 'Applicant name', date_of_birth: 'Date of birth', age: 'Age', address: 'Address', state: 'State',
  annual_family_income_inr: 'Annual family income (INR)', certificate_type: 'Certificate type', issuing_authority: 'Issuing authority',
  certificate_date: 'Certificate or issue date', certificate_valid_until: 'Certificate valid-until date', certificate_number: 'Certificate/reference number',
  education_level: 'Education level', occupation: 'Occupation', category: 'Social category',
}

const eligibilityStatus = {
  POTENTIALLY_ELIGIBLE: 'Potentially eligible', NOT_ELIGIBLE: 'Not eligible', UNDETERMINED: 'Undetermined',
}

const consistencyStatus = {
  CONSISTENT: 'Consistent', POTENTIAL_MISMATCH: 'Potential mismatch', MISSING_INFORMATION: 'Missing information', UNABLE_TO_VERIFY: 'Unable to verify',
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.detail || `Request failed with status ${response.status}`)
  return data
}

function includedProfile(profile) {
  return Object.fromEntries(Object.entries(profile).filter(([, value]) => String(value ?? '').trim() !== ''))
}

export default function PreflightReport({ scheme, initialProfile, profileSources, documents, documentReadiness }) {
  const [profile, setProfile] = useState(() => {
    try { return { ...initialProfile, ...JSON.parse(sessionStorage.getItem('yojnasetu-preflight-profile') || '{}') } } catch { return initialProfile }
  })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [evidenceNotice, setEvidenceNotice] = useState('')

  function updateProfile(field, value) {
    setProfile((current) => {
      const updated = { ...current, [field]: value }
      sessionStorage.setItem('yojnasetu-preflight-profile', JSON.stringify(updated))
      return updated
    })
    setDirty(true)
  }

  async function generateReport(event) {
    event.preventDefault()
    if (!scheme) {
      setError('The selected scheme details are not available. Reload the scheme list and try again.')
      return
    }
    setError('')
    setEvidenceNotice('')
    const confirmed = includedProfile(profile)
    if (confirmed.age !== undefined && (!/^\d+$/.test(String(confirmed.age)) || Number(confirmed.age) > 120)) {
      setError('Age must be a whole number from 0 to 120.')
      return
    }
    if (confirmed.annual_family_income_inr !== undefined && (!/^\d+$/.test(String(confirmed.annual_family_income_inr)) || Number(confirmed.annual_family_income_inr) > 1000000000)) {
      setError('Annual family income must be a whole amount from ₹0 to ₹1,000,000,000.')
      return
    }
    setDirty(true)
    setLoading(true)
    const eligibilityProfile = { ...confirmed }
    delete eligibilityProfile.applicant_name
    delete eligibilityProfile.date_of_birth
    delete eligibilityProfile.address
    delete eligibilityProfile.certificate_type
    delete eligibilityProfile.issuing_authority
    delete eligibilityProfile.certificate_date
    delete eligibilityProfile.certificate_valid_until
    delete eligibilityProfile.certificate_number
    if (eligibilityProfile.age !== undefined) eligibilityProfile.age = Number(eligibilityProfile.age)
    if (eligibilityProfile.annual_family_income_inr !== undefined) eligibilityProfile.annual_family_income_inr = Number(eligibilityProfile.annual_family_income_inr)

    const consistencyProfile = Object.fromEntries(Object.entries(confirmed).filter(([key]) => key in fieldLabels && !['education_level', 'occupation', 'category'].includes(key)))
    const docs = documents.map(({ filename, extracted_fields }) => ({ filename, extracted_fields }))
    try {
      const [eligibility, consistency] = await Promise.all([
        fetch('/api/eligibility/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: eligibilityProfile, scheme_id: scheme.scheme_id }) }).then(readResponse),
        fetch('/api/documents/consistency-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile: consistencyProfile, documents: docs }) }).then(readResponse),
      ])

      let evidence = null
      const ruleLabels = scheme.eligibility_rules?.map((rule) => rule.label).join('; ')
      const docLabels = scheme.required_documents?.join('; ')
      const question = `What do the available ${scheme.name} source documents state about these eligibility conditions and documents: ${ruleLabels || 'scheme eligibility'}; ${docLabels || 'document requirements'}?`.slice(0, 1200)
      try {
        const response = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, scheme_id: scheme.scheme_id }) })
        evidence = await readResponse(response)
      } catch (evidenceError) {
        setEvidenceNotice(evidenceError.message || 'Retrieved source evidence is unavailable right now.')
      }

      const selectedResult = eligibility.results?.[0]
      if (!selectedResult) throw new Error('The eligibility service returned no result for this scheme.')
      setReport({ eligibility: selectedResult, consistency, evidence, profile: confirmed, generatedAt: new Date().toLocaleString() })
      setDirty(false)
    } catch (requestError) {
      setError(requestError.message || 'Could not generate the preflight report. Check that the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const source = scheme?.official_source_url
  const ruleResults = report?.eligibility.rule_results ?? []
  const unknownRules = ruleResults.filter((rule) => rule.status === 'UNKNOWN')
  const failedRules = ruleResults.filter((rule) => rule.status === 'FAIL')
  const attentionFindings = report?.consistency.findings.filter((finding) => finding.status !== 'CONSISTENT') ?? []
  const requirements = report?.eligibility.document_readiness.required_documents ?? []
  const readinessMatches = documentReadiness?.scheme_id === scheme.scheme_id && documentReadiness.mapping_confirmed && requirements.includes(documentReadiness.mapped_requirement)
  const availableDocuments = readinessMatches ? [documentReadiness.mapped_requirement] : []
  const missingDocuments = requirements.filter((item) => !availableDocuments.includes(item))
  const uncertainDocuments = documents.filter((document) => !readinessMatches || (documentReadiness?.local_id ? document.local_id !== documentReadiness.local_id : document.filename !== documentReadiness?.file_name))
  const recommendations = [
    ...(unknownRules.length ? ['Provide or confirm the information needed for: ' + unknownRules.map((rule) => rule.label).join(', ') + '.'] : []),
    ...(failedRules.length ? ['Review the failed encoded conditions and their official source before deciding what to do next.'] : []),
    ...(missingDocuments.length ? ['Check the official scheme source for the current document requirements and prepare items not marked available here.'] : []),
    ...(attentionFindings.length ? ['Review the consistency findings below against the original documents; correct the profile and regenerate if needed.'] : []),
    ...(report?.evidence?.status !== 'ANSWERED' ? ['The indexed documents did not provide a verified answer for the report question. Consult the official source directly.'] : []),
  ]

  if (!scheme) return <section className="preflight-report" id="preflight-report" aria-labelledby="preflight-title"><p className="api-error" role="alert">Scheme details are still loading or unavailable. Reload the page after the scheme service is available.</p></section>

  return <section className="preflight-report" id="preflight-report" aria-labelledby="preflight-title">
    <div className="preflight-heading">
      <div><p className="eyebrow">BEFORE YOU APPLY</p><h2 id="preflight-title">Application preflight report</h2><p>Review profile details, encoded scheme conditions, document readiness, and document consistency together.</p></div>
      {report && <button className="button button-secondary no-print" type="button" disabled={dirty} onClick={() => window.print()}>Print / Save as PDF</button>}
    </div>

    <form className="preflight-profile no-print" onSubmit={generateReport}>
      <div className="preflight-profile-heading"><div><h3>Confirm the profile for this report</h3><p>Values below are sent to the existing eligibility and consistency services when you generate the report. Blank values remain unknown.</p></div><button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Generating report…' : report ? 'Regenerate report' : 'Generate report'}</button></div>
      <a className="text-link no-print" href="/#document-intelligence">Review or add documents</a>
      <div className="preflight-fields">{Object.entries(fieldLabels).map(([key, label]) => {
        const sourceKey = ({ annual_family_income_inr: 'income', education_level: 'education' })[key] || key
        const origin = profileSources[sourceKey]
        const originLabel = origin === 'document-confirmed' ? 'Previously reviewed document value' : origin === 'manually-entered' ? 'Entered in the assessment' : profile[key] ? 'Review and confirm this value' : 'Not provided'
        return <label key={key}>{label}<input type="text" value={profile[key] ?? ''} placeholder="Not provided" onChange={(event) => updateProfile(key, event.target.value)} /><small>{originLabel}</small></label>
      })}</div>
      {error && <p className="api-error" role="alert">{error}</p>}
      {loading && <p className="preflight-loading" role="status">Rechecking eligibility and consistency, then retrieving supporting scheme evidence…</p>}
      {report && dirty && <p className="preflight-stale" role="status">The profile changed after this report was generated. Regenerate to refresh its results.</p>}
    </form>

    {report && <div className={`preflight-content ${dirty ? 'report-stale' : ''}`}>
      <div className="preflight-meta"><span>Generated {report.generatedAt}</span><span>{documents.length} OCR document{documents.length === 1 ? '' : 's'} considered</span></div>
      <section className="report-scheme-card">
        <div><p className="eyebrow">SCHEME RECORD</p><h3>{scheme.name}</h3><p>{scheme.department}</p></div>
        <div className="report-source-fact"><span>Dataset source status: {scheme.source_verification_status?.replaceAll('_', ' ') || 'not stated'}</span><a href={source} target="_blank" rel="noreferrer">Open scheme source</a></div>
      </section>

      <section className="report-block report-outcome">
        <div className="report-block-heading"><h3>Eligibility outcome</h3><span className={`result-status result-${report.eligibility.status.toLowerCase()}`}>{eligibilityStatus[report.eligibility.status] || 'Undetermined'}</span></div>
        <p>{report.eligibility.summary}</p>
        <p className="report-separation-note">This is the existing deterministic rule result. Document readiness and consistency findings do not alter it.</p>
      </section>

      <section className="report-block">
        <h3>Eligibility checklist</h3>
        <div className="preflight-rule-list">{ruleResults.map((rule) => <details className="preflight-rule" key={rule.rule_id}>
          <summary><span className={`rule-status rule-${rule.status.toLowerCase()}`}>{rule.status}</span><strong>{rule.label}</strong><span className="expand-hint">Details</span></summary>
          <div><p>{rule.explanation}</p>{report.eligibility.source_references?.[0]?.url ? <a href={report.eligibility.source_references[0].url} target="_blank" rel="noreferrer">Rule source: {report.eligibility.source_references[0].name}</a> : <small>No official source reference is available for this rule.</small>}</div>
        </details>)}</div>
      </section>

      <section className="report-block">
        <h3>Document checklist</h3>
        {requirements.length ? <><p className="report-separation-note">Readiness is based only on the item you explicitly marked after reviewing an upload. It does not verify authenticity.</p><ul className="report-checklist">{availableDocuments.map((item) => <li className="readiness-available" key={`available-${item}`}><strong>Available for review</strong><span>{item}</span></li>)}{missingDocuments.map((item) => <li className="readiness-missing" key={`missing-${item}`}><strong>Missing / not provided here</strong><span>{item}</span></li>)}{uncertainDocuments.map((item) => <li className="readiness-uncertain" key={`uncertain-${item.local_id}`}><strong>Uncertain document mapping</strong><span>{item.filename} was not matched to a required item.</span></li>)}</ul><p>{report.eligibility.document_readiness.note}</p></> : <p>{scheme.documents_note || 'No document checklist is encoded for this scheme.'}</p>}
        {documentReadiness?.quality_warnings?.filter((warning) => /expired|validity/i.test(warning)).map((warning, index) => <p className="consistency-expiry" key={`expiry-warning-${index}`}>{warning}</p>)}
      </section>

      <section className="report-block">
        <h3>Cross-document consistency</h3>
        <p className="report-separation-note">Potential mismatches are prompts for manual review; they do not establish falsification or intent.</p>
        {attentionFindings.length ? <div className="report-consistency-list">{attentionFindings.map((finding) => <details key={finding.field} className="report-consistency-item" open={finding.status === 'POTENTIAL_MISMATCH' || finding.status === 'UNABLE_TO_VERIFY'}>
          <summary><strong>{finding.label}</strong><span className={`consistency-status status-${finding.status.toLowerCase()}`}>{consistencyStatus[finding.status]}</span>{finding.manual_review && <span className="manual-review">Manual review</span>}</summary>
          <p>{finding.explanation}</p><ul>{finding.values.map((value, index) => <li key={`${value.source}-${index}`}><span>{value.source}</span><strong>{value.value ?? 'Missing'}</strong>{value.confidence != null && value.source !== 'Reviewed applicant profile' && <small>{Math.round(value.confidence * 100)}% OCR confidence</small>}</li>)}</ul>
        </details>)}</div> : <p>No inconsistencies requiring attention were returned by the checker.</p>}
        {report.consistency.expiry_reviews?.map((item, index) => <div className="consistency-expiry" key={`expiry-${index}`}><strong>Explicit valid-until date needs review</strong><p>{item.source}: {item.valid_until}. {item.explanation}</p></div>)}
      </section>

      <section className="report-block">
        <h3>Information sources and assumptions</h3>
        <details className="report-source-details"><summary>User-confirmed profile values</summary><dl>{Object.entries(report.profile).map(([key, value]) => <div key={key}><dt>{fieldLabels[key] || key.replaceAll('_', ' ')}</dt><dd>{value}</dd></div>)}</dl><p>These values were supplied or confirmed in the report form.</p></details>
        {documents.map((document) => <details className="report-source-details" key={document.local_id || document.filename}><summary>OCR extraction · {document.filename} · original extraction</summary><p>Extracted text is unverified and may be incomplete. Confidence and page values are from the OCR analysis.</p><dl>{Object.entries(document.extracted_fields || {}).filter(([, field]) => field?.value != null).map(([key, field]) => <div key={key}><dt>{fieldLabels[key] || key.replaceAll('_', ' ')}</dt><dd>{String(field.value)}{field.source_page ? ` · page ${field.source_page}` : ''}{field.confidence != null ? ` · ${Math.round(field.confidence * 100)}% confidence` : ''}</dd></div>)}</dl></details>)}
        <details className="report-source-details"><summary>Retrieved evidence from indexed scheme documents</summary>
          {report.evidence?.status === 'ANSWERED' ? <><p>{report.evidence.answer}</p><p className="report-separation-note">Extractive response from retrieved text; use the linked document to confirm the current terms.</p><ul className="report-citations">{report.evidence.sources?.map((citation, index) => <li key={`${citation.source_url}-${citation.page_number}-${index}`}><a href={citation.source_url} target="_blank" rel="noreferrer">{citation.document_title}{citation.page_number ? ` · page ${citation.page_number}` : ''}</a><blockquote>{citation.excerpt}</blockquote></li>)}</ul></> : <p>{report.evidence?.answer || evidenceNotice || 'No retrieved document evidence is available. No citation has been inferred.'}</p>}
        </details>
        <details className="report-source-details"><summary>Unresolved assumptions</summary><p>Unknown eligibility conditions remain unknown. OCR values are not treated as verified identity or authenticity. The report does not add requirements, deadlines, or eligibility rules beyond the selected scheme record and retrieved source excerpts.</p></details>
      </section>

      <section className="report-block report-recommendations">
        <h3>Next steps</h3>
        {recommendations.length ? <ol>{recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ol> : <p>Review the official source for current application instructions and submit through the official channel if you decide to proceed.</p>}
      </section>
      <p className="preflight-disclaimer">This preflight report is informational only. It is not a government decision and does not guarantee eligibility or approval. Confirm current requirements with the official source.</p>
      <div className="preflight-actions no-print"><button className="button button-secondary" type="button" disabled={dirty} onClick={() => window.print()}>Print / Save as PDF</button><button className="button button-primary" type="button" onClick={generateReport} disabled={loading}>{loading ? 'Regenerating…' : 'Regenerate report'}</button></div>
    </div>}
  </section>
}
