import { useState } from 'react'
import './App.css'

const navItems = ['Home', 'Analyze', 'History', 'Safety Guide'] as const

type NavItem = (typeof navItems)[number]

const signals = [
  { label: 'Fake News', value: 8, icon: '📰' },
  { label: 'Scam Risk', value: 57, icon: '🚨' },
  { label: 'Harassment', value: 8, icon: '🚩' },
  { label: 'Manipulation', value: 57, icon: '🎭' },
]

const flags = [
  'Urgent language detected',
  'Suspicious link or click request',
  'Possible phishing attempt',
  'Emotional manipulation',
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
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

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
                  Phishing Hook helps people evaluate suspicious emails, texts, and social prompts by surfacing urgency,
                  impersonation patterns, and coercive language before trust is lost.
                </p>
                <div className="hero-stats">
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
                <h3>AI-informed logic</h3>
                <p>Signal-based assessment highlights suspicious patterns and manipulative language.</p>
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
            <div className="headline-row">
              <div className="eyebrow">ANALYSIS COMPLETE</div>
              <div className="headline-actions">
                <button type="button" className="secondary-btn">Share</button>
                <button type="button" className="primary-btn">Analyze Again</button>
              </div>
            </div>

            <h1 className="report-title">Safety Report</h1>

            <section className="report-card">
              <div className="report-card-inner">
                <div className="score-wrap">
                  <div className="score-ring" aria-label="Risk score 48 out of 100">
                    <span>48</span>
                  </div>
                </div>

                <div className="report-content">
                  <div className="risk-tag">High</div>
                  <div className="risk-label">Scam / Phishing / Emotional Manipulation</div>
                  <h2>Risk Assessment</h2>
                  <p>Based on AI analysis of your submitted content, here&apos;s what we found.</p>

                  <div className="preview-label">Analyzed content preview</div>
                  <div className="preview-box">
                    <p>
                      &quot;Urgent: Your DBS bank account has been temporarily suspended due to suspicious activity.
                      To restore access, click this link immediately: http://dbs-secure-verify.xyz and enter your
                      banking credentials within 24 hours or your account will be permanently closed. Call 8001-XXXX if you need help.&quot;
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="signal-grid">
              {signals.slice(0, 2).map((signal) => (
                <div key={signal.label} className="signal-item">
                  <div className="signal-left">
                    <span className="signal-icon" aria-hidden="true">{signal.icon}</span>
                    <span>{signal.label}</span>
                  </div>
                  <span className="signal-value">{signal.value}</span>
                </div>
              ))}
            </section>

            <section className="signal-grid lower-grid">
              {signals.slice(2).map((signal) => (
                <div key={signal.label} className="signal-item">
                  <div className="signal-left">
                    <span className="signal-icon" aria-hidden="true">{signal.icon}</span>
                    <span>{signal.label}</span>
                  </div>
                  <span className="signal-value">{signal.value}</span>
                </div>
              ))}
            </section>

            <section className="flag-panel">
              <div className="flag-header">Detected Flags</div>
              <div className="flag-list">
                {flags.map((flag) => (
                  <span key={flag} className="flag-badge">
                    {flag}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )

      case 'History':
        return (
          <div className="page-shell">
            <div className="section-header-row">
              <div className="eyebrow">Recent assessments</div>
              <button type="button" className="primary-btn small-btn">New Analysis</button>
            </div>
            <h1 className="report-title">History</h1>

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
    <div className={`app-shell ${theme}`}>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand" aria-label="Phishing Hook home">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">Phishing Hook</span>
          </div>

          <nav className="nav" aria-label="Main navigation">
            <button
              id="toggle-mode"
              type="button"
              className="nav-btn mode-toggle"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            >
              <i className={theme === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon'} aria-hidden="true" />
            </button>

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
