import { useState } from 'react'
import './App.css'

const navItems = ['Home', 'Analyze', 'History', 'Safety Guide'] as const

type NavItem = (typeof navItems)[number]

type Assessment = {
  score: number
  level: 'Low' | 'Moderate' | 'High'
  summary: string
  flags: string[]
  advice: string
}

const examples = [
  { name: 'Bank alert', text: 'URGENT: Your bank account will be suspended. Verify your password now at https://bank-verify.example/login' },
  { name: 'Delivery notice', text: 'Your package could not be delivered. Pay a redelivery fee at https://delivery-check.example' },
  { name: 'Normal message', text: 'Hey, are we still meeting at the library tomorrow at 3 PM?' },
]
const historyRows = [
  { title: 'Bank impersonation attempt', state: 'High risk · 2 hours ago' },
  { title: 'Fake customer support message', state: 'Moderate risk · yesterday' },
  { title: 'Invoice payment scam', state: 'High risk · 3 days ago' },
  { title: 'Social engineering alert', state: 'Low risk · 1 week ago' },
]

const guideItems = [
  {
    title: 'Urgency triggers',
    content: [
      'Threats of account closure or legal action.',
      'Requests to act within minutes or hours.',
      'Pressure to click a link before verifying the source.',
    ],
  },
  {
    title: 'Verification habits',
    content: [
      'Use official apps or contact numbers from trusted sources.',
      'Check sender identity before sharing personal information.',
      'Pause before responding to emotional or fear-based messaging.',
    ],
  },
  {
    title: 'Link inspection',
    content: [
      'Hover before clicking if available.',
      'Look for misspellings, lookalike domains, or weird redirects.',
      'Review whether a request is expected or unusual.',
    ],
  },
  {
    title: 'When to escalate',
    content: [
      'Any request for passwords, OTPs, or payment details.',
      'Messages that impersonate institutions or family members.',
      'Repeated targeting or unusual account activity.',
    ],
  },
]

function App() {
  const [activePage, setActivePage] = useState<NavItem>('Home')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<Assessment | null>(null)
  const [submitted, setSubmitted] = useState('')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  const analyze = async () => {
    const text = message.trim()
    if (!text || scanning) return

    setScanning(true)
    setResult(null)
    setError('')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const payload = await response.json() as { analysis?: Assessment; error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'AI analysis could not be completed.')
      }
      if (!payload.analysis) {
        throw new Error('The analysis service returned an unexpected response.')
      }

      setSubmitted(text)
      setResult(payload.analysis)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI analysis could not be completed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  const renderPage = () => {
    switch (activePage) {
      case 'Home':
        return (
          <div className="page-shell">
            <div className="hero-panel">
              <div className="hero-copy">
                <div className="eyebrow">Threat intelligence</div>
                <h1 className="hero-title">Know when a message is trying to manipulate you.</h1>
                <p>
                  PhishHook helps people evaluate suspicious emails, texts, and social prompts by surfacing urgency,
                  impersonation patterns, and coercive language before trust is lost.
                </p>
                <button type="button" className="primary-btn" onClick={() => setActivePage('Analyze')}>Try the scanner →</button>
                <div className="hero-stats" style={{ marginTop: 18 }}>
                  <span className="stat-pill"><strong>4x</strong> faster review</span>
                  <span className="stat-pill"><strong>24/7</strong> risk awareness</span>
                  <span className="stat-pill"><strong>AI</strong> guided checks</span>
                </div>
              </div>

              <div className="preview-card">
                <div className="preview-header">
                  <span>Current signal</span>
                  <span>High</span>
                </div>
                <div className="mini-score"><span>62</span></div>
                <div className="preview-grid">
                  <div className="preview-row">
                    <strong>Urgency</strong>
                    <div className="bar"><span style={{ width: '82%' }} /></div>
                  </div>
                  <div className="preview-row">
                    <strong>Impersonation</strong>
                    <div className="bar"><span style={{ width: '75%' }} /></div>
                  </div>
                  <div className="preview-row">
                    <strong>Manipulation</strong>
                    <div className="bar"><span style={{ width: '88%' }} /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Fast scanning</h3>
                <p>Review messages for urgency, impersonation, and coercive patterns before acting.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon">🧠</div>
                <h3>Explainable indicators</h3>
                <p>Cloudflare Workers AI reviews messages for suspicious links, impersonation, and social-engineering tactics.</p>
              </article>
              <article className="feature-card">
                <div className="feature-icon">🛡️</div>
                <h3>Safer decisions</h3>
                <p>Clarify what is risky, what requires verification, and what should be treated as a cue to pause.</p>
              </article>
            </div>
          </div>
        )

      case 'Analyze':
         return (
           <div className="page-shell">
             <div className="eyebrow">Interactive message scanner</div>
             <h1 className="report-title">Analyze a message</h1>
             <section className="scanner-panel">
               <label htmlFor="scan-input" className="scanner-label">Paste a suspicious SMS, email, or DM</label>
               <textarea
                 id="scan-input"
                 className="scanner-input"
                 value={message}
                 maxLength={5000}
                 onChange={event => { setMessage(event.target.value); setResult(null); setError('') }}
                 placeholder="Paste a message here. Avoid including passwords or other sensitive information."
                 rows={6}
               />
               <div className="sample-row">
                 {examples.map(example => (
                   <button type="button" className="secondary-btn" key={example.name}
                     onClick={() => { setMessage(example.text); setResult(null); setError('') }}>
                     {example.name}
                   </button>
                 ))}
               </div>
               <button type="button" className="primary-btn scan-button"
                 disabled={!message.trim() || scanning} onClick={analyze}>
                 {scanning ? 'Scanning message…' : '🔍 Scan for Threats'}
               </button>
               {error && <p className="scanner-note scanner-error" role="alert">{error}</p>}
               <p className="scanner-note">Analysis is sent to Cloudflare Workers AI. Avoid including passwords or verification codes. AI results can be wrong and are not a guarantee of safety.</p>
             </section>
             {result && (
               <section className="report-card scanner-results" aria-live="polite">
                 <div className="report-card-inner">
                   <div className="score-wrap">
                     <div className="score-ring" style={{ background: `conic-gradient(${result.level === 'High' ? '#ff7a7a' : result.level === 'Moderate' ? '#ffca4d' : '#6ee7a7'} 0 ${result.score}%, rgba(255,255,255,.08) ${result.score}% 100%)` }}
                       aria-label={`AI risk indicator score ${result.score} out of 100`}>
                       <span>{result.score}</span>
                     </div>
                   </div>
                   <div className="report-content">
                     <div className="risk-tag">{result.level} indicators</div>
                     <div className="risk-label">AI risk indicator score / 100</div>
                     <h2>Safety Report</h2>
                     <p>{result.summary} This score is a risk indicator, not a probability of fraud.</p>
                     <div className="preview-label">Submitted message</div>
                     <div className="preview-box"><p className="submitted-message">{submitted}</p></div>
                   </div>
                 </div>
                 <div className="flag-panel">
                   <div className="flag-header">Detected warning signs</div>
                   <div className="flag-list">
                     {result.flags.length ? result.flags.map(flag => <span className="flag-badge" key={flag}>{flag}</span>) : <p>No basic rule matched.</p>}
                   </div>
                 </div>
                 <div className="flag-panel">
                   <div className="flag-header">Recommended next step</div>
                   <p>{result.advice}</p>
                 </div>
               </section>
             )}
           </div>
         )

      case 'History':
        return (
          <div className="page-shell">
            <div className="section-header-row">
              <div className="eyebrow">Illustrative history examples</div>
              <button type="button" className="primary-btn small-btn">New Analysis</button>
            </div>
            <h1 className="report-title">History (demo examples)</h1>

            <section className="list-panel">
              <div className="history-list">
                {historyRows.map((row) => (
                  <div key={row.title} className="history-row">
                    <strong>{row.title}</strong>
                    <span>{row.state}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )

      case 'Safety Guide':
        return (
          <div className="page-shell">
            <div className="section-header-row">
              <div className="eyebrow">Stay alert</div>
              <button type="button" className="primary-btn small-btn">Run Check</button>
            </div>
            <h1 className="report-title">Safety Guide</h1>

            <div className="guide-grid">
              {guideItems.map((guide) => (
                <article key={guide.title} className="guide-card">
                  <h3>{guide.title}</h3>
                  <ul>
                    {guide.content.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand" aria-label="PhishHook home">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">PhishHook</span>
          </div>

          <nav className="nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActivePage(item)}
                className={item === activePage ? 'nav-btn active' : 'nav-btn'}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {renderPage()}
    </div>
  )
}

export default App
