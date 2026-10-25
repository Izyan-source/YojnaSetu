import { useEffect, useState } from 'react'
import PreflightReport from './PreflightReport.jsx'

const schemePresentation = {
  Education: { tone: 'teal', icon: 'book' },
  Agriculture: { tone: 'sand', icon: 'work' },
  Healthcare: { tone: 'blue', icon: 'shield' },
  'Financial Assistance': { tone: 'blue', icon: 'folder' },
  'Household Energy': { tone: 'sand', icon: 'shield' },
}
const states = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry']
const educationLevels = ['No formal schooling', 'Primary', 'Secondary', 'Higher secondary', 'Diploma / vocational', 'Undergraduate', 'Postgraduate or above']
const occupations = ['Student', 'Employed', 'Self-employed', 'Agriculture', 'Seeking employment', 'Homemaker', 'Retired', 'Other']
const socialCategories = ['Scheduled Caste (SC)', 'Scheduled Tribe (ST)', 'Other Backward Class (OBC)', 'General', 'Other category', 'Prefer not to say']

const steps = [
  { number: '01', icon: 'person', title: 'Tell us about yourself', text: 'Share a few details about your situation and what kind of support you are looking for.' },
  { number: '02', icon: 'search', title: 'Discover relevant schemes', text: 'See scheme information that may be relevant, with eligibility details to review.' },
  { number: '03', icon: 'file', title: 'Prepare your documents', text: 'Understand the documents commonly requested before you begin an application.' },
]

const features = [
  { icon: 'check', title: 'Eligibility assessment', text: 'A guided way to understand common eligibility criteria and the details you may need to check.' },
  { icon: 'folder', title: 'Document readiness', text: 'A practical checklist to help you prepare supporting documents before applying.' },
  { icon: 'source', title: 'Answers with sources', text: 'Scheme information is designed to point you back to official sources for confirmation.' },
]

function Icon({ name, size = 22 }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20" /><path d="M8 7h8" /></>,
    work: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11" /><path d="m9 12 2 2 4-4" /></>,
    person: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8m-8 4h8" /></>,
    check: <><path d="M20 7 10 17l-5-5" /><path d="M21 12a9 9 0 1 1-5.3-8.2" /></>,
    folder: <><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 9h18" /></>,
    source: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  }

  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Brand({ href = '/' }) {
  return <a className="brand" href={href} aria-label="YojnaSetu home">
    <span className="brand-mark" aria-hidden="true">Y</span>
    <span className="brand-name">YojnaSetu<span className="brand-period">.</span></span>
  </a>
}

function ButtonLink({ href, children, variant = 'primary', className = '', onClick }) {
  return <a className={`button button-${variant} ${className}`} href={href} onClick={onClick}>{children}</a>
}

function SchemeCard({ scheme }) {
  const presentation = schemePresentation[scheme.category] ?? { tone: 'teal', icon: 'folder' }
  return <article className="scheme-card">
    <div className={`scheme-icon scheme-icon-${presentation.tone}`}><Icon name={presentation.icon} size={23} /></div>
    <p className="scheme-category">{scheme.category}</p>
    <h3>{scheme.name ?? scheme.title}</h3>
    <p className="scheme-description">{scheme.description}</p>
    <div className="scheme-card-bottom">
      <span>{scheme.department ?? scheme.audience}</span>
      <span className="scheme-arrow" aria-hidden="true"><Icon name="arrow" size={17} /></span>
    </div>
  </article>
}

function StepCard({ step }) {
  return <article className="step-card">
    <div className="step-card-top"><span className="step-number">{step.number}</span><span className="step-icon"><Icon name={step.icon} /></span></div>
    <h3>{step.title}</h3>
    <p>{step.text}</p>
  </article>
}

function FeatureCard({ feature }) {
  return <article className="feature-card">
    <span className="feature-icon"><Icon name={feature.icon} size={21} /></span>
    <div><h3>{feature.title}</h3><p>{feature.text}</p></div>
  </article>
}

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
  return <header className="site-header">
    <div className="header-inner">
      <Brand />
      <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
        <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
      </button>
      <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
        <a href="/" aria-current={currentPath === '/' ? 'page' : undefined} onClick={closeMenu}>Home</a>
        <a href="/explore" aria-current={currentPath === '/explore' ? 'page' : undefined} onClick={closeMenu}>Explore Schemes</a>
        <a href="/#how-it-works" onClick={closeMenu}>How It Works</a>
        <HealthStatus health={health} />
        <ButtonLink href="/eligibility" className="nav-cta" onClick={closeMenu}>Check Eligibility <Icon name="arrow" size={16} /></ButtonLink>
      </nav>
    </div>
  </header>
}

function Hero() {
  return <section className="hero section-wrap" id="home">
    <div className="hero-copy">
      <p className="eyebrow"><span className="eyebrow-line" /> PUBLIC SUPPORT, MADE MORE ACCESSIBLE</p>
      <h1>Government schemes,<br /><span>made easier to access.</span></h1>
      <p className="hero-description">Finding the right support shouldn’t be complicated. Discover schemes that may fit your situation and get clearer on what to do next.</p>
      <div className="hero-actions">
        <ButtonLink href="/eligibility">Check eligibility <Icon name="arrow" size={17} /></ButtonLink>
        <ButtonLink href="/explore" variant="secondary">Explore schemes</ButtonLink>
      </div>
      <p className="hero-note"><Icon name="source" size={15} /> Clear information. Your decisions stay yours.</p>
    </div>
    <div className="hero-visual" aria-label="Illustrative preview of the YojnaSetu journey">
      <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
      <div className="visual-kicker"><span className="visual-kicker-mark"><Icon name="pin" size={16} /></span><span>SUPPORT, WITH A CLEARER PATH</span></div>
      <div className="journey-card">
        <div className="journey-heading"><div><span className="small-label">YOUR NEXT STEPS</span><h2>A little guidance goes a long way.</h2></div><span className="journey-spark" aria-hidden="true">✳</span></div>
        <div className="journey-row"><span className="journey-index">01</span><span className="journey-icon"><Icon name="person" size={19} /></span><span className="journey-copy"><strong>Share your situation</strong><small>Start with what matters to you</small></span><span className="journey-check">✓</span></div>
        <div className="journey-row"><span className="journey-index">02</span><span className="journey-icon"><Icon name="search" size={19} /></span><span className="journey-copy"><strong>See possible matches</strong><small>Explore relevant support</small></span><span className="journey-arrow"><Icon name="arrow" size={15} /></span></div>
        <div className="journey-row"><span className="journey-index">03</span><span className="journey-icon"><Icon name="file" size={19} /></span><span className="journey-copy"><strong>Get application-ready</strong><small>Know what to prepare</small></span><span className="journey-arrow"><Icon name="arrow" size={15} /></span></div>
        <div className="illustrative-note"><span /> Illustrative preview · Guidance is not an application</div>
      </div>
      <div className="visual-caption">A more considered way to find your next step.</div>
    </div>
  </section>
}

function HowItWorks() {
  return <section className="how-section" id="how-it-works">
    <div className="section-wrap">
      <div className="section-heading">
        <div><p className="eyebrow">A SIMPLE PLACE TO BEGIN</p><h2>From questions to<br /><span>clear next steps.</span></h2></div>
        <p>Public schemes can be hard to navigate. We’re shaping a simpler journey to help you understand where to look and what to prepare.</p>
      </div>
      <div className="steps-grid">{steps.map((step) => <StepCard key={step.number} step={step} />)}</div>
    </div>
  </section>
}

function Schemes({ schemeState }) {
  return <section className="schemes-section section-wrap" id="schemes">
    <div className="section-heading scheme-heading">
      <div><p className="eyebrow">A STARTING POINT</p><h2>Explore the kinds of<br /><span>support out there.</span></h2></div>
      <div className="scheme-heading-aside"><p>Browse records with official source references. Each summary covers only a subset of the scheme’s current conditions.</p><a className="text-link" href="#features">How YojnaSetu can help <Icon name="arrow" size={16} /></a></div>
    </div>
    <div className="scheme-label"><span className="label-dot" /> SCHEME DATA FROM YOJNASETU API</div>
    {schemeState.loading ? <p className="data-state">Loading scheme information…</p> : schemeState.error ? <p className="data-state error-state">Scheme information is temporarily unavailable. Visit Explore Schemes to retry.</p> : schemeState.schemes.length ? <div className="schemes-grid">{schemeState.schemes.slice(0, 3).map((scheme) => <SchemeCard key={scheme.scheme_id} scheme={scheme} />)}</div> : <p className="data-state">No schemes are available right now.</p>}
  </section>
}

function Features() {
  return <section className="features-section" id="features">
    <div className="section-wrap features-layout">
      <div className="features-copy"><p className="eyebrow">BUILT AROUND YOUR JOURNEY</p><h2>Useful guidance,<br /><span>at every step.</span></h2><p>From understanding possible eligibility to getting documents in order, YojnaSetu is designed to make the process feel more manageable.</p><ButtonLink href="/eligibility" variant="light">Start an assessment <Icon name="arrow" size={16} /></ButtonLink></div>
      <div className="features-list">{features.map((feature) => <FeatureCard key={feature.title} feature={feature} />)}</div>
    </div>
  </section>
}

function AskSection({ schemes }) {
  const [question, setQuestion] = useState('')
  const [schemeId, setSchemeId] = useState('')
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
    <div className="ask-heading"><p className="eyebrow">ASK ABOUT A SCHEME</p><h2>Questions, grounded in<br /><span>available documents.</span></h2><p>Answers use retrieved text from the local scheme document index. If the documents do not support an answer, YojnaSetu will say so.</p></div>
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
      {result && <div className="ask-result" aria-live="polite"><span className={`result-status ${result.status === 'ANSWERED' ? 'result-potentially_eligible' : 'result-undetermined'}`}>{result.status === 'ANSWERED' ? 'Document-based response' : 'Could not verify from available documents'}</span><p className="ask-answer">{result.answer}</p>{result.notice && <p className="ask-notice">{result.notice}</p>}{result.sources?.length > 0 && <div className="ask-sources"><h3>Supporting sources</h3>{result.sources.map((source, index) => <article className="ask-source" key={`${source.source_url}-${source.page_number}-${index}`}><div><a href={source.source_url} target="_blank" rel="noreferrer">{source.document_title}{source.page_number ? ` · page ${source.page_number}` : ''} <Icon name="arrow" size={14} /></a><p>{source.excerpt}</p></div></article>)}</div>}</div>}
    </form>
  </section>
}

const documentFieldLabels = {
  applicant_name: 'Applicant name', date_of_birth: 'Date of birth', age: 'Age', address: 'Address', state: 'State',
  annual_family_income_inr: 'Annual family income (INR)', certificate_type: 'Certificate type',
  issuing_authority: 'Issuing authority', certificate_date: 'Certificate or issue date', certificate_valid_until: 'Certificate valid-until date', certificate_number: 'Certificate/reference number',
}

function DocumentIntelligence({ schemes }) {
  const [analysis, setAnalysis] = useState(null)
  const [values, setValues] = useState({})
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [schemeId, setSchemeId] = useState('')
  const [selectedFields, setSelectedFields] = useState({})
  const [editedFields, setEditedFields] = useState({})
  const [selectedRequirement, setSelectedRequirement] = useState('')
  const [documents, setDocuments] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('yojnasetu-document-analyses') || '[]') } catch { return [] }
  })
  const selectedScheme = schemes.find((scheme) => scheme.scheme_id === schemeId)

  async function analyze(selectedFile) {
    if (!selectedFile) return
    if (documents.length >= 10) {
      setError('This review supports up to 10 uploaded documents. Remove a document from the browser session before adding another.')
      return
    }
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

  function useInAssessment() {
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
    sessionStorage.setItem('yojnasetu-document-readiness', JSON.stringify({
      scheme_id: schemeId,
      file_name: file?.name || '',
      local_id: analysis?.local_id || '',
      document_type: analysis?.extracted_fields?.certificate_type?.value || file?.name || 'Uploaded document',
      mapped_requirement: selectedRequirement,
      mapping_confirmed: Boolean(selectedRequirement),
      quality_warnings: analysis?.warnings || [],
    }))
    window.location.assign('/eligibility')
  }

  return <section className="document-section section-wrap" id="document-intelligence">
    <div className="document-intro"><p className="eyebrow">DOCUMENT INTELLIGENCE</p><h2>Make document details<br /><span>easier to review.</span></h2><p>Extract text locally from a PDF or image, review what was detected, and correct it before choosing whether to prefill an assessment.</p><p className="document-privacy">Files are processed for this request and are not saved as application records. Text extraction does not authenticate documents.</p></div>
    <div className="document-panel">
      <label className={`document-dropzone ${dragging ? 'dropzone-active' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); analyze(event.dataTransfer.files?.[0]) }}>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={busy || documents.length >= 10} onChange={(event) => analyze(event.target.files?.[0])} />
        <span className="document-upload-mark"><Icon name="file" size={24} /></span><strong>{busy ? 'Analyzing document…' : documents.length >= 10 ? 'Document limit reached' : 'Drop a document here or browse files'}</strong><small>PDF, PNG, JPG or JPEG · up to 10 MB · 20 PDF pages · maximum 10 documents</small>
        {file && <span className="document-file-name">{file.name}</span>}
      </label>
      <label className="document-scheme-select" htmlFor="document-scheme">Scheme for document readiness
        <select id="document-scheme" value={schemeId} onChange={(event) => { setSchemeId(event.target.value); setSelectedRequirement('') }}><option value="">Choose a scheme</option>{schemes.map((scheme) => <option key={scheme.scheme_id} value={scheme.scheme_id}>{scheme.name}</option>)}</select>
      </label>
      {busy && <p className="ask-loading" role="status">Extracting text and checking document readability…</p>}
      {error && <p className="api-error" role="alert">{error}</p>}
      {documents.length > 1 && <div className="retained-documents"><strong>{documents.length} analyzed documents retained for the consistency check</strong><ul>{documents.map((document) => <li key={document.local_id}>{document.filename} · {document.page_count} page{document.page_count === 1 ? '' : 's'}</li>)}</ul></div>}
      {analysis && <div className="document-results" aria-live="polite">
        <div className="document-result-heading"><div><span className="small-label">EXTRACTION COMPLETE</span><h3>Review detected details</h3></div><span>{analysis.page_count} page{analysis.page_count === 1 ? '' : 's'} · {analysis.extraction_methods.join(', ') || 'No readable text'}</span></div>
        <p className="document-authenticity">{analysis.authenticity_notice}</p>
        <div className="extracted-fields">{Object.entries(documentFieldLabels).map(([key, label]) => {
          const field = analysis.extracted_fields[key]
          const uncertain = !values[key] || (!editedFields[key] && field?.confidence != null && field.confidence < 0.7)
          const fieldState = !values[key] ? 'missing' : selectedFields[key] ? 'user-confirmed' : editedFields[key] ? 'user-corrected' : uncertain ? 'uncertain' : 'extracted'
          return <label className={`extracted-field ${uncertain ? 'extracted-uncertain' : ''}`} key={key}><span>{label}<span className="field-origin"> · {fieldState}</span></span><input type="text" value={values[key] ?? ''} placeholder="Not detected" onChange={(event) => { setValues((current) => ({ ...current, [key]: event.target.value })); setEditedFields((current) => ({ ...current, [key]: true })) }} />{field?.confidence != null && <small>{Math.round(field.confidence * 100)}% extraction confidence{field.source_page ? ` · page ${field.source_page}` : ''}</small>}<span className="confirm-field"><input type="checkbox" checked={Boolean(selectedFields[key])} disabled={!values[key]} onChange={(event) => setSelectedFields((current) => ({ ...current, [key]: event.target.checked }))} /> Select reviewed value for eligibility form</span></label>
        })}</div>
        {selectedScheme && selectedScheme.required_documents?.length > 0 && <label className="document-scheme-select" htmlFor="document-requirement">If appropriate, mark this upload as one required item after reviewing it
          <select id="document-requirement" value={selectedRequirement} onChange={(event) => setSelectedRequirement(event.target.value)}><option value="">Do not mark a requirement available</option>{selectedScheme.required_documents.map((document) => <option value={document} key={document}>{document}</option>)}</select>
        </label>}
        {analysis.warnings.length > 0 && <div className="document-warnings" role="status"><strong>Review these notes</strong><ul>{analysis.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
        <button className="button button-primary" type="button" onClick={useInAssessment}>Use corrected age, state and income in assessment <Icon name="arrow" size={16} /></button>
      </div>}
    </div>
  </section>
}

function EligibilityPrompt() {
  return <section className="eligibility-section section-wrap" id="eligibility">
    <div className="eligibility-card">
      <div><p className="eyebrow">A CLEARER FIRST STEP</p><h2>Know where to begin.</h2><p>Personalised eligibility guidance is coming soon. For now, explore the illustrative examples and use official scheme sources to confirm details.</p></div>
      <ButtonLink href="/explore" variant="secondary">Browse examples <Icon name="arrow" size={16} /></ButtonLink>
    </div>
  </section>
}

function Footer({ health }) {
  return <footer className="site-footer">
    <div className="footer-main section-wrap">
      <div className="footer-brand-col"><Brand /><p>Helping people find a clearer path to public support.</p></div>
      <div className="footer-links"><span className="footer-heading">EXPLORE</span><a href="/">Home</a><a href="/explore">Explore schemes</a><a href="/#how-it-works">How it works</a></div>
      <div className="footer-links"><span className="footer-heading">YOUR NEXT STEP</span><a href="/eligibility">Check eligibility</a><a href="/#features">What we’re building</a><HealthStatus health={health} /></div>
    </div>
    <div className="footer-bottom section-wrap"><span>© {new Date().getFullYear()} YojnaSetu</span><p>YojnaSetu is an independent guidance platform and is not affiliated with or endorsed by any government body. Eligibility guidance does not guarantee government approval. Always verify scheme details with the official source.</p></div>
  </footer>
}

function SchemeDetails({ scheme, loading, error, onClose, onRetry }) {
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return <div className="scheme-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="scheme-dialog" role="dialog" aria-modal="true" aria-labelledby="scheme-dialog-title">
      <button type="button" className="dialog-close" aria-label="Close scheme details" onClick={onClose}>×</button>
      {loading ? <div className="detail-loading" role="status">Loading scheme details…</div> : error ? <div className="detail-loading" role="alert"><h2 id="scheme-dialog-title">Scheme details unavailable</h2><p>{error}</p><button type="button" className="text-link" onClick={onRetry}>Try again</button></div> : <>
      <span className={`illustrative-badge source-badge source-${scheme.source_verification_status}`}>{scheme.source_verification_status === 'official_source_checked' ? 'Official source checked' : 'Source not verified'}</span>
      <p className="scheme-category">{scheme.category}</p>
      <h2 id="scheme-dialog-title">{scheme.name}</h2>
      <p className="scheme-description">{scheme.description}</p>
      <dl className="scheme-detail-list">
        <div><dt>Department</dt><dd>{scheme.department}</dd></div>
        <div><dt>Geographical applicability</dt><dd>{scheme.applicability}</dd></div>
        <div><dt>Eligibility rules represented</dt><dd>{scheme.eligibility_rules.length} explicit condition{scheme.eligibility_rules.length === 1 ? '' : 's'}; unencoded conditions remain unknown</dd></div>
        <div><dt>Document readiness</dt><dd>{scheme.documents_status === 'unknown' ? scheme.documents_note : `${scheme.required_documents.length} document types listed; requirements are not assessed against your profile.`}</dd></div>
      </dl>
      <p className="scheme-disclaimer">Source check confirms that the linked source is official; it does not mean this product's summary or assessment is an approval. Confirm current conditions with the official source.</p>
      <a className="button button-secondary official-source-link" href={scheme.official_source_url} target="_blank" rel="noreferrer">Open official source <Icon name="arrow" size={16} /></a>
      <button type="button" className="button button-primary" onClick={onClose}>Close details</button>
      </>}
    </section>
  </div>
}

function ExplorePage({ schemeState }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All categories')
  const [detailState, setDetailState] = useState({ open: false, loading: false, scheme: null, schemeId: '', error: '' })
  const normalizedQuery = query.trim().toLowerCase()
  const categoryOptions = ['All categories', ...new Set(schemeState.schemes.map((scheme) => scheme.category))]
  const filteredSchemes = schemeState.schemes.filter((scheme) => {
    const matchesCategory = category === 'All categories' || scheme.category === category
    const searchable = `${scheme.name} ${scheme.category} ${scheme.department} ${scheme.applicability} ${scheme.description}`.toLowerCase()
    return matchesCategory && searchable.includes(normalizedQuery)
  })

  async function loadSchemeDetails(schemeId) {
    setDetailState({ open: true, loading: true, scheme: null, schemeId, error: '' })
    try {
      const response = await fetch(`/api/schemes/${encodeURIComponent(schemeId)}`)
      if (!response.ok) throw new Error(`Scheme details request failed with status ${response.status}`)
      const data = await response.json()
      setDetailState({ open: true, loading: false, scheme: data, schemeId, error: '' })
    } catch (error) {
      setDetailState({ open: true, loading: false, scheme: null, schemeId, error: error.message || 'Could not load scheme details.' })
    }
  }

  return <>
    <main className="page-content">
      <section className="page-intro section-wrap">
        <p className="eyebrow"><span className="eyebrow-line" /> EXPLORE PUBLIC SUPPORT</p>
        <h1>Find schemes to<br /><span>learn more about.</span></h1>
        <p>Browse scheme records by topic or search by name and keyword. Each listing links to its source and shows how much of its eligibility information is encoded.</p>
      </section>
      <section className="explore-content section-wrap" aria-labelledby="browse-heading">
        <div className="explore-toolbar">
          <label className="search-field">
            <Icon name="search" size={19} />
            <span className="visually-hidden">Search by scheme name or keyword</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search schemes or keywords" />
            {query && <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
          </label>
          <p className="result-count" aria-live="polite">{filteredSchemes.length} {filteredSchemes.length === 1 ? 'example' : 'examples'}</p>
        </div>
        <div className="category-filters" role="group" aria-label="Filter schemes by category">
          {categoryOptions.map((item) => <button key={item} type="button" className={`filter-chip ${category === item ? 'filter-active' : ''}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <div className="example-notice"><span className="label-dot" /> <strong>Source checked ≠ eligibility verified</strong><span>Only official source links are listed. Encoded rules cover a limited subset; unknown criteria stay undetermined.</span></div>
        <h2 className="visually-hidden" id="browse-heading">Scheme examples</h2>
        {schemeState.loading ? <p className="data-state" role="status">Loading scheme information…</p> : schemeState.error ? <div className="empty-results" role="alert"><h3>Scheme information is unavailable</h3><p>{schemeState.error}</p><button type="button" className="text-link" onClick={schemeState.reload}>Try again</button></div> : filteredSchemes.length ? <div className="browse-grid">
          {filteredSchemes.map((scheme) => <article className="browse-card" key={scheme.scheme_id}>
            <div className="browse-card-top"><span className={`scheme-icon scheme-icon-${schemePresentation[scheme.category]?.tone ?? 'teal'}`}><Icon name={schemePresentation[scheme.category]?.icon ?? 'folder'} size={21} /></span><span className={`illustrative-badge source-badge source-${scheme.source_verification_status}`}>{scheme.source_verification_status === 'official_source_checked' ? 'Official source checked' : 'Source unknown'}</span></div>
            <p className="scheme-category">{scheme.category}</p>
            <h3>{scheme.name}</h3>
            <p className="browse-department"><span>Department</span>{scheme.department}</p>
            <p className="browse-beneficiaries"><span>Geographical applicability</span>{scheme.applicability}</p>
            <p className="scheme-description">{scheme.description}</p>
            <button type="button" className="details-link" onClick={() => loadSchemeDetails(scheme.scheme_id)}>View Details <Icon name="arrow" size={16} /></button>
          </article>)}
        </div> : <div className="empty-results"><span className="empty-icon"><Icon name="search" size={23} /></span><h3>No schemes found</h3><p>Try a different search term or choose another category.</p><button className="text-link" type="button" onClick={() => { setQuery(''); setCategory('All categories') }}>Clear filters</button></div>}
      </section>
    </main>
    {detailState.open && <SchemeDetails {...detailState} onClose={() => setDetailState({ open: false, loading: false, scheme: null, schemeId: '', error: '' })} onRetry={() => loadSchemeDetails(detailState.schemeId)} />}
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

const eligibilityStatusLabels = {
  POTENTIALLY_ELIGIBLE: 'Potentially eligible',
  NOT_ELIGIBLE: 'Not eligible based on a failed condition',
  UNDETERMINED: 'Undetermined · more information needed',
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
      setResult(data)
    } catch (requestError) {
      setError(requestError.message || 'Could not compare the profile and documents.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="consistency-panel" aria-labelledby="consistency-heading">
    <div className="consistency-panel-heading"><p className="eyebrow">CROSS-DOCUMENT REVIEW</p><h3 id="consistency-heading">Check details across documents</h3><p>Review or correct the applicant profile below. Your edits only change this profile draft; original OCR values remain unchanged.</p></div>
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
      <div className="rule-results"><h5>Eligibility conditions · independent of document readiness</h5>{result.rule_results.map((rule) => <div className="rule-result" key={rule.rule_id}><span className={`rule-status rule-${rule.status.toLowerCase()}`}>{rule.status}</span><div><strong>{rule.label}</strong><p>{rule.explanation}</p>{source?.url ? <a className="rule-source-link" href={source.url} target="_blank" rel="noreferrer">Official scheme source <Icon name="arrow" size={12} /></a> : <small>Official source reference unavailable.</small>}</div></div>)}</div>
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
      sessionStorage.removeItem('yojnasetu-document-profile')
      const manualValues = Object.fromEntries(manuallyTouched.filter((key) => key in manual).map((key) => [key, manual[key]]))
      return { ...initialForm, ...prefill, ...manualValues }
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
    try { return JSON.parse(sessionStorage.getItem('yojnasetu-document-readiness') || '{}').scheme_id || '' } catch { return '' }
  })
  const [documentReadiness, setDocumentReadiness] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('yojnasetu-document-readiness') || 'null') } catch { return null }
  })
  const [documentAnalyses] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('yojnasetu-document-analyses') || '[]') } catch { return [] }
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
    return Object.keys(nextErrors).length === 0
  }

  function continueToReview() {
    if (validateStep()) setStep(step + 1)
  }

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
    <section className="form-intro section-wrap">
      <p className="eyebrow"><span className="eyebrow-line" /> A PRIVATE FIRST STEP</p>
      <h1>Let’s understand<br /><span>what may fit you.</span></h1>
      <p>Share a few details to compare against encoded conditions. This form does not make an official eligibility determination or submit an application.</p>
    </section>
    <section className="assessment-card section-wrap" aria-labelledby="assessment-title">
      <div className="assessment-heading">
        <div><span className="small-label">ELIGIBILITY ASSESSMENT · FORM PREVIEW</span><h2 id="assessment-title">A few details, at your pace.</h2></div>
        <span className="assessment-count">{complete ? 'Complete' : `STEP ${step} OF 3`}</span>
      </div>
      <ol className="assessment-progress" aria-label="Form progress">
        <li className={step >= 1 ? 'progress-current' : ''}><span>1</span><span>About you</span></li>
        <li className={step >= 2 ? 'progress-current' : ''}><span>2</span><span>Your background</span></li>
        <li className={step >= 3 || complete ? 'progress-current' : ''}><span>3</span><span>Review</span></li>
      </ol>

      {!complete && <div className="assessment-scheme-select"><FormField id="assessment-scheme" label="Scheme to assess" error={errors.scheme} hint="Only encoded conditions for the selected scheme are evaluated.">{(describedBy) => <select id="assessment-scheme" value={selectedSchemeId} onChange={(event) => { setSelectedSchemeId(event.target.value); setErrors((current) => ({ ...current, scheme: '' })) }} aria-invalid={Boolean(errors.scheme)} aria-describedby={describedBy}><option value="">Choose a scheme</option>{schemes.map((scheme) => <option key={scheme.scheme_id} value={scheme.scheme_id}>{scheme.name}</option>)}</select>}</FormField></div>}

      {complete ? <div className="form-results-state">
        <PreflightReport
          scheme={schemes.find((item) => item.scheme_id === selectedSchemeId)}
          initialProfile={{
            applicant_name: '', date_of_birth: '', age: form.age, address: '', state: form.state,
            annual_family_income_inr: form.income, education_level: form.education, occupation: form.occupation, category: form.category,
            certificate_type: '', issuing_authority: '', certificate_date: '', certificate_valid_until: '', certificate_number: '',
          }}
          profileSources={profileSources}
          documents={documentAnalyses}
          documentReadiness={documentReadiness}
        />
        <ButtonLink href="/explore" variant="secondary">Explore schemes <Icon name="arrow" size={16} /></ButtonLink>
      </div> : <>
        {step === 1 && <div className="form-step" aria-labelledby="step-one-title">
          <div className="form-step-heading"><span>STEP 1</span><h3 id="step-one-title">Where are you in your journey?</h3><p>Share any details you know. Missing answers remain unknown in the rule check.</p></div>
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
          <div className="form-step-heading"><span>STEP 2</span><h3 id="step-two-title">Tell us a little about your background.</h3><p>Share what you know; blank values are not treated as failed conditions.</p></div>
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
          <div className="form-step-heading"><span>STEP 3</span><h3 id="review-title">Review your details.</h3><p>Check what you entered. You can go back to make changes.</p></div>
          <dl className="review-list">{Object.entries(fields).map(([key, field]) => <div key={key}><dt>{field.label}</dt><dd>{field.display}<small className={`profile-origin origin-${profileSources[key] || 'missing'}`}>{profileSources[key] === 'document-confirmed' ? 'Reviewed document value · confirmed by you' : profileSources[key] === 'manually-entered' ? 'Entered by you' : field.display === 'Not provided' ? 'Missing · remains unknown' : 'Review this value'}</small></dd></div>)}</dl>
          <p className="review-notice"><Icon name="source" size={18} /> When you request the check, these details are sent to the YojnaSetu backend for a deterministic comparison against encoded rules. No application is submitted, and uncollected criteria will remain undetermined.</p>
        </div>}

        {submitError && <p className="api-error" role="alert">{submitError} Check that the FastAPI backend is running, then try again.</p>}

        <div className="form-actions">
          {step > 1 && <button type="button" className="button button-secondary" onClick={() => changeStep(step - 1)}>Back</button>}
          {step < 2 && <button type="button" className="button button-primary" onClick={continueToReview}>Continue <Icon name="arrow" size={16} /></button>}
          {step === 2 && <button type="button" className="button button-primary" onClick={continueToReview}>Review <Icon name="arrow" size={16} /></button>}
          {step === 3 && <button type="button" className="button button-primary" onClick={finishReview} disabled={submitting}>{submitting ? 'Checking…' : 'Check encoded rules'} {!submitting && <Icon name="check" size={16} />}</button>}
        </div>
      </>}
    </section>
    <p className="form-footnote section-wrap">The rule engine covers only conditions explicitly encoded from linked official sources. It does not calculate a final or official decision.</p>
  </main>
}

export default function App() {
  const [health, setHealth] = useState({ state: 'checking' })
  const [schemeState, setSchemeState] = useState({ loading: true, error: '', schemes: [] })
  const [schemeReload, setSchemeReload] = useState(0)
  const [route, setRoute] = useState(window.location.pathname.replace(/\/$/, '') || '/')

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname.replace(/\/$/, '') || '/')
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
    document.title = route === '/explore' ? 'Explore Schemes | YojnaSetu' : route === '/eligibility' ? 'Eligibility Assessment | YojnaSetu' : 'YojnaSetu'
    const hash = window.location.hash
    if (hash) window.setTimeout(() => document.querySelector(hash)?.scrollIntoView(), 0)
    else window.scrollTo(0, 0)
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

  function handleNavigation(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.target.closest('a[href]')
    if (!anchor) return
    const targetUrl = new URL(anchor.href, window.location.href)
    if (targetUrl.origin !== window.location.origin || !['/', '/explore', '/eligibility'].includes(targetUrl.pathname.replace(/\/$/, '') || '/')) return
    event.preventDefault()
    window.history.pushState({}, '', `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`)
    const nextRoute = targetUrl.pathname.replace(/\/$/, '') || '/'
    setRoute(nextRoute)
    if (nextRoute === route) {
      if (targetUrl.hash) document.querySelector(targetUrl.hash)?.scrollIntoView({ behavior: 'smooth' })
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return <div className="app-root" onClick={handleNavigation}>
    <Header health={health} currentPath={route} />
    {route === '/explore' ? <ExplorePage schemeState={{ ...schemeState, reload: () => setSchemeReload((value) => value + 1) }} /> : route === '/eligibility' ? <EligibilityPage schemes={schemeState.schemes} /> : <main><Hero /><HowItWorks /><Schemes schemeState={schemeState} /><Features /><AskSection schemes={schemeState.schemes} /><DocumentIntelligence schemes={schemeState.schemes} /><EligibilityPrompt /></main>}
    <Footer health={health} />
  </div>
}
