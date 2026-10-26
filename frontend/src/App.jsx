import { useEffect, useState } from 'react'
import PreflightReport from './PreflightReport.jsx'
import { decodeSegment, useNavigation } from './navigation.js'
import { Icon, Brand, ButtonLink, PageIntro, SourceBadge, RuleBadge, RuleLegend } from './ui.jsx'
import HomePage from './HomePage.jsx'

const states = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry']
const educationLevels = ['No formal schooling', 'Primary', 'Secondary', 'Higher secondary', 'Diploma / vocational', 'Undergraduate', 'Postgraduate or above']
const occupations = ['Student', 'Employed', 'Self-employed', 'Agriculture', 'Seeking employment', 'Homemaker', 'Retired', 'Other']
const socialCategories = ['Scheduled Caste (SC)', 'Scheduled Tribe (ST)', 'Other Backward Class (OBC)', 'General', 'Other category', 'Prefer not to say']

function HealthStatus({ health }) {
  const messages = {
    checking: 'Checking service status',
    online: 'Service connected',
    offline: 'Service not connected',
  }
  return <span className={`health-status health-${health.state}`} role="status" aria-live="polite">
    <span className="health-dot" />{messages[health.state]}
  </span>
}

function Header({ health, currentPath }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  useEffect(closeMenu, [currentPath])
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
        document.querySelector('.menu-toggle')?.focus()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])
  return <header className="site-header">
    <div className="header-inner">
      <Brand />
      <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>
        <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
      </button>
      <nav id="main-navigation" className={`main-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
        <a href="/" aria-current={currentPath === '/' ? 'page' : undefined} onClick={closeMenu}>Home</a>
        <a href="/explore" aria-current={currentPath.startsWith('/explore') ? 'page' : undefined} onClick={closeMenu}>Explore Schemes</a>
        <a href="/eligibility" aria-current={currentPath === '/eligibility' ? 'page' : undefined} onClick={closeMenu}>Check Eligibility</a>
        <a href="/documents" aria-current={currentPath === '/documents' ? 'page' : undefined} onClick={closeMenu}>Document Assistant</a>
        <a href="/application" aria-current={currentPath === '/application' ? 'page' : undefined} onClick={closeMenu}>My Application</a>
        <HealthStatus health={health} />
      </nav>
    </div>
  </header>
}

function AskSection({ schemes }) {
  const [question, setQuestion] = useState('')
  const [schemeId, setSchemeId] = useState(() => sessionStorage.getItem('yojnasetu-selected-scheme') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function askQuestion(event) {
    event.preventDefault()
    if (question.trim().length < 3) {
      setError('Enter a question with at least 3 characters.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), ...(schemeId ? { scheme_id: schemeId } : {}) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || `Request failed with status ${response.status}`)
      setResult(data)
    } catch (requestError) {
      setError(requestError.message || 'The answer service is unavailable. Check that the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return <section className="ask-section section-wrap" id="ask">
    <div className="ask-heading"><p className="eyebrow">03 / SCHEME Q&A</p><h2>Answers with<br /><em>their sources.</em></h2><p>Answers use retrieved text from the local scheme document index. If the documents do not support an answer, YojnaSetu will say so.</p></div>
    <form className="ask-form" onSubmit={askQuestion}>
      <label htmlFor="ask-question">Your question</label>
      <textarea id="ask-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1200} rows={3} placeholder="For example: What does the APY document say about the joining age?" required />
      <div className="ask-form-row">
        <label className="ask-scheme-label" htmlFor="ask-scheme">Scheme (optional)
          <select id="ask-scheme" value={schemeId} onChange={(event) => setSchemeId(event.target.value)}><option value="">All indexed schemes</option>{schemes.map((scheme) => <option key={scheme.scheme_id} value={scheme.scheme_id}>{scheme.name}</option>)}</select>
        </label>
        <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Searching documents…' : 'Ask question'} <Icon name="arrow" size={16} /></button>
      </div>
      {error && <p className="api-error" role="alert">{error}</p>}
      {loading && <p className="ask-loading" role="status">Searching available scheme documents…</p>}
      {result && <div className="ask-result" aria-live="polite"><span className={`result-status ${result.status === 'ANSWERED' ? 'result-potentially_eligible' : 'result-undetermined'}`}>{result.status === 'ANSWERED' ? 'Document-based response' : 'Could not verify from available documents'}</span><p className="ask-answer">{result.answer}</p>{result.notice && <p className="ask-notice">{result.notice}</p>}{result.sources?.length > 0 && <div className="ask-sources"><h3>Supporting sources</h3>{result.sources.map((source, index) => <article className="ask-source" key={`${source.source_url}-${source.page_number}-${index}`}><div><span className="citation-label">SOURCE {String(index + 1).padStart(2, '0')}</span><a href={source.source_url} target="_blank" rel="noreferrer">{source.document_title}{source.page_number ? ` · page ${source.page_number}` : ''} <Icon name="arrow" size={14} /></a><p>{source.excerpt}</p></div></article>)}</div>}</div>}
    </form>
  </section>
}

const documentFieldLabels = {
  applicant_name: 'Applicant name', date_of_birth: 'Date of birth', age: 'Age', address: 'Address', state: 'State',
  annual_family_income_inr: 'Annual family income (INR)', certificate_type: 'Certificate type',
  issuing_authority: 'Issuing authority', certificate_date: 'Certificate or issue date', certificate_valid_until: 'Certificate valid-until date', certificate_number: 'Certificate/reference number',
}

function DocumentIntelligence({ schemes, navigate, onDocumentsChange }) {
  const [analysis, setAnalysis] = useState(null)
  const [values, setValues] = useState({})
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [savedReview, setSavedReview] = useState(false)
  const [schemeId, setSchemeId] = useState(() => sessionStorage.getItem('yojnasetu-selected-scheme') || '')
  const [selectedFields, setSelectedFields] = useState({})
  const [editedFields, setEditedFields] = useState({})
  const [selectedRequirement, setSelectedRequirement] = useState('')
  const [documents, setDocuments] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('yojnasetu-document-analyses') || '[]') } catch { return [] }
  })
  useEffect(() => { onDocumentsChange?.(documents) }, [documents, onDocumentsChange])
  const selectedScheme = schemes.find((scheme) => scheme.scheme_id === schemeId)
  useEffect(() => { setSavedReview(false) }, [values, selectedFields, selectedRequirement, schemeId])

  async function analyze(selectedFile) {
    if (!selectedFile || busy) return
    if (documents.length >= 10) {
      setError('This review supports up to 10 uploaded documents. Remove a document from the browser session before adding another.')
      return
    }
    setSavedReview(false)
    setFile(selectedFile)
    setAnalysis(null)
    setValues({})
    setEditedFields({})
    setError('')
    setBusy(true)
    const body = new FormData()
    body.append('file', selectedFile)
    try {
      const response = await fetch('/api/documents/analyze', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || `Upload failed with status ${response.status}`)
      const documentRecord = { ...data, local_id: `${Date.now()}-${selectedFile.name}`, filename: selectedFile.name }
      setAnalysis(documentRecord)
      setValues(Object.fromEntries(Object.entries(data.extracted_fields).map(([key, field]) => [key, field.value ?? ''])))
      setSelectedFields(Object.fromEntries(Object.keys(data.extracted_fields).map((key) => [key, false])))
      setDocuments((current) => {
        const updated = [...current, documentRecord]
        sessionStorage.setItem('yojnasetu-document-analyses', JSON.stringify(updated))
        return updated
      })
    } catch (uploadError) {
      setError(uploadError.message || 'Could not analyze this document. Check that the backend is running.')
    } finally {
      setBusy(false)
    }
  }

  function useInAssessment(continueToAssessment = true) {
    const cleanedState = String(values.state || '').trim()
    const age = Number(values.age)
    const income = Number(values.annual_family_income_inr)
    const fields = {
      ...(selectedFields.state && cleanedState ? { state: cleanedState } : {}),
      ...(selectedFields.age && Number.isInteger(age) && age >= 0 && age <= 120 ? { age: String(age) } : {}),
      ...(selectedFields.annual_family_income_inr && Number.isInteger(income) && income >= 0 && income <= 1000000000 ? { income: String(income) } : {}),
    }
    const previous = JSON.parse(sessionStorage.getItem('yojnasetu-document-profile') || '{}')
    const previousSources = JSON.parse(sessionStorage.getItem('yojnasetu-profile-source') || '{}')
    const manuallyTouched = JSON.parse(sessionStorage.getItem('yojnasetu-manual-profile-fields') || '[]')
    sessionStorage.setItem('yojnasetu-document-profile', JSON.stringify({ ...previous, ...fields }))
    const documentSources = Object.fromEntries(Object.keys(fields).filter((key) => !manuallyTouched.includes(key)).map((key) => [key, 'document-confirmed']))
    sessionStorage.setItem('yojnasetu-profile-source', JSON.stringify({ ...previousSources, ...documentSources }))
    const retainedDocuments = documents.map((document) => document.local_id === analysis?.local_id ? { ...document, reviewed_values: values } : document)
    sessionStorage.setItem('yojnasetu-document-analyses', JSON.stringify(retainedDocuments))
    setDocuments(retainedDocuments)
    sessionStorage.setItem('yojnasetu-document-readiness', JSON.stringify({
      scheme_id: schemeId,
      file_name: analysis?.filename || file?.name || '',
      local_id: analysis?.local_id || '',
      document_type: analysis?.extracted_fields?.certificate_type?.value || file?.name || 'Uploaded document',
      mapped_requirement: selectedRequirement,
      mapping_confirmed: Boolean(selectedRequirement),
      quality_warnings: analysis?.warnings || [],
    }))
    setSavedReview(true)
    if (continueToAssessment) navigate(schemeId ? `/eligibility?scheme_id=${encodeURIComponent(schemeId)}` : '/eligibility')
  }

  return <section className="document-section section-wrap" id="document-intelligence">
    <div className="document-intro"><p className="eyebrow">01 / UPLOAD & REVIEW</p><h2>Start with<br /><em>your documents.</em></h2><p>Extract text locally from a PDF or image, review what was detected, and correct it before choosing whether to prefill an assessment.</p><p className="document-privacy">Files are processed for this request and are not saved as application records. Text extraction does not authenticate documents.</p></div>
    <div className="document-panel">
      <div className="document-upload-card"><h3>Upload a document</h3><p className="panel-help">Choose a file to extract its text, then review the detected values.</p>
      <label className={`document-dropzone ${dragging ? 'dropzone-active' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); analyze(event.dataTransfer.files?.[0]) }}>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={busy || documents.length >= 10} onChange={(event) => analyze(event.target.files?.[0])} />
        <span className="document-upload-mark"><Icon name="file" size={24} /></span><strong>{busy ? 'Analyzing document…' : documents.length >= 10 ? 'Document limit reached' : 'Drop a document here or browse files'}</strong><small>PDF, PNG, JPG or JPEG · up to 10 MB · 20 PDF pages · maximum 10 documents</small>
        {file && <span className="document-file-name">{file.name}</span>}
      </label></div>
      <div className="readiness-panel"><label className="document-scheme-select" htmlFor="document-scheme">Scheme for document readiness
        <select id="document-scheme" disabled={busy} value={schemeId} onChange={(event) => { setSchemeId(event.target.value); setSelectedRequirement('') }}><option value="">Choose a scheme</option>{schemes.map((scheme) => <option key={scheme.scheme_id} value={scheme.scheme_id}>{scheme.name}</option>)}</select>
      </label>
      {selectedScheme && <div className="document-readiness"><h3>Document readiness</h3><p>Review an upload and select the requirement it supports before continuing. The current report tracks one confirmed document mapping at a time; other uploads remain available for consistency review.</p>{selectedScheme.required_documents.length ? <ul>{selectedScheme.required_documents.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{selectedScheme.documents_note || 'No document checklist is encoded for this scheme.'}</p>}</div>}
      </div>
      {busy && <p className="ask-loading" role="status">Extracting text and checking document readability…</p>}
      {error && <p className="api-error" role="alert">{error}</p>}
      {documents.length > 0 && <div className="retained-documents"><h3>Uploaded documents <span className="file-count">{documents.length}/10</span></h3><ul>{documents.map((document) => <li className={analysis?.local_id === document.local_id ? 'file-selected' : ''} key={document.local_id}><Icon name="file" size={18} /><span className="file-info"><strong>{document.filename}</strong><small>{document.page_count} page{document.page_count === 1 ? '' : 's'} · {document.reviewed_values ? 'Review saved' : 'Review needed'}</small></span><button type="button" disabled={busy} aria-label={`Review ${document.filename}`} onClick={() => { setSavedReview(false); setAnalysis(document); setValues(document.reviewed_values || Object.fromEntries(Object.entries(document.extracted_fields).map(([key, field]) => [key, field.value ?? '']))); setSelectedFields({}); setEditedFields({}); setSelectedRequirement('') }}>Review</button><button type="button" disabled={busy} aria-label={`Remove ${document.filename}`} onClick={() => {
        const updated = documents.filter((item) => item.local_id !== document.local_id)
        sessionStorage.setItem('yojnasetu-document-analyses', JSON.stringify(updated)); setDocuments(updated)
        const readiness = JSON.parse(sessionStorage.getItem('yojnasetu-document-readiness') || 'null')
        if (readiness?.local_id === document.local_id) sessionStorage.removeItem('yojnasetu-document-readiness')
        if (analysis?.local_id === document.local_id) setAnalysis(null)
      }}>Remove</button></li>)}</ul></div>}
      {analysis && <div className="document-results" aria-live="polite">
        <div className="document-result-heading"><div><span className="small-label">EXTRACTION COMPLETE</span><h3>Review detected details</h3><p className="review-filename">{analysis.filename}</p></div><span>{analysis.page_count} page{analysis.page_count === 1 ? '' : 's'} · {analysis.extraction_methods.join(', ') || 'No readable text'}</span></div>
        <p className="document-authenticity">{analysis.authenticity_notice}</p>
        <div className="extracted-fields">{Object.entries(documentFieldLabels).map(([key, label]) => {
          const field = analysis.extracted_fields[key]
          const hasValue = String(values[key] ?? '').trim() !== ''
          const uncertain = !hasValue || (!editedFields[key] && field?.confidence != null && field.confidence < 0.7)
          const fieldState = !hasValue ? 'missing' : selectedFields[key] ? 'user-confirmed' : editedFields[key] ? 'user-corrected' : uncertain ? 'uncertain' : 'extracted'
          return <div className={`extracted-field ${uncertain ? 'extracted-uncertain' : ''}`} data-field-state={fieldState} key={key}><label htmlFor={`ocr-${key}`}>{label}<span className="field-origin">{fieldState.replaceAll('-', ' ')}</span></label><input id={`ocr-${key}`} aria-describedby={`ocr-note-${key}`} type="text" value={values[key] ?? ''} placeholder="Not detected" onChange={(event) => { setSavedReview(false); setSelectedFields((current) => ({ ...current, [key]: false })); setValues((current) => ({ ...current, [key]: event.target.value })); setEditedFields((current) => ({ ...current, [key]: true })) }} /><small id={`ocr-note-${key}`}>{field?.confidence != null ? `${Math.round(field.confidence * 100)}% extraction confidence${field.source_page ? ` · page ${field.source_page}` : ''}` : 'No extraction confidence available'}</small><label className="confirm-field"><input type="checkbox" checked={Boolean(selectedFields[key])} disabled={!hasValue} onChange={(event) => setSelectedFields((current) => ({ ...current, [key]: event.target.checked }))} /> {['age', 'state', 'annual_family_income_inr'].includes(key) ? 'Use reviewed value in eligibility form' : 'Reviewed value'}</label></div>
        })}</div>
        {selectedScheme && selectedScheme.required_documents?.length > 0 && <label className="document-scheme-select" htmlFor="document-requirement">If appropriate, mark this upload as one required item after reviewing it
          <select id="document-requirement" value={selectedRequirement} onChange={(event) => setSelectedRequirement(event.target.value)}><option value="">Do not mark a requirement available</option>{selectedScheme.required_documents.map((document) => <option value={document} key={document}>{document}</option>)}</select>
        </label>}
        {analysis.warnings.length > 0 && <div className="document-warnings" role="status"><strong>Review these notes</strong><ul>{analysis.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
        {savedReview && <p className="review-saved" role="status">Review saved in this tab. Regenerate your preflight report to include these changes.</p>}
        <div className="document-review-actions"><button className="button button-secondary" type="button" onClick={() => useInAssessment(false)}>Save review</button>
        <button className="button button-primary" type="button" onClick={() => useInAssessment(true)}>Continue to eligibility <Icon name="arrow" size={16} /></button></div>
      </div>}
    </div>
  </section>
}

function Footer({ health }) {
  return <footer className="site-footer">
    <div className="footer-main section-wrap">
      <div className="footer-brand-col"><Brand /><p>Helping people find a clearer path to public support.</p></div>
      <div className="footer-links"><span className="footer-heading">EXPLORE</span><a href="/">Home</a><a href="/explore">Explore schemes</a><a href="/#how-it-works">How it works</a></div>
      <div className="footer-links"><span className="footer-heading">YOUR NEXT STEP</span><a href="/eligibility">Check eligibility</a><a href="/documents">Document assistant</a><a href="/application">My application</a><HealthStatus health={health} /></div>
    </div>
    <div className="footer-bottom section-wrap"><span>© {new Date().getFullYear()} YojnaSetu</span><p>YojnaSetu is an independent guidance platform and is not affiliated with or endorsed by any government body. Eligibility guidance does not guarantee government approval. Always verify scheme details with the official source.</p></div>
  </footer>
}

function SchemeDetails({ scheme, loading, error, onRetry }) {
  return <main className="page-content"><div className="section-wrap scheme-detail-page">
    <ButtonLink href="/explore" variant="secondary">← All schemes</ButtonLink>
    <section className="scheme-detail-content" aria-labelledby="scheme-dialog-title">
      {loading ? <div className="detail-loading" role="status">Loading scheme details…</div> : error ? <div className="detail-loading" role="alert"><h2 id="scheme-dialog-title">Scheme details unavailable</h2><p>{error}</p><button type="button" className="text-link" onClick={onRetry}>Try again</button></div> : <>
      <span className={`illustrative-badge source-badge source-${scheme.source_verification_status}`}>{scheme.source_verification_status === 'official_source_checked' ? 'Official source checked' : 'Source not verified'}</span>
      <p className="scheme-category">{scheme.category}</p>
      <h1 id="scheme-dialog-title">{scheme.name}</h1>
      <p className="scheme-description">{scheme.description}</p>
      <dl className="scheme-detail-list">
        <div><dt>Department</dt><dd>{scheme.department}</dd></div>
        <div><dt>Geographical applicability</dt><dd>{scheme.applicability}</dd></div>
        <div><dt>Eligibility rules represented</dt><dd>{scheme.eligibility_rules.length} explicit condition{scheme.eligibility_rules.length === 1 ? '' : 's'}; unencoded conditions remain unknown</dd></div>
        <div><dt>Document readiness</dt><dd>{scheme.documents_status === 'unknown' ? scheme.documents_note : `${scheme.required_documents.length} document types listed; requirements are not assessed against your profile.`}</dd></div>
      </dl>
      <p className="scheme-disclaimer">Source check confirms that the linked source is official; it does not mean this product's summary or assessment is an approval. Confirm current conditions with the official source.</p>
      <div className="detail-actions"><a className="button button-secondary official-source-link" href={scheme.official_source_url} target="_blank" rel="noreferrer">Open official source <Icon name="arrow" size={16} /></a>
      <ButtonLink href={`/eligibility?scheme_id=${encodeURIComponent(scheme.scheme_id)}`}>Check this scheme <Icon name="arrow" size={16} /></ButtonLink></div>
      <div className="detail-sections"><section className="detail-section"><p className="eyebrow">01 / ELIGIBILITY</p><h2>Conditions to understand</h2><p>These are the conditions represented in this record. They are not an assessment of your eligibility.</p><ul className="detail-criteria">{scheme.eligibility_rules.map((rule) => <li key={rule.rule_id}><Icon name="source" size={16} /><span>{rule.label}</span></li>)}</ul></section>
      <section className="detail-section"><p className="eyebrow">02 / PREPARATION</p><h2>Documents to prepare</h2>
      {scheme.required_documents.length ? <ul>{scheme.required_documents.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{scheme.documents_note}</p>}
      {scheme.required_documents.length > 0 && <p>{scheme.documents_note}</p>}</section>
      <section className="detail-section"><p className="eyebrow">03 / SOURCE MATERIAL</p><h2>Go to the source</h2><p>{scheme.source_checked_at ? `Source check recorded in the dataset: ${scheme.source_checked_at}. ` : ''}Confirm current terms with the provider before applying.</p><a className="text-link" href={scheme.official_source_url} target="_blank" rel="noreferrer">Official scheme page <Icon name="arrow" size={16} /></a>{scheme.documents?.map((document) => <a className="source-document-link" key={document.url} href={document.url} target="_blank" rel="noreferrer"><Icon name="file" size={18} />{document.title}<Icon name="arrow" size={16} /></a>)}</section></div>
      </>}
    </section>
  </div></main>
}

function ExplorePage({ schemeState, schemeId }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All categories')
  const [geography, setGeography] = useState('All locations')
  const [department, setDepartment] = useState('All departments')
  const [detailState, setDetailState] = useState({ loading: true, scheme: null, error: '' })
  const [detailReload, setDetailReload] = useState(0)
  const hasFilters = Boolean(query || category !== 'All categories' || geography !== 'All locations' || department !== 'All departments')
  function clearFilters() { setQuery(''); setCategory('All categories'); setGeography('All locations'); setDepartment('All departments') }
  const normalizedQuery = query.trim().toLowerCase()
  const categoryOptions = ['All categories', ...new Set(schemeState.schemes.map((scheme) => scheme.category))]
  const geographyOptions = ['All locations', ...new Set(schemeState.schemes.map((scheme) => scheme.applicability).filter(Boolean))]
  const departmentOptions = ['All departments', ...new Set(schemeState.schemes.map((scheme) => scheme.department).filter(Boolean))]
  const filteredSchemes = schemeState.schemes.filter((scheme) => {
    const matchesCategory = category === 'All categories' || scheme.category === category
    const matchesGeography = geography === 'All locations' || scheme.applicability === geography
    const matchesDepartment = department === 'All departments' || scheme.department === department
    const searchable = `${scheme.name} ${scheme.category} ${scheme.department} ${scheme.applicability} ${scheme.description}`.toLowerCase()
    return matchesCategory && matchesGeography && matchesDepartment && searchable.includes(normalizedQuery)
  })

  useEffect(() => {
    if (!schemeId) return
    const controller = new AbortController()
    setDetailState({ loading: true, scheme: null, error: '' })
    fetch(`/api/schemes/${encodeURIComponent(schemeId)}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(response.status === 404 ? 'This scheme could not be found.' : 'Scheme details are unavailable.'); return response.json() })
      .then((scheme) => setDetailState({ loading: false, scheme, error: '' }))
      .catch((error) => { if (!controller.signal.aborted) setDetailState({ loading: false, scheme: null, error: error.message }) })
    return () => controller.abort()
  }, [schemeId, detailReload])
  if (schemeId) return <SchemeDetails {...detailState} loading={detailState.loading || (!detailState.scheme && !detailState.error)} onRetry={() => setDetailReload((value) => value + 1)} />
  return <>
    <main className="page-content">
      <PageIntro eyebrow="THE SCHEME DIRECTORY" title={<>Find support.<br /><em>Understand your options.</em></>}><p>Explore public schemes, read the conditions, and follow the official source. A good application starts with clear information.</p></PageIntro>
      <section className="explore-content section-wrap" aria-labelledby="browse-heading">
        <div className="browse-filter-panel">
        <div className="explore-toolbar">
          <div className="search-field">
            <Icon name="search" size={19} />
            <label className="visually-hidden" htmlFor="scheme-search">Search by scheme name or keyword</label>
            <input id="scheme-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search schemes or keywords" />
            {query && <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
          </div>
          <p className="result-count" aria-live="polite">{schemeState.loading ? 'Loading directory…' : `${filteredSchemes.length} ${filteredSchemes.length === 1 ? 'scheme' : 'schemes'}`}</p>
        </div>
        <div className="category-filters" role="group" aria-label="Filter schemes by category">
          {categoryOptions.map((item) => <button key={item} type="button" className={`filter-chip ${category === item ? 'filter-active' : ''}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <div className="explore-extra-filters">
          <label>Geography <select value={geography} onChange={(event) => setGeography(event.target.value)}>{geographyOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Department <select value={department} onChange={(event) => setDepartment(event.target.value)}>{departmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        {hasFilters && <button className="text-link clear-filters" type="button" onClick={clearFilters}>Clear all filters <Icon name="close" size={14} /></button>}
        </div>
        <div className="example-notice"><span className="label-dot" /> <strong>Source checked ≠ eligibility verified</strong><span>Only official source links are listed. Encoded rules cover a limited subset; unknown criteria stay undetermined.</span></div>
        <h2 className="visually-hidden" id="browse-heading">Scheme records</h2>
        {schemeState.loading ? <p className="data-state" role="status">Loading scheme information…</p> : schemeState.error ? <div className="empty-results" role="alert"><h3>Scheme information is unavailable</h3><p>{schemeState.error}</p><button type="button" className="text-link" onClick={schemeState.reload}>Try again</button></div> : filteredSchemes.length ? <div className="browse-grid">
          {filteredSchemes.map((scheme) => <article className="browse-card" key={scheme.scheme_id}>
            <div className="browse-card-top"><p className="scheme-category">{scheme.category}</p><SourceBadge scheme={scheme} /></div>
            <div className="browse-main"><h3><a href={`/explore/${encodeURIComponent(scheme.scheme_id)}`}>{scheme.name}</a></h3><p className="scheme-description">{scheme.description}</p></div>
            <dl className="scheme-card-facts"><div><dt>Available in</dt><dd><Icon name="pin" size={14} />{scheme.applicability}</dd></div><div><dt>Rule coverage</dt><dd>{scheme.eligibility_rules.length} encoded conditions</dd></div></dl>
            <p className="browse-department">{scheme.department}</p>
            <div className="scheme-card-actions"><ButtonLink href={`/explore/${encodeURIComponent(scheme.scheme_id)}`}>View scheme <Icon name="arrow" size={16} /></ButtonLink><a className="text-link" href={scheme.official_source_url} target="_blank" rel="noreferrer">Official source <Icon name="arrow" size={14} /></a></div>
          </article>)}
        </div> : <div className="empty-results"><span className="empty-icon"><Icon name="search" size={23} /></span><h3>No schemes found</h3><p>Try a different search term or choose another filter.</p><button className="text-link" type="button" onClick={clearFilters}>Clear filters</button></div>}
      </section>
    </main>
  </>
}

function FormField({ id, label, error, hint, children }) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  return <div className={`form-field ${error ? 'field-error' : ''}`}>
    <label htmlFor={id}>{label}</label>
    {children(describedBy)}
    {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
    {error && <p className="field-error-message" id={`${id}-error`} role="alert">{error}</p>}
  </div>
}

function SchemeFollowup({ schemeId }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function ask(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setAnswer(null)
    try {
      const response = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: question.trim(), scheme_id: schemeId }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || `Request failed with status ${response.status}`)
      setAnswer(data)
    } catch (requestError) {
      setError(requestError.message || 'Could not retrieve scheme evidence.')
    } finally {
      setLoading(false)
    }
  }
  return <div className="result-followup">
    <h5>Ask a follow-up using scheme documents</h5>
    <form onSubmit={ask}><label className="visually-hidden" htmlFor={`followup-${schemeId}`}>Question about this scheme</label><input id={`followup-${schemeId}`} value={question} onChange={(event) => setQuestion(event.target.value)} minLength={3} maxLength={1200} required placeholder="Ask about a condition or required document" /><button className="button button-secondary" type="submit" disabled={loading}>{loading ? 'Searching…' : 'Ask'}</button></form>
    {error && <p className="api-error" role="alert">{error}</p>}
    {answer && <div className="followup-answer" aria-live="polite"><strong>{answer.status === 'ANSWERED' ? 'Retrieved answer' : 'Evidence unavailable'}</strong><p>{answer.answer}</p>{answer.sources?.length ? <ul>{answer.sources.map((source, index) => <li key={`${source.source_url}-${source.page_number}-${index}`}><a href={source.source_url} target="_blank" rel="noreferrer">{source.document_title}{source.page_number ? ` · page ${source.page_number}` : ''}</a><blockquote>{source.excerpt}</blockquote></li>)}</ul> : <p>No supporting document citation was available for this response.</p>}</div>}
  </div>
}

const consistencyFieldLabels = {
  applicant_name: 'Applicant name', date_of_birth: 'Date of birth', age: 'Age', address: 'Address', state: 'State',
  annual_family_income_inr: 'Annual family income (INR)', certificate_type: 'Certificate type', issuing_authority: 'Issuing authority',
  certificate_date: 'Certificate or issue date', certificate_valid_until: 'Certificate valid-until date', certificate_number: 'Certificate/reference number',
}

const consistencyStatusLabels = {
  CONSISTENT: 'Consistent', POTENTIAL_MISMATCH: 'Potential mismatch', MISSING_INFORMATION: 'Missing information', UNABLE_TO_VERIFY: 'Unable to verify',
}

function ConsistencyChecker({ initialProfile, documents }) {
  const [profile, setProfile] = useState(initialProfile)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function copyLatestOcrToDraft() {
    const latest = documents[documents.length - 1]
    if (!latest) return
    const copied = {}
    Object.entries(latest.extracted_fields || {}).forEach(([key, field]) => {
      if (field?.value != null && consistencyFieldLabels[key]) copied[key] = String(field.value)
    })
    setProfile((current) => ({ ...current, ...copied }))
    setResult(null)
  }

  useEffect(() => { setResult(null) }, [documents])

  async function runCheck(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const confirmedProfile = Object.fromEntries(Object.entries(profile).filter(([, value]) => String(value ?? '').trim() !== ''))
      const response = await fetch('/api/documents/consistency-check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: confirmedProfile, documents: documents.map(({ filename, extracted_fields }) => ({ filename, extracted_fields })) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || `Comparison failed with status ${response.status}`)
      sessionStorage.setItem('yojnasetu-preflight-profile', JSON.stringify(confirmedProfile))
      setResult(data)
    } catch (requestError) {
      setError(requestError.message || 'Could not compare the profile and documents.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="consistency-panel" aria-labelledby="consistency-heading">
    <div className="consistency-panel-heading"><h3 id="consistency-heading">Reviewed applicant details</h3><p>Review or correct the applicant profile below. Your edits only change this profile draft; original OCR values remain unchanged.</p></div>
    {!documents.length && <p className="consistency-notice">No uploaded documents in this tab. <a className="text-link" href="/documents#upload-review">Upload a document <Icon name="arrow" size={14} /></a></p>}
    {documents.length > 0 && <p className="retained-documents"><strong>{documents.length} OCR document{documents.length === 1 ? '' : 's'} included</strong>: {documents.map((document) => document.filename).join(', ')}</p>}
    <form onSubmit={runCheck}>
      <div className="consistency-profile-grid">{Object.entries(consistencyFieldLabels).map(([key, label]) => <label key={key}>{label}<input type="text" value={profile[key] ?? ''} placeholder="Not provided" onChange={(event) => { setProfile((current) => ({ ...current, [key]: event.target.value })); setResult(null) }} /></label>)}</div>
      {documents.length > 0 && <button className="text-link consistency-copy" type="button" onClick={copyLatestOcrToDraft}>Copy latest OCR values into profile draft for review</button>}
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Comparing…' : 'Run consistency check'} <Icon name="arrow" size={15} /></button>
    </form>
    {error && <p className="api-error" role="alert">{error}</p>}
    {result && <div className="consistency-results" aria-live="polite">
      <p className="consistency-notice">{result.notice}</p>
      {result.expiry_reviews?.map((item, index) => <div className="consistency-expiry" key={`expiry-${index}`}><strong>Possible expiry needs review</strong><p>{item.source}: valid until {item.valid_until}. {item.explanation}</p>{item.confidence != null && <small>OCR confidence {Math.round(item.confidence * 100)}%</small>}</div>)}
      <div className="consistency-findings">{result.findings.map((finding) => <article className={`consistency-finding finding-${finding.status.toLowerCase()}`} key={finding.field}>
        <div className="consistency-finding-heading"><h4>{finding.label}</h4><span className={`consistency-status status-${finding.status.toLowerCase()}`}>{consistencyStatusLabels[finding.status]}</span>{finding.manual_review && <span className="manual-review">Manual review</span>}</div>
        <p>{finding.explanation}</p>
        <ul>{finding.values.map((item, index) => <li key={`${item.source}-${index}`}><span>{item.source}</span><strong>{item.value == null || String(item.value).trim() === '' ? 'Missing' : String(item.value)}</strong>{item.confidence != null && item.source !== 'Reviewed applicant profile' && <small>{Math.round(item.confidence * 100)}% OCR confidence</small>}</li>)}</ul>
        {finding.confidence != null && <small className="finding-confidence">Comparison confidence indicator: {Math.round(finding.confidence * 100)}%</small>}
      </article>)}</div>
    </div>}
  </section>
}

function EligibilityResults({ results, documentReadiness, schemes }) {
  return <div className="eligibility-results">
    <div className="results-intro" role="status" aria-live="polite"><span className="complete-mark"><Icon name="check" size={24} /></span><div><h3>Initial rule check complete</h3><p>This is a deterministic comparison against the limited rules encoded for each scheme. It is not official approval or a guarantee.</p></div></div>
    {results.map((result) => {
      const scheme = schemes.find((item) => item.scheme_id === result.scheme_id)
      const source = result.source_references?.[0]
      const submittedDocument = documentReadiness?.file_name ? documentReadiness : null
      const documentForThisScheme = submittedDocument?.scheme_id === result.scheme_id
      const confirmedDocument = documentForThisScheme && submittedDocument?.mapping_confirmed ? submittedDocument.mapped_requirement : ''
      const available = confirmedDocument ? [confirmedDocument] : []
      const missing = result.document_readiness.required_documents.filter((item) => !available.includes(item))
      const uncertain = submittedDocument && (!confirmedDocument || !documentForThisScheme) ? [submittedDocument.document_type] : []
      const unknownRules = result.rule_results.filter((rule) => rule.status === 'UNKNOWN')
      return <article className="result-card" key={result.scheme_id}>
      <div className="result-card-heading"><div><p className="scheme-category">SCHEME RESULT · {scheme?.category}</p><h4>{result.name}</h4></div><span className={`result-status result-${result.status.toLowerCase()}`}>{result.status === 'POTENTIALLY_ELIGIBLE' ? 'Potentially eligible' : result.status === 'NOT_ELIGIBLE' ? 'Not eligible' : 'Undetermined'}</span></div>
      <p className="result-summary">{result.summary}</p>
      {unknownRules.length > 0 && <div className="next-steps"><strong>Information still needed</strong><p>These encoded conditions could not be assessed. Add the details if you have them, then run the check again.</p><ul>{unknownRules.map((rule) => <li key={rule.rule_id}>{rule.label}</li>)}</ul></div>}
      <RuleLegend /><div className="rule-results"><h5>Eligibility conditions · independent of document readiness</h5>{result.rule_results.map((rule) => <div className={`rule-result rule-row-${rule.status.toLowerCase()}`} key={rule.rule_id}><RuleBadge status={rule.status} /><div><strong>{rule.label}</strong><p>{rule.explanation}</p>{source?.url ? <a className="rule-source-link" href={source.url} target="_blank" rel="noreferrer">Official scheme source <Icon name="arrow" size={12} /></a> : <small>Official source reference unavailable.</small>}</div></div>)}</div>
      <div className="document-readiness"><h5>Document readiness · separate from eligibility</h5>{result.document_readiness.required_documents.length > 0 ? <><p>Documents are marked available only when you selected that item after reviewing your upload. This is not authenticity verification.</p><ul className="readiness-list">{available.map((document) => <li className="readiness-available" key={`available-${document}`}>Available here: {document}</li>)}{missing.map((document) => <li className="readiness-missing" key={`missing-${document}`}>Not provided for this check: {document}</li>)}{uncertain.map((document) => <li className="readiness-uncertain" key={`uncertain-${document}`}>{documentForThisScheme ? 'Uploaded, but not matched to a requirement:' : 'Uploaded for a different scheme; not matched to this checklist:'} {document}</li>)}</ul><p>{result.document_readiness.note}</p></> : <p>{scheme?.documents_note || 'No document checklist is encoded for this scheme.'}</p>}{submittedDocument?.quality_warnings?.some((warning) => /expired|validity/i.test(warning)) && <p className="expiry-note">{submittedDocument.quality_warnings.filter((warning) => /expired|validity/i.test(warning)).join(' ')}</p>}</div>
      <div className="result-source">{source && <><span>Source reference · {source.verification_status.replaceAll('_', ' ')}</span><a href={source.url} target="_blank" rel="noreferrer">Open official source <Icon name="arrow" size={14} /></a></>}</div>
      <SchemeFollowup schemeId={result.scheme_id} />
    </article>})}
    <p className="eligibility-disclaimer">This result is informational only. It is not a government decision and does not guarantee approval. Document text extraction does not verify authenticity.</p>
  </div>
}

const initialForm = { state: '', age: '', income: '', education: '', occupation: '', category: '' }

function EligibilityPage({ schemes }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(() => {
    try {
      const prefill = JSON.parse(sessionStorage.getItem('yojnasetu-document-profile') || '{}')
      const manual = JSON.parse(sessionStorage.getItem('yojnasetu-manual-profile') || '{}')
      const manuallyTouched = JSON.parse(sessionStorage.getItem('yojnasetu-manual-profile-fields') || '[]')

      const manualValues = Object.fromEntries(manuallyTouched.filter((key) => key in manual).map((key) => [key, manual[key]]))
      return { ...initialForm, ...manual, ...prefill, ...manualValues }
    } catch {
      return initialForm
    }
  })
  const [profileSources, setProfileSources] = useState(() => {
    try {
      const sources = JSON.parse(sessionStorage.getItem('yojnasetu-profile-source') || '{}')
      const manual = JSON.parse(sessionStorage.getItem('yojnasetu-manual-profile') || '{}')
      const manuallyTouched = JSON.parse(sessionStorage.getItem('yojnasetu-manual-profile-fields') || '[]')
      return { ...sources, ...Object.fromEntries(manuallyTouched.map((key) => [key, manual[key] ? 'manually-entered' : 'missing'])) }
    } catch { return {} }
  })
  const [selectedSchemeId, setSelectedSchemeId] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('scheme_id') || sessionStorage.getItem('yojnasetu-selected-scheme') || JSON.parse(sessionStorage.getItem('yojnasetu-document-readiness') || '{}').scheme_id || '' } catch { return '' }
  })
  const [documentReadiness, setDocumentReadiness] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('yojnasetu-document-readiness') || 'null') } catch { return null }
  })
  const [errors, setErrors] = useState({})
  const [complete, setComplete] = useState(false)
  const [results, setResults] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function updateField(name, value) {
    setForm((current) => {
      const updated = { ...current, [name]: value }
      sessionStorage.setItem('yojnasetu-manual-profile', JSON.stringify(updated))
      const touched = JSON.parse(sessionStorage.getItem('yojnasetu-manual-profile-fields') || '[]')
      if (!touched.includes(name)) sessionStorage.setItem('yojnasetu-manual-profile-fields', JSON.stringify([...touched, name]))
      return updated
    })
    setProfileSources((current) => {
      const updated = { ...current, [name]: value ? 'manually-entered' : 'missing' }
      sessionStorage.setItem('yojnasetu-profile-source', JSON.stringify(updated))
      return updated
    })
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  function validateStep() {
    const nextErrors = {}
    if (step === 1) {
      if (!selectedSchemeId) nextErrors.scheme = 'Choose a scheme to assess.'
      if (form.age !== '' && (!Number.isInteger(Number(form.age)) || Number(form.age) < 0 || Number(form.age) > 120)) nextErrors.age = 'Enter a whole number from 0 to 120, or leave it blank.'
    } else if (step === 2) {
      if (form.income !== '' && (!Number.isInteger(Number(form.income)) || Number(form.income) < 0 || Number(form.income) > 1000000000)) nextErrors.income = 'Enter a whole amount from ₹0 to ₹1,000,000,000, or leave it blank.'
    }
    setErrors(nextErrors)
    const firstInvalid = Object.keys(nextErrors)[0]
    if (firstInvalid) window.requestAnimationFrame(() => document.getElementById(firstInvalid === 'scheme' ? 'assessment-scheme' : firstInvalid)?.focus())
    return Object.keys(nextErrors).length === 0
  }

  function continueToReview() {
    if (validateStep()) setStep(step + 1)
  }

  useEffect(() => {
    if (step > 1) document.getElementById(step === 2 ? 'step-two-title' : 'review-title')?.focus({ preventScroll: true })
  }, [step])

  function changeStep(nextStep) {
    setErrors({})
    setStep(nextStep)
  }

  async function finishReview() {
    setSubmitting(true)
    setSubmitError('')
    const profile = {
      ...(form.state ? { state: form.state } : {}),
      ...(form.age !== '' ? { age: Number(form.age) } : {}),
      ...(form.income !== '' ? { annual_family_income_inr: Number(form.income) } : {}),
      ...(form.education ? { education_level: form.education } : {}),
      ...(form.occupation ? { occupation: form.occupation } : {}),
      ...(form.category ? { category: form.category } : {}),
    }
    try {
      const response = await fetch('/api/eligibility/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, scheme_id: selectedSchemeId }),
      })
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}))
        throw new Error(detail.detail || `Request failed with status ${response.status}`)
      }
      const data = await response.json()
      setResults(data.results ?? [])
      sessionStorage.setItem('yojnasetu-selected-scheme', selectedSchemeId)
      sessionStorage.setItem('yojnasetu-confirmed-profile', JSON.stringify(profile))
      sessionStorage.removeItem('yojnasetu-preflight-profile')
      setDocumentReadiness(JSON.parse(sessionStorage.getItem('yojnasetu-document-readiness') || 'null'))
      setComplete(true)
    } catch (error) {
      setSubmitError(error.message || 'Could not reach the eligibility service. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const fields = {
    state: { label: 'State or union territory', display: form.state || 'Not provided' },
    age: { label: 'Age', display: form.age ? `${form.age} years` : 'Not provided' },
    income: { label: 'Annual family income', display: form.income ? `₹${Number(form.income).toLocaleString('en-IN')}` : 'Not provided' },
    education: { label: 'Education level', display: form.education || 'Not provided' },
    occupation: { label: 'Occupation', display: form.occupation || 'Not provided' },
    category: { label: 'Social category', display: form.category || 'Not provided' },
  }

  return <main className="page-content eligibility-page">
    <PageIntro eyebrow="YOUR ELIGIBILITY CHECK" title={<>A few details.<br /><em>A clearer next step.</em></>}><p>Compare your situation with the scheme’s encoded conditions. You can leave unknown details blank; this check is guidance, not an official decision.</p></PageIntro>
    <section className={`assessment-card section-wrap ${complete ? 'assessment-complete' : ''}`} aria-labelledby="assessment-title">
      <div className="assessment-heading">
        <div><span className="small-label">ELIGIBILITY ASSESSMENT</span><h2 id="assessment-title">{complete ? 'Your eligibility review' : 'A few details, at your pace.'}</h2></div>
        <span className="assessment-count">{complete ? 'Complete' : `STEP ${step} OF 3`}</span>
      </div>
      <ol className="assessment-progress" aria-label="Form progress">
        <li aria-current={!complete && step === 1 ? 'step' : undefined} className={step >= 1 ? 'progress-current' : ''}><span>{step > 1 || complete ? <Icon name="check" size={14} /> : '1'}</span><span>About you</span></li>
        <li aria-current={!complete && step === 2 ? 'step' : undefined} className={step >= 2 ? 'progress-current' : ''}><span>{step > 2 || complete ? <Icon name="check" size={14} /> : '2'}</span><span>Your background</span></li>
        <li aria-current={!complete && step === 3 ? 'step' : undefined} className={step >= 3 || complete ? 'progress-current' : ''}><span>{complete ? <Icon name="check" size={14} /> : '3'}</span><span>Review</span></li>
      </ol>

      {!complete && <div className="assessment-scheme-select"><FormField id="assessment-scheme" label="Scheme to assess" error={errors.scheme} hint="Only encoded conditions for the selected scheme are evaluated.">{(describedBy) => <select id="assessment-scheme" disabled={submitting} value={selectedSchemeId} onChange={(event) => { setSelectedSchemeId(event.target.value); setErrors((current) => ({ ...current, scheme: '' })) }} aria-invalid={Boolean(errors.scheme)} aria-describedby={describedBy}><option value="">Choose a scheme</option>{schemes.map((scheme) => <option key={scheme.scheme_id} value={scheme.scheme_id}>{scheme.name}</option>)}</select>}</FormField></div>}

      {complete ? <div className="form-results-state">
        <EligibilityResults results={results} documentReadiness={documentReadiness} schemes={schemes} />
        <div className="form-result-actions"><ButtonLink href="/documents" variant="secondary">Continue to Document Assistant <Icon name="arrow" size={16} /></ButtonLink><ButtonLink href="/application">Open My Application <Icon name="arrow" size={16} /></ButtonLink><button className="button button-secondary" type="button" onClick={() => { setComplete(false); setStep(1); setResults(null) }}>Edit answers</button></div>
      </div> : <>
        {step === 1 && <div className="form-step" aria-labelledby="step-one-title">
          <div className="form-step-heading"><span>STEP 1</span><h3 id="step-one-title" tabIndex={-1}>Where are you in your journey?</h3><p>Share any details you know. Missing answers remain unknown in the rule check.</p></div>
          <FormField id="state" label="State of residence (optional)" error={errors.state}>
            {(describedBy) => <select id="state" value={form.state} onChange={(event) => updateField('state', event.target.value)} aria-invalid={Boolean(errors.state)} aria-describedby={describedBy}>
              <option value="">Not provided</option>{states.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>}
          </FormField>
          <FormField id="age" label="Age (optional)" error={errors.age} hint="Enter age in completed years; leave blank if unknown.">
            {(describedBy) => <div className="input-with-suffix"><input id="age" type="number" inputMode="numeric" min="0" max="120" step="1" value={form.age} onChange={(event) => updateField('age', event.target.value)} placeholder="e.g. 28" aria-invalid={Boolean(errors.age)} aria-describedby={describedBy} /><span>years</span></div>}
          </FormField>
        </div>}

        {step === 2 && <div className="form-step" aria-labelledby="step-two-title">
          <div className="form-step-heading"><span>STEP 2</span><h3 id="step-two-title" tabIndex={-1}>Tell us a little about your background.</h3><p>Share what you know; blank values are not treated as failed conditions.</p></div>
          <FormField id="income" label="Annual family income (INR, optional)" error={errors.income} hint="Enter a whole amount in Indian rupees, or leave blank if unknown.">
            {(describedBy) => <div className="input-with-prefix"><span>₹</span><input id="income" type="number" inputMode="numeric" min="0" max="1000000000" step="1" value={form.income} onChange={(event) => updateField('income', event.target.value)} placeholder="e.g. 300000" aria-invalid={Boolean(errors.income)} aria-describedby={describedBy} /></div>}
          </FormField>
          <FormField id="education" label="Education level (optional)" error={errors.education}>
            {(describedBy) => <select id="education" value={form.education} onChange={(event) => updateField('education', event.target.value)} aria-invalid={Boolean(errors.education)} aria-describedby={describedBy}><option value="">Not provided</option>{educationLevels.map((level) => <option key={level}>{level}</option>)}</select>}
          </FormField>
          <FormField id="occupation" label="Occupation (optional)" error={errors.occupation}>
            {(describedBy) => <select id="occupation" value={form.occupation} onChange={(event) => updateField('occupation', event.target.value)} aria-invalid={Boolean(errors.occupation)} aria-describedby={describedBy}><option value="">Not provided</option>{occupations.map((occupation) => <option key={occupation}>{occupation}</option>)}</select>}
          </FormField>
          <FormField id="category" label="Social category (optional)" hint="Only share this if it is relevant to a scheme you are exploring. You can leave it blank.">
            {(describedBy) => <select id="category" value={form.category} onChange={(event) => updateField('category', event.target.value)} aria-describedby={describedBy}><option value="">Prefer not to provide</option>{socialCategories.map((category) => <option key={category}>{category}</option>)}</select>}
          </FormField>
        </div>}

        {step === 3 && <div className="form-step review-step" aria-labelledby="review-title">
          <div className="form-step-heading"><span>STEP 3</span><h3 id="review-title" tabIndex={-1}>Review your details.</h3><p>Check what you entered. You can go back to make changes.</p></div>
          <dl className="review-list">{Object.entries(fields).map(([key, field]) => <div key={key}><dt>{field.label}</dt><dd>{field.display}<small className={`profile-origin origin-${profileSources[key] || 'missing'}`}>{profileSources[key] === 'document-confirmed' ? 'Reviewed document value · confirmed by you' : profileSources[key] === 'manually-entered' ? 'Entered by you' : field.display === 'Not provided' ? 'Missing · remains unknown' : 'Review this value'}</small></dd></div>)}</dl>
          <p className="review-notice"><Icon name="source" size={18} /> When you request the check, these details are sent to the YojnaSetu backend for a deterministic comparison against encoded rules. No application is submitted, and uncollected criteria will remain undetermined.</p>
        </div>}

        {submitError && <p className="api-error" role="alert">{submitError} Check that the FastAPI backend is running, then try again.</p>}

        <div className="form-actions">
          {step > 1 && <button type="button" className="button button-secondary" disabled={submitting} onClick={() => changeStep(step - 1)}>Back</button>}
          {step < 2 && <button type="button" className="button button-primary" onClick={continueToReview}>Continue <Icon name="arrow" size={16} /></button>}
          {step === 2 && <button type="button" className="button button-primary" onClick={continueToReview}>Review <Icon name="arrow" size={16} /></button>}
          {step === 3 && <button type="button" className="button button-primary" onClick={finishReview} disabled={submitting}>{submitting ? 'Checking…' : 'Check encoded rules'} {!submitting && <Icon name="check" size={16} />}</button>}
        </div>
      </>}
    </section>
    <p className="form-footnote section-wrap">The rule engine covers only conditions explicitly encoded from linked official sources. It does not calculate a final or official decision.</p>
  </main>
}

function DocumentAssistantPage({ schemes, navigate, hash }) {
  const sections = [['upload-review', 'Upload, review & readiness'], ['consistency-review', 'Consistency check'], ['scheme-questions', 'Scheme Q&A']]
  const activeSection = sections.some(([id]) => `#${id}` === hash) ? hash.slice(1) : 'upload-review'
  const [documents, setDocuments] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('yojnasetu-document-analyses') || '[]') } catch { return [] }
  })
  const [profile] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('yojnasetu-confirmed-profile') || sessionStorage.getItem('yojnasetu-manual-profile') || '{}')
      return { ...saved, annual_family_income_inr: saved.annual_family_income_inr ?? saved.income }
    } catch { return {} }
  })
  return <main className="page-content documents-page">
    <PageIntro eyebrow="THE DOCUMENT DESK" title={<>Prepare with<br /><em>more confidence.</em></>}><p>Read your documents, review the details, and resolve questions with source-backed answers. You decide which extracted values to use.</p></PageIntro>
    <nav className="assistant-tabs section-wrap" aria-label="Document assistant sections">{sections.map(([id, label], index) => <a key={id} href={`/documents#${id}`} aria-current={activeSection === id ? 'location' : undefined}><span aria-hidden="true">0{index + 1}</span>{label}</a>)}</nav>
    <div id="upload-review" tabIndex={-1} hidden={activeSection !== 'upload-review'}><DocumentIntelligence schemes={schemes} navigate={navigate} onDocumentsChange={setDocuments} /></div>
    <section className="consistency-page-section section-wrap" id="consistency-review" tabIndex={-1} hidden={activeSection !== 'consistency-review'}><div className="section-heading"><div><p className="eyebrow">02 / CONSISTENCY</p><h2>Check the details.<br /><em>Resolve the differences.</em></h2></div><p>Potential differences are surfaced for manual review. They do not change an eligibility outcome or imply document authenticity.</p></div><ConsistencyChecker initialProfile={profile} documents={documents} /></section>
    <div id="scheme-questions" tabIndex={-1} hidden={activeSection !== 'scheme-questions'}><AskSection schemes={schemes} /></div>
    <div className="assistant-next-step section-wrap"><p>Ready to bring your information together?</p><ButtonLink href="/application">Open My Application <Icon name="arrow" size={16} /></ButtonLink></div>
  </main>
}

function ApplicationPage({ schemes, loading, error }) {
  const [context] = useState(() => {
    try {
      const profile = JSON.parse(sessionStorage.getItem('yojnasetu-confirmed-profile') || sessionStorage.getItem('yojnasetu-manual-profile') || '{}')
      const selectedSchemeId = sessionStorage.getItem('yojnasetu-selected-scheme') || JSON.parse(sessionStorage.getItem('yojnasetu-document-readiness') || '{}').scheme_id || ''
      const profileSources = JSON.parse(sessionStorage.getItem('yojnasetu-profile-source') || '{}')
      const documents = JSON.parse(sessionStorage.getItem('yojnasetu-document-analyses') || '[]')
      const documentReadiness = JSON.parse(sessionStorage.getItem('yojnasetu-document-readiness') || 'null')
      return { profile, selectedSchemeId, profileSources, documents, documentReadiness }
    } catch { return { profile: {}, selectedSchemeId: '', profileSources: {}, documents: [], documentReadiness: null } }
  })
  const scheme = schemes.find((item) => item.scheme_id === context.selectedSchemeId)
  if (loading || error || !scheme) return <main className="page-content"><PageIntro eyebrow="MY APPLICATION" title={<>Your application,<br /><em>in perspective.</em></>}><p>Bring your eligibility review, documents, and source references into one preflight report.</p></PageIntro><section className="application-empty section-wrap"><Icon name="file" size={28} /><h2>{loading ? 'Preparing your workspace…' : error ? 'Scheme information is unavailable' : 'Start with a scheme'}</h2><p role="status">{loading ? 'Loading the scheme details needed for your report.' : error ? 'Use Retry connection above to load scheme information. Your saved draft remains in this tab.' : 'Choose a scheme and review your applicant details. Your report will bring together the checks and documents available in this tab.'}</p>{!loading && !error && <ButtonLink href="/eligibility">Check eligibility <Icon name="arrow" size={16} /></ButtonLink>}</section></main>
  const initialProfile = { applicant_name: '', date_of_birth: '', age: '', address: '', state: '', occupation: '', category: '', certificate_type: '', issuing_authority: '', certificate_date: '', certificate_valid_until: '', certificate_number: '', ...context.profile, annual_family_income_inr: context.profile.annual_family_income_inr ?? context.profile.income ?? '', education_level: context.profile.education_level ?? context.profile.education ?? '' }
  return <main className="page-content"><PageIntro eyebrow="MY APPLICATION" title={<>Your application,<br /><em>in perspective.</em></>}><p>One working report for eligibility, document readiness, unresolved details, and the sources behind them. Review it before taking your next step.</p></PageIntro><div className="section-wrap report-page"><PreflightReport scheme={scheme} initialProfile={initialProfile} profileSources={context.profileSources} documents={context.documents} documentReadiness={context.documentReadiness} /></div></main>
}

export default function App() {
  const [health, setHealth] = useState({ state: 'checking' })
  const [schemeState, setSchemeState] = useState({ loading: true, error: '', schemes: [] })
  const [schemeReload, setSchemeReload] = useState(0)
  const { location: route, pathname, search, hash, navigate, handleNavigation } = useNavigation()

  useEffect(() => {
    let active = true
    setSchemeState((current) => ({ ...current, loading: true, error: '' }))
    fetch('/api/schemes')
      .then((response) => {
        if (!response.ok) throw new Error(`Scheme request failed with status ${response.status}`)
        return response.json()
      })
      .then((data) => active && setSchemeState({ loading: false, error: '', schemes: Array.isArray(data) ? data : [] }))
      .catch((error) => active && setSchemeState({ loading: false, error: error.message || 'Could not load scheme information.', schemes: [] }))
    return () => { active = false }
  }, [schemeReload])

  useEffect(() => {
    document.title = ({ '/explore': 'Explore Schemes | YojnaSetu', '/eligibility': 'Eligibility Assessment | YojnaSetu', '/documents': 'Document Assistant | YojnaSetu', '/application': 'My Application | YojnaSetu' })[pathname] || (pathname.startsWith('/explore/') ? 'Scheme details | YojnaSetu' : 'YojnaSetu')
    const timer = window.setTimeout(() => {
      const target = hash ? document.getElementById(decodeSegment(hash.slice(1))) : document.getElementById('main-content')
      target?.focus({ preventScroll: true })
      if (hash) target?.scrollIntoView()
      else window.scrollTo(0, 0)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [route])

  useEffect(() => {
    let active = true
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((data) => active && setHealth({ state: 'online', data }))
      .catch((error) => active && setHealth({ state: 'offline', error: error.message }))
    return () => { active = false }
  }, [])

  return <div className="app-root" onClick={handleNavigation}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Header health={health} currentPath={pathname} />
    <div id="main-content" tabIndex={-1}>
    {pathname !== '/' && <p className="session-notice section-wrap">Your working session · Reviewed details stay in this tab. Original files are not saved. Save a PDF before closing your session.</p>}
    {schemeState.error && pathname !== '/explore' && pathname !== '/' && <div className="section-wrap api-error" role="alert">Scheme data unavailable. <button type="button" onClick={() => setSchemeReload((value) => value + 1)}>Retry connection</button></div>}
    {schemeState.loading && pathname !== '/' && <p className="section-wrap" role="status">Loading scheme records…</p>}
    {(pathname === '/explore' || /^\/explore\/[^/]+$/.test(pathname)) ? <ExplorePage schemeId={pathname.startsWith('/explore/') ? decodeSegment(pathname.slice(9)) : ''} schemeState={{ ...schemeState, reload: () => setSchemeReload((value) => value + 1) }} /> : pathname === '/eligibility' ? <EligibilityPage key={pathname + search} schemes={schemeState.schemes} /> : pathname === '/documents' ? <DocumentAssistantPage hash={hash} schemes={schemeState.schemes} navigate={navigate} /> : pathname === '/application' ? <ApplicationPage loading={schemeState.loading} error={schemeState.error} schemes={schemeState.schemes} /> : pathname === '/' ? <HomePage schemeState={schemeState} /> : <main className="page-intro section-wrap"><h1>Page not found</h1><p>This address does not match a YojnaSetu page.</p><ButtonLink href="/">Return home</ButtonLink></main>}
    </div>
    <Footer health={health} />
  </div>
}
