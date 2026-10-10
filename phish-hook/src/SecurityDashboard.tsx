
import { useEffect, useState } from 'react'
import './SecurityDashboard.css'

type Threat = {
  name: string
  count: number
  color: string
  icon: string
}

const threats: Threat[] = [
  { name: 'Suspicious Links', count: 2, color: '#ff5975', icon: '🔗' },
  { name: 'Impersonation', count: 1, color: '#5b9dff', icon: '🛡️' },
  { name: 'Urgency Tactics', count: 3, color: '#ffb454', icon: '⚠️' },
]

const chartValues = [25, 30, 27, 38, 34, 46, 42, 57, 49, 63, 55, 72, 64, 78, 70, 85, 76, 90, 82, 94]

export default function SecurityDashboard() {
  const [progress, setProgress] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (!scanning) return

    const timer = window.setInterval(() => {
      setProgress((previous) => {
        if (previous >= 100) {
          window.clearInterval(timer)
          return 100
        }
        return Math.min(previous + 2, 100)
      })
    }, 60)

    return () => window.clearInterval(timer)
  }, [scanning])

  useEffect(() => {
    if (progress === 100 && scanning) {
      setScanning(false)
      setCompleted(true)
    }
  }, [progress, scanning])

  function startScan() {
    setProgress(0)
    setCompleted(false)
    setScanning(true)
  }

  const circle = 2 * Math.PI * 54

  return (
    <main className="security-dashboard">
      <div className="sd-heading">
        <div>
          <div className="sd-eyebrow">PHISHHOOK / SECURITY CENTER</div>
          <h1>Security Dashboard</h1>
          <p>Interactive phishing threat visualization</p>
        </div>
        <span className="sd-demo-badge">● DEMO MODE</span>
      </div>

      <div className="sd-main-grid">
        <section className="sd-card">
          <h2>Safety Score</h2>
          <div className="sd-gauge sd-green">
            <svg viewBox="0 0 140 140" aria-hidden="true">
              <circle className="sd-track" cx="70" cy="70" r="54" />
              <circle
                className="sd-progress-circle"
                cx="70"
                cy="70"
                r="54"
                strokeDasharray={circle}
                strokeDashoffset={circle * 0.08}
              />
            </svg>
            <div className="sd-gauge-label">
              <strong>92</strong>
              <span>LOWER RISK</span>
            </div>
          </div>
          <p className="sd-note">Illustrative score for a sample message.</p>
        </section>

        <section className="sd-card">
          <h2>Scan Progress</h2>
          <div className="sd-gauge sd-blue">
            <svg viewBox="0 0 140 140" aria-hidden="true">
              <circle className="sd-track" cx="70" cy="70" r="54" />
              <circle
                className="sd-progress-circle"
                cx="70"
                cy="70"
                r="54"
                strokeDasharray={circle}
                strokeDashoffset={circle * (1 - progress / 100)}
              />
            </svg>
            <div className="sd-gauge-label">
              <strong>{progress}%</strong>
              <span>
                {scanning ? 'SCANNING...' : completed ? 'COMPLETE' : 'READY'}
              </span>
            </div>
          </div>
          <button
            className="sd-scan-button"
            onClick={startScan}
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : '▶ Start Demo Scan'}
          </button>
        </section>

        <section className="sd-card">
          <h2>Detected Indicators</h2>
          <div className="sd-threat-list">
            {threats.map((threat) => (
              <div className="sd-threat-row" key={threat.name}>
                <span className="sd-threat-name">
                  <span>{threat.icon}</span> {threat.name}
                </span>
                <strong style={{ color: threat.color }}>
                  {threat.count}
                </strong>
              </div>
            ))}
          </div>
          <p className="sd-note">Example indicators, not live detections.</p>
        </section>
      </div>

      <div className="sd-bottom-grid">
        <section className="sd-card">
          <h2>Threat Indicators</h2>
          <div className="sd-stats">
            <div>
              <span>Suspicious URLs</span>
              <strong>02</strong>
            </div>
            <div>
              <span>Social Engineering</span>
              <strong>03</strong>
            </div>
            <div>
              <span>Identity Spoofing</span>
              <strong>01</strong>
            </div>
          </div>
          <div className="sd-bars">
            {[45, 72, 38, 85, 60, 93, 52, 78, 42, 67, 88, 57].map(
              (height, index) => (
                <div
                  key={index}
                  style={{ height: `${height}%` }}
                />
              )
            )}
          </div>
        </section>

        <section className="sd-card">
          <h2>Threat Overview</h2>
          <p className="sd-note">Sample visualization — not historical data</p>
          <div className="sd-chart">
            <svg
              viewBox="0 0 400 160"
              preserveAspectRatio="none"
              role="img"
              aria-label="Illustrative phishing threat trend"
            >
              <defs>
                <linearGradient id="sd-chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b64dff" stopOpacity=".35" />
                  <stop offset="100%" stopColor="#b64dff" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[30, 65, 100, 135].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="400"
                  y1={y}
                  y2={y}
                  stroke="#26385a"
                  strokeDasharray="4 5"
                />
              ))}
              <polygon
                points={
                  `0,160 ` +
                  chartValues
                    .map((value, index) =>
                      `${(index / (chartValues.length - 1)) * 400},${155 - value * 1.35}`
                    )
                    .join(' ') +
                  ` 400,160`
                }
                fill="url(#sd-chart-fill)"
              />
              <polyline
                points={chartValues
                  .map((value, index) =>
                    `${(index / (chartValues.length - 1)) * 400},${155 - value * 1.35}`
                  )
                  .join(' ')}
                fill="none"
                stroke="#c665ff"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </section>
      </div>

      <p className="sd-disclaimer">
        Demo dashboard: values are illustrative and do not represent a real
        security scan. PhishHook cannot guarantee that a message is safe.
      </p>
    </main>
  )
}
