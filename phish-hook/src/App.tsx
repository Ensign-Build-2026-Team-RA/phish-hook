import './App.css'

const navItems = ['Home', 'Analyze', 'History', 'Safety Guide']

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

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand" aria-label="Truth Lens home">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">Truth Lens</span>
          </div>

          <nav className="nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <a
                key={item}
                href="#"
                className={item === 'Home' ? 'active' : ''}
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="page-shell">
        <section className="headline-row">
          <div className="eyebrow">ANALYSIS COMPLETE</div>
          <div className="headline-actions">
            <button type="button" className="secondary-btn">
              Share
            </button>
            <button type="button" className="primary-btn">
              Analyze Again
            </button>
          </div>
        </section>

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
              <div className="risk-label">
                Scam / Phishing / Emotional Manipulation
              </div>

              <h2>Risk Assessment</h2>
              <p>
                Based on AI analysis of your submitted content, here&apos;s what we found.
              </p>

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
      </main>
    </div>
  )
}

export default App
