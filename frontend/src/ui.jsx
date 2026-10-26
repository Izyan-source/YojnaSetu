export function Icon({ name, size = 22 }) {
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

export function Brand({ href = '/' }) {
  return <a className="brand" href={href} aria-label="YojnaSetu home">
    <span className="brand-mark" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M3 20V11a10 10 0 0 1 20 0v9M8 20v-8a5 5 0 0 1 10 0v8M1 21h24" stroke="currentColor" strokeWidth="1.5"/><path d="M13 2v4" stroke="currentColor" strokeWidth="1.5"/></svg></span>
    <span className="brand-name">YojnaSetu<span className="brand-period">.</span></span>
  </a>
}

export function ButtonLink({ href, children, variant = 'primary', className = '', onClick }) {
  return <a className={`button button-${variant} ${className}`} href={href} onClick={onClick}>{children}</a>
}

export function PageIntro({ eyebrow, title, children }) {
  return <section className="page-intro section-wrap"><p className="eyebrow"><span className="eyebrow-line" />{eyebrow}</p><h1>{title}</h1><div className="page-intro-copy">{children}</div></section>
}

export function SourceBadge({ scheme }) {
  return <span className={`source-badge source-${scheme.source_verification_status}`}>{scheme.source_verification_status === 'official_source_checked' ? 'Official source checked' : 'Source not verified'}</span>
}
