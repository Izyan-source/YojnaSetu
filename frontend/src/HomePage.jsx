import { ButtonLink, Icon, SourceBadge } from './ui.jsx'

const workflowLinks = [
  { title: 'Discover schemes', text: 'Search and explore relevant government schemes.', href: '/explore' },
  { title: 'Understand eligibility', text: 'Review criteria and understand PASS, FAIL, and UNKNOWN results.', href: '/eligibility' },
  { title: 'Prepare documents', text: 'Review document readiness, extracted information, and inconsistencies.', href: '/documents' },
]

const journey = [
  { number: '01', title: 'Discover relevant support.', text: 'Search by need, category, or location. Read scheme summaries and follow the official source.', href: '/explore', action: 'Explore schemes' },
  { number: '02', title: 'Understand the conditions.', text: 'Review your details against encoded rules. See the reasons behind each pass, fail, or unknown result.', href: '/eligibility', action: 'Check eligibility' },
  { number: '03', title: 'Prepare your documents.', text: 'Review extracted fields, check for inconsistencies, and bring your findings into a preflight report.', href: '/documents', action: 'Open Document Assistant' },
]

function SchemePreview({ schemeState }) {
  const scheme = schemeState.schemes[0]
  return <aside className="scheme-preview" aria-labelledby="preview-heading">
    <div className="preview-caption"><span>FROM THE SCHEME DIRECTORY</span><span aria-hidden="true">YS / 01</span></div>
    <div className="preview-sheet">
      {schemeState.loading ? <div className="preview-state" role="status"><p className="eyebrow">SCHEME NOTES</p><h2 id="preview-heading">Opening the directory…</h2><p>Fetching scheme information from YojnaSetu.</p></div> : schemeState.error || !scheme ? <div className="preview-state"><p className="eyebrow">SCHEME NOTES</p><h2 id="preview-heading">Your next step starts here.</h2><p>{schemeState.error ? 'The scheme directory is temporarily unavailable.' : 'No scheme records are available right now.'}</p><ButtonLink href="/explore" variant="secondary">Open directory <Icon name="arrow" size={16} /></ButtonLink></div> : <>
        <div className="preview-sheet-top"><span className="scheme-category">{scheme.category}</span><span className="preview-location">{scheme.applicability}</span></div>
        <h2 id="preview-heading">{scheme.name}</h2>
        <p className="preview-description">{scheme.description}</p>
        <div className="preview-divider"><span>BEFORE YOU BEGIN</span><Icon name="file" size={17} /></div>
        <ul className="preview-conditions">{scheme.eligibility_rules.slice(0, 2).map((rule) => <li key={rule.rule_id}><span className="condition-marker" aria-hidden="true" />{rule.label}</li>)}</ul>
        <p className="preview-note">A selection of recorded conditions. Read the full scheme before checking eligibility.</p>
        <div className="preview-sheet-footer"><SourceBadge scheme={scheme} /><a className="text-link" href={`/explore/${encodeURIComponent(scheme.scheme_id)}`}>Read scheme <Icon name="arrow" size={16} /></a></div>
      </>}
    </div>
    <div className="preview-bottom"><span className="folio-mark" aria-hidden="true" /><p>From finding a scheme<br />to knowing what to prepare.</p><span className="preview-bottom-number" aria-hidden="true">01—03</span></div>
  </aside>
}

export default function HomePage({ schemeState }) {
  return <main className="home-page">
    <section className="hero section-wrap">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-line" /> A BRIDGE TO PUBLIC SUPPORT</p>
        <h1>Possibilities,<em>made clearer.</em></h1>
        <p className="hero-description">Government schemes can open doors. Understand your options, check the conditions, and prepare your next step with YojnaSetu.</p>
        <div className="hero-actions"><ButtonLink href="/explore">Find a scheme <Icon name="arrow" size={18} /></ButtonLink><ButtonLink href="/eligibility" variant="secondary">Check eligibility</ButtonLink></div>
        <div className="hero-note"><span className="editorial-rule" /><p>Independent guidance.<br />Informed by official sources.</p></div>
      </div>
      <SchemePreview schemeState={schemeState} />
    </section>
    <nav className="home-principles section-wrap" aria-label="Choose your next step">
      {workflowLinks.map((item, index) => <a className="workflow-link" href={item.href} key={item.href} aria-labelledby={`workflow-title-${index}`} aria-describedby={`workflow-description-${index}`}>
        <div className="workflow-link-top"><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><Icon name="arrow" size={18} /></div>
        <h2 id={`workflow-title-${index}`}>{item.title}</h2>
        <p id={`workflow-description-${index}`}>{item.text}</p>
      </a>)}
    </nav>
    <section className="journey-section section-wrap" id="how-it-works" aria-labelledby="journey-heading">
      <div className="journey-intro"><div><p className="eyebrow">A CONSIDERED WAY FORWARD</p><h2 id="journey-heading">Less uncertainty.<br /><em>More direction.</em></h2></div><p>You don’t need every answer to begin. These three steps help you move from exploring support to preparing your next action.</p></div>
      <ol className="journey-list">{journey.map((step) => <li className="journey-card" key={step.number}><span className="journey-number"><span className="visually-hidden">Step </span>{step.number}</span><div className="journey-card-content"><h3>{step.title}</h3><p>{step.text}</p><a className="text-link" href={step.href}>{step.action}<Icon name="arrow" size={16} /></a></div></li>)}</ol>
    </section>
    <section className="trust-section" id="transparency"><div className="section-wrap trust-layout">
      <div className="trust-intro"><p className="eyebrow">CLARITY IS A RESPONSIBILITY</p><h2>Know the source.<br /><em>Know the limits.</em></h2><p>Good guidance helps you make an informed decision. It also tells you what it cannot know.</p><a className="text-link" href="/explore">Explore the source records <Icon name="arrow" size={16} /></a></div>
      <div className="trust-principles">
        <article><span>01</span><div><h3>Sources you can follow</h3><p>Scheme records link to official sources. Document-based answers cite the evidence available in the local index.</p></div></article>
        <article><span>02</span><div><h3>Reasons you can understand</h3><p>Eligibility checks explain each encoded condition. Missing information stays unknown; it is never silently treated as a pass.</p></div></article>
        <article><span>03</span><div><h3>Guidance with boundaries</h3><p>YojnaSetu is independent of government. OCR does not authenticate documents, and a preflight report is not an approval or an application.</p></div></article>
      </div>
    </div></section>
    <section className="home-next section-wrap"><div><p className="eyebrow">WHEN YOU’RE READY</p><h2>Take the next <em>small step.</em></h2></div><ButtonLink href="/eligibility">Start your eligibility check <Icon name="arrow" size={18} /></ButtonLink></section>
  </main>
}
