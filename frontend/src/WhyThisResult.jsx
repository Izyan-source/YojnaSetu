import { RuleBadge, RuleLegend } from './ui.jsx'
import { explainEligibility } from './eligibilityExplanations.js'
import './eligibility-explanations.css'

export default function WhyThisResult({ result, context, id, report = false, onReviewProfile }) {
  const explanation = explainEligibility(result, context)
  const Heading = report ? 'h3' : 'h4'
  return <section id={id} tabIndex={-1} className={`why-result ${report ? 'report-block' : ''}`} aria-labelledby={`${id}-title`}>
    <Heading id={`${id}-title`}>Why this result?</Heading>
    <p className={`why-outcome ${explanation.hasBlockingFailure ? 'why-blocked' : ''}`}>{explanation.outcomeExplanation}</p>
    <p className="why-scope">These explanations describe the submitted check. Conditional outcomes apply to one rule only; they do not guarantee approval. Confirm genuine information and correct factual errors only.</p>
    <RuleLegend />
    {explanation.nextSteps.length > 0 && <div className="why-next-steps">
      <h5>What to review first</h5>
      <p>Mandatory failures come first, followed by unresolved mandatory conditions. Information the current form can collect is listed first within that group.</p>
      <ol>{explanation.nextSteps.map((rule) => <li key={rule.rule_id}>{rule.nextStep}</li>)}</ol>
      <div className="why-actions no-print">
        {onReviewProfile && explanation.nextSteps.some((rule) => rule.canReviewProfile) && <button type="button" className="button button-secondary" onClick={onReviewProfile}>Review profile answers</button>}
        {(explanation.rules.some((rule) => rule.documentValues.length) || explanation.documentWarnings.length > 0) && <a className="text-link" href="/documents#upload-review">Review document extraction</a>}
      </div>
    </div>}
    <div className="why-rule-list">{explanation.rules.map((rule) => <details className={`why-rule why-${rule.status.toLowerCase()}`} key={rule.rule_id} open={rule.status === 'FAIL'}>
      <summary><RuleBadge status={rule.status} /><span><strong>{rule.label}</strong><small>{rule.mandatory ? 'Mandatory condition' : 'Additional condition'} · {rule.field}</small></span><span className="why-disclosure" aria-hidden="true">+</span></summary>
      <div className="why-rule-body">
        <dl className="why-facts">
          <div><dt>Current situation</dt><dd>{rule.currentSituation}</dd></div>
          <div><dt>Reason for {rule.status}</dt><dd>{rule.explanation}</dd></div>
          {rule.informationNeeded && <div><dt>Information needed</dt><dd>{rule.informationNeeded}<small>Exact profile field: <code>{rule.attribute}</code></small></dd></div>}
          <div><dt>Why it matters</dt><dd>{rule.whyItMatters}{rule.metadataNote && <small>{rule.metadataNote}</small>}</dd></div>
        </dl>
        {rule.possibleOutcomes.length > 0 && <div className="why-conditional"><h5>Possible outcomes for this rule</h5><ul>{rule.possibleOutcomes.map((text) => <li key={text}>{text}</li>)}</ul>{explanation.hasBlockingFailure && <p>A separate mandatory FAIL still determines the current overall result.</p>}</div>}
        {rule.documentValues.length > 0 && <div className="why-documents"><h5>Document extraction · separate from the submitted answer</h5><p>Original OCR values are shown for review. Saved extraction is not automatically a confirmed eligibility answer.</p><ul>{rule.documentValues.map((document, index) => <li key={`${document.filename}-${index}`}><strong>{document.filename}{document.page ? ` · page ${document.page}` : ''}</strong><span>{document.value}{document.confidence != null ? ` · ${Math.round(document.confidence * 100)}% extraction confidence` : ' · confidence unavailable'}{document.needsReview ? ' · needs review' : ''}</span></li>)}</ul></div>}
        {rule.nextStep && <p className="why-rule-action"><strong>Next step: </strong>{rule.nextStep}</p>}
      </div>
    </details>)}</div>
    {explanation.documentWarnings.length > 0 && <details className="why-document-notes"><summary>Document quality notes to review</summary><ul>{explanation.documentWarnings.map((item, index) => <li key={index}><strong>{item.filename}: </strong>{item.warning}</li>)}</ul><p>Review unreadable or uncertain text against the original, or upload a clearer copy. These notes do not establish eligibility or a mandatory document requirement.</p></details>}
    <div className="why-sources"><h5>Official guidance</h5>{explanation.sources.length ? explanation.sources.map((source) => <a className="text-link" key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name || 'Official scheme source'} ↗</a>) : <p>No official source link is available in this result.</p>}<p>Consult these sources for the evidence needed and any underlying criteria not encoded in the rule record. No additional document requirements have been inferred.</p></div>
  </section>
}
