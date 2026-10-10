const styles = `
  :root {
    --bg: #020b17;
    --bg-strong: #071321;
    --panel: rgba(13, 25, 38, 0.9);
    --panel-soft: rgba(18, 32, 47, 0.84);
    --line: rgba(136, 168, 193, 0.2);
    --text: #ebf1f7;
    --muted: #9bb1c5;
    --brand: #67d8ff;
    --brand-strong: #3aa8ff;
    --success: #7ae0b1;
    --warning: #ffcf5a;
    --danger: #ff7a7a;
    --shadow: rgba(0, 0, 0, 0.32);
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    min-height: 100%;
    background:
      radial-gradient(circle at top, rgba(67, 122, 177, 0.2), transparent 28%),
      linear-gradient(180deg, #010b18 0%, #071321 100%);
    color: var(--text);
    font-family: Inter, "Segoe UI", sans-serif;
  }

  body {
    min-height: 100vh;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  .shell {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px 48px;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(8px);
    background: rgba(3, 13, 21, 0.72);
    border-bottom: 1px solid var(--line);
  }

  .topbar-inner {
    max-width: 1200px;
    margin: 0 auto;
    height: 72px;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
  }

  .brand-mark {
    width: 22px;
    height: 22px;
    border-radius: 9px;
    background: linear-gradient(135deg, var(--brand), var(--brand-strong));
    position: relative;
    box-shadow: 0 0 18px rgba(103, 216, 255, 0.5);
  }

  .brand-mark::after {
    content: "";
    position: absolute;
    inset: 5px;
    border-radius: 50%;
    border: 2px solid rgba(3, 13, 21, 0.8);
    background: rgba(255, 255, 255, 0.12);
  }

  .nav {
    display: flex;
    align-items: center;
    gap: 18px;
    font-size: 0.96rem;
    color: var(--muted);
  }

  .nav a {
    padding: 10px 12px;
    border-radius: 10px;
    transition: 0.2s ease;
  }

  .nav a:hover,
  .nav a.active {
    color: var(--text);
    background: rgba(103, 216, 255, 0.08);
  }

  .page {
    padding: 32px 0 0;
  }

  .eyebrow {
    margin: 22px 0 10px;
    color: var(--brand);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.78rem;
    font-weight: 800;
  }

  .hero-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    margin-bottom: 24px;
  }

  .hero-row h1 {
    margin: 0;
    font-size: clamp(2.2rem, 4vw, 3.4rem);
    line-height: 1.1;
    letter-spacing: -0.05em;
    font-weight: 800;
  }

  .hero-panel {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 22px;
    margin-top: 28px;
    padding: 28px;
    background: linear-gradient(180deg, rgba(14, 28, 41, 0.96), rgba(9, 20, 31, 0.88));
    border: 1px solid var(--line);
    border-radius: 22px;
    box-shadow: 0 20px 45px rgba(2, 9, 17, 0.42);
  }

  .hero-copy {
    padding-top: 10px;
  }

  .hero-copy p {
    color: var(--muted);
    font-size: 1.08rem;
    line-height: 1.8;
    max-width: 650px;
    margin: 18px 0 24px;
  }

  .hero-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0.62rem 0.9rem;
    border-radius: 999px;
    border: 1px solid rgba(103, 216, 255, 0.2);
    background: rgba(103, 216, 255, 0.07);
    color: var(--text);
    font-size: 0.85rem;
    font-weight: 700;
  }

  .stat-pill strong {
    color: var(--brand);
  }

  .preview-card {
    padding: 18px;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: rgba(7, 18, 28, 0.72);
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
    color: var(--muted);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .mini-score {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 130px;
    height: 130px;
    margin: 0 auto 18px;
    border-radius: 50%;
    background: conic-gradient(var(--warning) 0 62%, rgba(255,255,255,0.08) 62% 100%);
    position: relative;
  }

  .mini-score::before {
    content: "";
    position: absolute;
    inset: 12px;
    border-radius: 50%;
    background: rgba(7, 18, 28, 0.9);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .mini-score span {
    position: relative;
    z-index: 1;
    color: var(--warning);
    font-size: 2.2rem;
    font-weight: 800;
  }

  .preview-grid {
    display: grid;
    gap: 10px;
  }

  .preview-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .preview-row strong {
    color: var(--text);
  }

  .bar {
    width: 100%;
    max-width: 120px;
    height: 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
  }

  .bar > span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--warning), #f9cf50);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 12px;
    padding: 0.85rem 1.2rem;
    border: 1px solid var(--line);
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease;
  }

  .button:hover {
    transform: translateY(-1px);
  }

  .button.primary {
    background: linear-gradient(135deg, var(--brand), var(--brand-strong));
    color: #031724;
    border-color: transparent;
  }

  .button.secondary {
    background: rgba(255, 255, 255, 0.02);
    color: var(--text);
  }

  .panel {
    background: linear-gradient(180deg, rgba(16, 28, 41, 0.95), rgba(12, 23, 35, 0.9));
    border: 1px solid var(--line);
    border-radius: 20px;
    box-shadow: 0 18px 40px var(--shadow);
  }

  .report-card {
    padding: 28px 28px 18px;
    margin-top: 8px;
  }

  .risk-layout {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 32px;
    align-items: center;
    min-height: 260px;
  }

  .score-ring-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .score-ring {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: conic-gradient(var(--warning) 0 70%, rgba(255,255,255,0.1) 70% 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .score-ring::before {
    content: "";
    position: absolute;
    inset: 12px;
    border-radius: 50%;
    background: rgba(10, 18, 28, 0.9);
    border: 1px solid rgba(255,255,255,0.06);
  }

  .score-ring strong {
    position: relative;
    z-index: 1;
    font-size: 2.5rem;
    letter-spacing: -0.05em;
    color: var(--warning);
  }

  .risk-meta {
    font-size: 0.76rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 14px;
  }

  .risk-card h2 {
    margin: 0 0 18px;
    font-size: clamp(1.7rem, 3vw, 2.5rem);
    letter-spacing: -0.04em;
  }

  .risk-card p {
    margin: 0;
    color: var(--muted);
    line-height: 1.7;
    font-size: 1.03rem;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px;
    padding: 0.35rem 0.6rem;
    border-radius: 999px;
    background: rgba(255, 122, 122, 0.08);
    border: 1px solid rgba(255, 122, 122, 0.3);
    color: #f7b5b5;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .signal-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin-top: 22px;
  }

  .signal-item {
    background: rgba(7, 18, 28, 0.4);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 18px 18px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .signal-left {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
    font-weight: 700;
  }

  .signal-badge {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 800;
    background: rgba(255,255,255,0.06);
  }

  .signal-item .value {
    color: var(--warning);
    font-weight: 800;
    font-size: 1.05rem;
  }

  .progress {
    width: min(100%, 570px);
    height: 10px;
    background: rgba(255,255,255,0.08);
    border-radius: 999px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.04);
  }

  .progress > span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--warning), #f3c85b);
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(220px, 1fr));
    gap: 18px;
    margin-top: 36px;
  }

  .feature {
    padding: 22px 20px;
    background: rgba(14, 26, 39, 0.82);
    border: 1px solid var(--line);
    border-radius: 18px;
  }

  .feature .icon {
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: rgba(103, 216, 255, 0.08);
    color: var(--brand);
    margin-bottom: 12px;
    font-size: 1.1rem;
  }

  .feature h3 {
    margin: 0 0 10px;
    font-size: 1.15rem;
  }

  .feature p {
    margin: 0;
    color: var(--muted);
    line-height: 1.7;
  }

  .section-card {
    margin-top: 28px;
    padding: 24px 24px 18px;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    margin-bottom: 18px;
  }

  .section-head h3 {
    margin: 0;
    font-size: 1.4rem;
    letter-spacing: -0.03em;
  }

  .list {
    display: grid;
    gap: 12px;
  }

  .list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 16px 18px;
    border-radius: 12px;
    border: 1px solid var(--line);
    background: rgba(7, 14, 22, 0.35);
  }

  .list-item strong {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1rem;
  }

  .list-item .state {
    font-size: 0.78rem;
    color: var(--muted);
    border-radius: 999px;
    padding: 0.3rem 0.6rem;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.02);
  }

  .flag-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 18px;
  }

  .flag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0.7rem 1rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 122, 122, 0.25);
    background: rgba(255, 122, 122, 0.06);
    color: #f7b5b5;
    font-weight: 700;
  }

  .guide-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(260px, 1fr));
    gap: 18px;
    margin-top: 18px;
  }

  .guide-card {
    padding: 22px 20px;
    background: rgba(12, 22, 32, 0.72);
    border: 1px solid var(--line);
    border-radius: 16px;
  }

  .guide-card h4 {
    margin: 0 0 10px;
    font-size: 1.08rem;
  }

  .guide-card ul {
    margin: 0;
    padding-left: 1.2rem;
    color: var(--muted);
    line-height: 1.8;
  }

  @media (max-width: 820px) {
    .hero-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .risk-layout,
    .signal-list,
    .feature-grid,
    .guide-grid {
      grid-template-columns: 1fr;
    }

    .nav {
      gap: 6px;
      font-size: 0.8rem;
      overflow-x: auto;
      padding-bottom: 4px;
    }
  }
`;

function renderLayout({ title, active, content }) {
  const navItems = [
    { href: "/", label: "Home" },
    { href: "/analyze", label: "Analyze" },
    { href: "/history", label: "History" },
    { href: "/safety-guide", label: "Safety Guide" },
  ];

  const navHtml = navItems
    .map(
      (item) => `
        <a href="${item.href}" class="${active === item.href ? "active" : ""}">${item.label}</a>
      `,
    )
    .join("");

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style>${styles}</style>
      </head>
      <body>
        <header class="topbar">
          <div class="topbar-inner">
            <div class="brand">
              <span class="brand-mark"></span>
              <span>Truth Lens</span>
            </div>
            <nav class="nav" aria-label="Main navigation">
              ${navHtml}
            </nav>
          </div>
        </header>
        <main class="shell">
          ${content}
        </main>
      </body>
    </html>`;
}

function renderHome() {
  return renderLayout({
    title: "Truth Lens | Home",
    active: "/",
    content: `
      <section class="page">
        <div class="hero-row">
          <div>
            <div class="eyebrow">Threat intelligence</div>
            <h1>Know when a message is trying to manipulate you.</h1>
          </div>
          <div class="actions">
            <a class="button secondary" href="/analyze">Analyze Message</a>
            <a class="button primary" href="/safety-guide">Safety Guide</a>
          </div>
        </div>

        <div class="hero-panel">
          <div class="hero-copy">
            <p>
              Truth Lens helps people evaluate suspicious emails, texts, and social prompts by surfacing urgency,
              impersonation patterns, and coercive language before trust is lost.
            </p>
            <div class="hero-stats">
              <span class="stat-pill"><strong>4x</strong> faster review</span>
              <span class="stat-pill"><strong>24/7</strong> risk awareness</span>
              <span class="stat-pill"><strong>AI</strong> guided checks</span>
            </div>
          </div>

          <div class="preview-card">
            <div class="preview-header">
              <span>Current signal</span>
              <span>High</span>
            </div>
            <div class="mini-score"><span>62</span></div>
            <div class="preview-grid">
              <div class="preview-row">
                <strong>Urgency</strong>
                <div class="bar"><span style="width: 82%"></span></div>
              </div>
              <div class="preview-row">
                <strong>Impersonation</strong>
                <div class="bar"><span style="width: 75%"></span></div>
              </div>
              <div class="preview-row">
                <strong>Manipulation</strong>
                <div class="bar"><span style="width: 88%"></span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="feature-grid">
          <article class="feature">
            <div class="icon">⚡</div>
            <h3>Fast scanning</h3>
            <p>Review messages for urgency, impersonation, and coercive patterns before acting.</p>
          </article>
          <article class="feature">
            <div class="icon">🧠</div>
            <h3>AI-informed logic</h3>
            <p>Signal-based assessment highlights suspicious patterns and manipulative language.</p>
          </article>
          <article class="feature">
            <div class="icon">🛡️</div>
            <h3>Safer decisions</h3>
            <p>Clarify what is risky, what requires verification, and what should be treated as a cue to pause.</p>
          </article>
        </div>

        <div class="section-card panel">
          <div class="section-head">
            <h3>How it works</h3>
          </div>
          <div class="guide-grid">
            <div class="guide-card">
              <h4>1. Submit content</h4>
              <ul>
                <li>Paste a message, email, or link.</li>
                <li>Flag urgency, pressure, and unusual requests.</li>
              </ul>
            </div>
            <div class="guide-card">
              <h4>2. Review risk profile</h4>
              <ul>
                <li>Assess manipulative wording and scam cues.</li>
                <li>Cross-reference suspicious call-to-action phrases.</li>
              </ul>
            </div>
            <div class="guide-card">
              <h4>3. Take action</h4>
              <ul>
                <li>Verify the sender through trusted channels.</li>
                <li>Ignore or report unsafe communication.</li>
              </ul>
            </div>
            <div class="guide-card">
              <h4>4. Build confidence</h4>
              <ul>
                <li>Track prior assessments over time.</li>
                <li>Strengthen user awareness with education.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    `,
  });
}

function renderAnalyze() {
  return renderLayout({
    title: "Truth Lens | Analyze",
    active: "/analyze",
    content: `
      <section class="page">
        <div class="eyebrow">Analysis complete</div>
        <div class="hero-row">
          <h1>Safety Report</h1>
          <div class="actions">
            <button class="button secondary" type="button">Share</button>
            <button class="button primary" type="button">Analyze Again</button>
          </div>
        </div>

        <div class="panel report-card">
          <div class="risk-layout">
            <div class="score-ring-wrap">
              <div class="score-ring"><strong>48</strong></div>
            </div>

            <div class="risk-card">
              <div class="pill">High</div>
              <div class="risk-meta">Scam / Phishing / Emotional Manipulation</div>
              <h2>Risk Assessment</h2>
              <p>Based on AI analysis of your submitted content, here's what we found.</p>
              <div class="section-head" style="margin-top: 22px; margin-bottom: 10px;">
                <h3 style="font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);">Analyzed content preview</h3>
              </div>
              <p style="padding: 18px 18px 0; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--line); margin-top: 12px;">
                "Urgent: Your DBS bank account has been temporarily suspended due to suspicious activity. To restore access, click this link immediately: http://dbs-secure-verify.xyz and enter your banking credentials within 24 hours or your account will be permanently closed. Call 8001-XXXX if you need help. - DBS ..."
              </p>
            </div>
          </div>
        </div>

        <div class="signal-list">
          <div class="signal-item">
            <div class="signal-left">
              <span class="signal-badge">⚠</span>
              <span>Fake News</span>
            </div>
            <span class="value">8</span>
          </div>
          <div class="signal-item">
            <div class="signal-left">
              <span class="signal-badge">🚨</span>
              <span>Scam Risk</span>
            </div>
            <span class="value">57</span>
          </div>
        </div>

        <div class="section-card panel">
          <div class="section-head">
            <h3>Detected Flags</h3>
          </div>
          <div class="flag-grid">
            <span class="flag">⚡ Urgent language detected</span>
            <span class="flag">🕵️ Suspicious link or click request</span>
            <span class="flag">📧 Possible phishing attempt</span>
            <span class="flag">🎭 Emotional manipulation</span>
          </div>
        </div>
      </section>
    `,
  });
}

function renderHistory() {
  return renderLayout({
    title: "Truth Lens | History",
    active: "/history",
    content: `
      <section class="page">
        <div class="eyebrow">Recent assessments</div>
        <div class="hero-row">
          <h1>History</h1>
          <div class="actions">
            <a class="button secondary" href="/analyze">New Analysis</a>
          </div>
        </div>

        <div class="section-card panel">
          <div class="list">
            <div class="list-item">
              <strong>📧 Bank impersonation attempt</strong>
              <span class="state">High risk · 2 hours ago</span>
            </div>
            <div class="list-item">
              <strong>📲 Fake customer support message</strong>
              <span class="state">Moderate risk · yesterday</span>
            </div>
            <div class="list-item">
              <strong>🧾 Invoice payment scam</strong>
              <span class="state">High risk · 3 days ago</span>
            </div>
            <div class="list-item">
              <strong>💬 Social engineering alert</strong>
              <span class="state">Low risk · 1 week ago</span>
            </div>
          </div>
        </div>
      </section>
    `,
  });
}

function renderSafetyGuide() {
  return renderLayout({
    title: "Truth Lens | Safety Guide",
    active: "/safety-guide",
    content: `
      <section class="page">
        <div class="eyebrow">Stay alert</div>
        <div class="hero-row">
          <h1>Safety Guide</h1>
          <div class="actions">
            <a class="button primary" href="/analyze">Run Check</a>
          </div>
        </div>

        <div class="guide-grid">
          <article class="guide-card">
            <h4>Urgency triggers</h4>
            <ul>
              <li>Threats of account closure or legal action.</li>
              <li>Requests to act within minutes or hours.</li>
              <li>Pressure to click a link before verifying source.</li>
            </ul>
          </article>

          <article class="guide-card">
            <h4>Verification habits</h4>
            <ul>
              <li>Use official apps or contact numbers from trusted sources.</li>
              <li>Check sender identity before sharing personal information.</li>
              <li>Pause before responding to emotional or fear-based messaging.</li>
            </ul>
          </article>

          <article class="guide-card">
            <h4>Link inspection</h4>
            <ul>
              <li>Hover before clicking if available.</li>
              <li>Look for misspellings, lookalike domains, or weird redirects.</li>
              <li>Review whether a request is expected or unusual.</li>
            </ul>
          </article>

          <article class="guide-card">
            <h4>When to escalate</h4>
            <ul>
              <li>Any request for passwords, OTPs, or payment details.</li>
              <li>Messages that impersonate institutions or family members.</li>
              <li>Repeated targeting or unusual account activity.</li>
            </ul>
          </article>
        </div>
      </section>
    `,
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname.toLowerCase();

    if (pathname === "/analyze") {
      return new Response(renderAnalyze(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (pathname === "/history") {
      return new Response(renderHistory(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (pathname === "/safety-guide" || pathname === "/safetyguide") {
      return new Response(renderSafetyGuide(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response(renderHome(), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
};
