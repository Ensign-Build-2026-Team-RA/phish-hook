import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { Presentation, PresentationFile } from '@oai/artifact-tool'

const WORKSPACE = 'C:\\Development\\ensign-build-2026'
const BUILD_DIR = path.join(WORKSPACE, '.codex-ppt-build')
const RENDER_DIR = path.join(BUILD_DIR, 'rendered')
const OUTPUT_DIR = path.join(WORKSPACE, 'docs', 'presentations')
const FINAL_PPTX = path.join(OUTPUT_DIR, 'Phishing-Hook-Competition-Deck.pptx')
const SKILL_DIR = 'C:\\Users\\aaron\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.1007.11041\\skills\\presentations'
const RUNTIME_PYTHON = 'C:\\Users\\aaron\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe'
const ASSETS = path.join(WORKSPACE, 'docs', 'presentation-assets')
process.env.RUNTIME_NODE_MODULES = 'C:\\Users\\aaron\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules'

const W = 1280
const H = 720
const FONT = 'Arial'
const C = {
  deep: '#071C30',
  navy: '#0A2039',
  navy2: '#10283D',
  teal: '#087A80',
  aqua: '#55CED3',
  aquaLight: '#9BE6E7',
  gold: '#F4B640',
  warm: '#F8F5ED',
  muted: '#B9D3DA',
  danger: '#FF8B78',
}

async function bytes(file) {
  const buffer = await fs.readFile(file)
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

async function addImage(slide, file, position, options = {}) {
  const ext = path.extname(file).toLowerCase()
  const contentType = ext === '.svg' ? 'image/svg+xml' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'
  return slide.images.add({
    blob: await bytes(file),
    contentType,
    alt: options.alt ?? '',
    fit: options.fit ?? 'contain',
    position,
    geometry: options.geometry,
    borderRadius: options.borderRadius,
  })
}

function addShape(slide, geometry, position, fill, lineFill = 'none', lineWidth = 0) {
  return slide.shapes.add({
    geometry,
    position,
    fill,
    line: { style: 'solid', fill: lineFill, width: lineWidth },
  })
}

function addText(slide, value, position, fontSize, color = C.warm, bold = false, options = {}) {
  const shape = addShape(slide, 'textbox', position, 'none')
  shape.text = value
  shape.text.style = {
    typeface: FONT,
    fontFamily: FONT,
    fontSize,
    color,
    bold,
    italic: options.italic ?? false,
  }
  return shape
}

async function addBackground(slide, file) {
  await addImage(slide, file, { left: 0, top: 0, width: W, height: H }, { fit: 'cover', alt: 'Phishing Hook navy and teal background' })
}

function addSlideTitle(slide, title, number) {
  addText(slide, title, { left: 72, top: 48, width: 1000, height: 58 }, 34, C.warm, true)
  addShape(slide, 'rect', { left: 72, top: 112, width: 110, height: 5 }, C.aqua)
  addText(slide, String(number).padStart(2, '0'), { left: 1165, top: 54, width: 55, height: 30 }, 15, C.aquaLight, true)
}

function addNotes(slide, lines) {
  slide.speakerNotes.text = lines.join('\n')
}

async function main() {
  await fs.mkdir(RENDER_DIR, { recursive: true })
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const cleanBg = path.join(ASSETS, 'backgrounds', 'clean-cyber-background-16x9.png')
  const titleBg = path.join(ASSETS, 'backgrounds', 'phil-title-background-16x9.png')
  const homeShot = path.join(ASSETS, 'screenshots', 'phishing-hook-live.png')
  const analyzerShot = path.join(ASSETS, 'screenshots', 'phishing-hook-analyzer-live.png')
  const flowGraphic = path.join(ASSETS, 'diagrams', 'email-analysis-flow.svg')
  const teamLogo = path.join(ASSETS, 'logos', 'team-ra-logo.png')

  const deck = Presentation.create({ slideSize: { width: W, height: H } })
  deck.theme.defaultFont = FONT

  // 1. Cover
  {
    const slide = deck.slides.add()
    await addBackground(slide, titleBg)
    addShape(slide, 'roundRect', { left: 62, top: 122, width: 565, height: 386 }, C.deep, C.aqua, 2)
    addText(slide, 'PHISHING HOOK', { left: 96, top: 158, width: 480, height: 34 }, 18, C.aqua, true)
    addText(slide, 'Don’t Bite\nthe Hook!', { left: 92, top: 206, width: 500, height: 168 }, 58, C.warm, true)
    addText(slide, 'AI-powered phishing awareness for everyday users', { left: 96, top: 388, width: 450, height: 66 }, 23, C.aquaLight, false)
    addText(slide, 'Ensign Build 2026 · Team RA', { left: 96, top: 466, width: 400, height: 30 }, 16, C.muted, true)
    addText(slide, 'phishhook.lol', { left: 96, top: 635, width: 230, height: 28 }, 15, C.warm, true)
    addNotes(slide, [
      'Opening: Phishing Hook helps people recognize manipulation before they act on a suspicious message.',
      'Phil the Phish is the antagonist who represents the phisher setting the bait.',
      'Sources:',
      '- https://phishhook.lol/',
      '- Repository README.md',
    ])
  }

  // 2. Problem
  {
    const slide = deck.slides.add()
    await addBackground(slide, cleanBg)
    addSlideTitle(slide, 'The phishing problem', 2)
    addText(slide, 'Fraudulent messages create pressure before people have time to verify the request.', { left: 72, top: 142, width: 1080, height: 82 }, 31, C.warm, true)

    const items = [
      ['URGENCY', '“Act now”', 'A deadline pushes the recipient toward a fast decision.'],
      ['FEAR', '“Your account will close”', 'A threat makes normal verification feel too slow.'],
      ['IMPERSONATION', '“This is support”', 'A familiar identity makes an unusual request feel legitimate.'],
    ]
    const xs = [72, 446, 820]
    for (let i = 0; i < items.length; i++) {
      addShape(slide, 'roundRect', { left: xs[i], top: 260, width: 328, height: 270 }, C.navy2, i === 1 ? C.gold : C.aqua, 2)
      addText(slide, items[i][0], { left: xs[i] + 26, top: 288, width: 270, height: 30 }, 14, i === 1 ? C.gold : C.aqua, true)
      addText(slide, items[i][1], { left: xs[i] + 26, top: 336, width: 270, height: 66 }, 26, C.warm, true)
      addText(slide, items[i][2], { left: xs[i] + 26, top: 420, width: 270, height: 80 }, 17, C.muted, false)
    }
    addText(slide, 'Phishing Hook makes these tactics visible and explains the safer next step.', { left: 72, top: 575, width: 1060, height: 44 }, 25, C.aquaLight, true)
    addNotes(slide, [
      'Use a short example for each tactic. Emphasize that phishing often combines pressure with a trusted identity.',
      'Sources:',
      '- Repository README.md, Project summary and Capabilities',
    ])
  }

  // 3. Product overview
  {
    const slide = deck.slides.add()
    await addBackground(slide, cleanBg)
    addSlideTitle(slide, 'The Phishing Hook experience', 3)
    addShape(slide, 'roundRect', { left: 58, top: 144, width: 790, height: 480 }, C.deep, C.aqua, 2)
    await addImage(slide, homeShot, { left: 72, top: 158, width: 762, height: 452 }, { fit: 'contain', alt: 'Live Phishing Hook homepage' })
    addText(slide, 'One site, four ways to learn', { left: 884, top: 162, width: 300, height: 66 }, 27, C.warm, true)
    const actions = [
      ['ANALYZE', 'Paste a suspicious message and review the risk.'],
      ['TRAIN', 'Learn common manipulation tactics.'],
      ['REVISIT', 'Replay browser-local scan history.'],
      ['TRACK', 'Review successful scans in the dashboard.'],
    ]
    let y = 254
    for (const [label, copy] of actions) {
      addText(slide, label, { left: 884, top: y, width: 112, height: 25 }, 13, C.aqua, true)
      addText(slide, copy, { left: 884, top: y + 29, width: 310, height: 50 }, 17, C.muted, false)
      y += 88
    }
    addNotes(slide, [
      'This screenshot comes from the deployed website.',
      'The product combines direct analysis with training, history, and a browser-local dashboard.',
      'Sources:',
      '- https://phishhook.lol/',
      '- Repository README.md, Training and browser-local tools',
    ])
  }

  // 4. Email workflow
  {
    const slide = deck.slides.add()
    await addBackground(slide, cleanBg)
    addSlideTitle(slide, 'Email-to-analysis workflow', 4)
    addShape(slide, 'roundRect', { left: 54, top: 142, width: 1172, height: 440 }, C.deep, C.aqua, 2)
    await addImage(slide, flowGraphic, { left: 66, top: 156, width: 1148, height: 395 }, { fit: 'contain', alt: 'Email routing and analysis workflow' })
    addText(slide, 'AI runs only after the user opens the analyzer and chooses to start the full assessment.', { left: 92, top: 606, width: 1080, height: 44 }, 21, C.aquaLight, true)
    addNotes(slide, [
      'Flow: forward email, receive a quick local rating, open the expiring token link, review the message, then start Workers AI.',
      'The inbound email handler supports plain text and HTML-only email. Attachments and oversized messages receive the normal analysis link.',
      'Sources:',
      '- Repository README.md, Receive and reply to inbound email',
      '- Repository docs/inbound-email.md',
    ])
  }

  // 5. Analyzer
  {
    const slide = deck.slides.add()
    await addBackground(slide, cleanBg)
    addSlideTitle(slide, 'Analysis begins with user review', 5)
    addShape(slide, 'roundRect', { left: 54, top: 142, width: 808, height: 480 }, C.deep, C.aqua, 2)
    await addImage(slide, analyzerShot, { left: 68, top: 156, width: 780, height: 452 }, { fit: 'contain', alt: 'Live Phishing Hook analyzer with a suspicious message prefilled' })
    addText(slide, 'The user stays in control', { left: 900, top: 162, width: 300, height: 64 }, 27, C.warm, true)
    const points = [
      'Review the imported message first.',
      'Start AI analysis manually.',
      'Treat the score as a risk indicator.',
      'Avoid passwords and verification codes.',
    ]
    let y = 262
    for (let i = 0; i < points.length; i++) {
      addText(slide, String(i + 1).padStart(2, '0'), { left: 900, top: y, width: 40, height: 30 }, 15, C.gold, true)
      addText(slide, points[i], { left: 952, top: y - 2, width: 250, height: 54 }, 18, C.muted, i === 1)
      y += 76
    }
    addNotes(slide, [
      'This screenshot uses the live deployed analyzer with a prefilled suspicious message.',
      'The flow does not automatically submit imported email content to AI.',
      'Sources:',
      '- https://phishhook.lol/#analyze',
      '- Repository README.md, Analyse suspicious messages and Privacy and safety behavior',
    ])
  }

  // 6. AI output
  {
    const slide = deck.slides.add()
    await addBackground(slide, cleanBg)
    addSlideTitle(slide, 'What the analyzer returns', 6)
    addShape(slide, 'ellipse', { left: 82, top: 188, width: 250, height: 250 }, C.navy2, C.gold, 7)
    addText(slide, '0–100', { left: 128, top: 260, width: 180, height: 70 }, 48, C.gold, true)
    addText(slide, 'risk indicator', { left: 142, top: 332, width: 160, height: 30 }, 16, C.warm, true)
    addText(slide, 'Low · Moderate · High', { left: 98, top: 464, width: 250, height: 34 }, 18, C.aquaLight, true)

    const results = [
      ['SUMMARY', 'A concise explanation of the message’s overall risk.'],
      ['WARNING FLAGS', 'Specific tactics such as urgency, impersonation, or credential requests.'],
      ['WHY IT MATTERS', 'Plain-language reasoning that helps a nontechnical user understand the concern.'],
      ['NEXT STEP', 'A practical action such as verifying through an official app or website.'],
    ]
    let y = 176
    for (let i = 0; i < results.length; i++) {
      addShape(slide, 'roundRect', { left: 410, top: y, width: 760, height: 90 }, C.navy2, i === 3 ? C.gold : C.aqua, 1)
      addText(slide, results[i][0], { left: 438, top: y + 18, width: 180, height: 24 }, 13, i === 3 ? C.gold : C.aqua, true)
      addText(slide, results[i][1], { left: 610, top: y + 15, width: 520, height: 58 }, 17, C.muted, false)
      y += 108
    }
    addText(slide, 'The model treats submitted content as untrusted evidence and receives instructions not to follow links or commands inside it.', { left: 82, top: 598, width: 1080, height: 50 }, 19, C.aquaLight, true)
    addNotes(slide, [
      'The AI output includes a score, level, summary, flags, explanation, and advice.',
      'The score supports human judgment. It does not guarantee that a message is safe or malicious.',
      'Sources:',
      '- Repository README.md, Analyse suspicious messages',
      '- Repository src/index.js',
    ])
  }

  // 7. Architecture
  {
    const slide = deck.slides.add()
    await addBackground(slide, cleanBg)
    addSlideTitle(slide, 'Technology and architecture', 7)
    const layers = [
      ['EXPERIENCE', 'React 19 · TypeScript 6 · Vite 8', C.aqua],
      ['EDGE APPLICATION', 'Cloudflare Worker · Static Assets · SPA routing', C.aquaLight],
      ['INTELLIGENCE', 'Workers AI · Gemma 4 · normalized risk assessment', C.gold],
      ['EMAIL AND STATE', 'Email Routing · Email Workers · KV · MIME parsing', '#7AD9A5'],
    ]
    let y = 154
    for (let i = 0; i < layers.length; i++) {
      addShape(slide, 'roundRect', { left: 115, top: y, width: 1050, height: 90 }, C.navy2, layers[i][2], 2)
      addText(slide, layers[i][0], { left: 148, top: y + 21, width: 220, height: 34 }, 14, layers[i][2], true)
      addText(slide, layers[i][1], { left: 390, top: y + 17, width: 720, height: 46 }, 22, C.warm, true)
      y += 108
    }
    addText(slide, 'Wrangler manages local development and deployment. Vitest, ESLint, Oxlint, TypeScript, GitHub Actions, and CodeQL protect quality.', { left: 116, top: 603, width: 1030, height: 48 }, 18, C.muted, false)
    addNotes(slide, [
      'Explain the architecture from the user interface down to email and temporary state.',
      'Workers AI model configured in the repository: @cf/google/gemma-4-26b-a4b-it.',
      'Sources:',
      '- Repository README.md, Technology and Architecture',
      '- Repository wrangler.jsonc',
    ])
  }

  // 8. Privacy
  {
    const slide = deck.slides.add()
    await addBackground(slide, cleanBg)
    addSlideTitle(slide, 'Privacy and safety controls', 8)
    addShape(slide, 'roundRect', { left: 70, top: 156, width: 530, height: 430 }, C.navy2, C.aqua, 2)
    addText(slide, 'EMAIL FLOW', { left: 102, top: 188, width: 200, height: 28 }, 14, C.aqua, true)
    addText(slide, 'Temporary storage with clear limits', { left: 102, top: 230, width: 440, height: 64 }, 27, C.warm, true)
    addText(slide, '• Parsed body and expiry time only\n• 128-bit random bearer token\n• Hashed KV storage key\n• 24-hour default expiry\n• No raw MIME or attachments', { left: 102, top: 320, width: 440, height: 215 }, 19, C.muted, false)

    addShape(slide, 'roundRect', { left: 644, top: 156, width: 530, height: 430 }, C.navy2, C.gold, 2)
    addText(slide, 'ANALYZER', { left: 676, top: 188, width: 200, height: 28 }, 14, C.gold, true)
    addText(slide, 'Human review before AI submission', { left: 676, top: 230, width: 440, height: 64 }, 27, C.warm, true)
    addText(slide, '• No automatic AI call from email\n• Imported text stays out of saved drafts\n• No-store retrieval request and response\n• Private email session history excluded\n• Risk indicator carries a clear limitation', { left: 676, top: 320, width: 440, height: 215 }, 19, C.muted, false)
    addText(slide, 'The architecture targets Cloudflare’s available free allowances. Account-wide quotas still apply.', { left: 92, top: 620, width: 1060, height: 38 }, 18, C.aquaLight, true)
    addNotes(slide, [
      'Privacy is part of the product design, especially for inbound email.',
      'Tokens are bearer credentials, so anyone with the link can read the stored body until expiry.',
      'Sources:',
      '- Repository README.md, Privacy and safety behavior and Cost model',
      '- Repository docs/inbound-email.md',
    ])
  }

  // 9. Team
  {
    const slide = deck.slides.add()
    await addBackground(slide, cleanBg)
    addSlideTitle(slide, 'Ensign Build 2026 Team RA', 9)
    addShape(slide, 'roundRect', { left: 80, top: 150, width: 430, height: 430 }, C.deep, C.gold, 2)
    await addImage(slide, teamLogo, { left: 112, top: 178, width: 366, height: 366 }, { fit: 'contain', alt: 'Ensign Build 2026 Team RA logo' })
    addText(slide, 'Phishing Hook team', { left: 590, top: 170, width: 500, height: 56 }, 30, C.warm, true)
    const names = [
      'Aaron Smith',
      'Ammon Shelley',
      'Andre Martinez Vasquez',
      'Anil Bolukbasioglu',
      'Arthur Santos Rodrigues',
      'Reyna Rodriguez Ruiz',
    ]
    let y = 256
    for (let i = 0; i < names.length; i++) {
      addText(slide, String(i + 1).padStart(2, '0'), { left: 592, top: y, width: 40, height: 26 }, 14, i < 3 ? C.aqua : C.gold, true)
      addText(slide, names[i], { left: 650, top: y - 3, width: 430, height: 34 }, 22, C.warm, true)
      y += 58
    }
    addText(slide, 'AI integration · cybersecurity education · user-centered design', { left: 590, top: 617, width: 560, height: 36 }, 18, C.aquaLight, true)
    addNotes(slide, [
      'Introduce each team member according to the competition format.',
      'Source: Repository README.md, Team RA',
    ])
  }

  // 10. Closing
  {
    const slide = deck.slides.add()
    await addBackground(slide, titleBg)
    addShape(slide, 'roundRect', { left: 70, top: 154, width: 560, height: 370 }, C.deep, C.aqua, 2)
    addText(slide, 'Don’t Bite\nthe Hook!', { left: 104, top: 198, width: 480, height: 152 }, 56, C.warm, true)
    addText(slide, 'Pause. Verify through a trusted channel. Decide with better information.', { left: 108, top: 374, width: 450, height: 72 }, 23, C.aquaLight, false)
    addText(slide, 'phishhook.lol', { left: 108, top: 472, width: 260, height: 34 }, 20, C.gold, true)
    addText(slide, 'Questions', { left: 104, top: 602, width: 240, height: 48 }, 28, C.warm, true)
    addNotes(slide, [
      'Close with the live site and invite questions or a product demonstration.',
      'Source: https://phishhook.lol/',
    ])
  }

  for (const [index, slide] of deck.slides.items.entries()) {
    const name = `slide-${String(index + 1).padStart(2, '0')}.png`
    const png = await deck.export({ slide, format: 'png', scale: 1 })
    await fs.writeFile(path.join(RENDER_DIR, name), new Uint8Array(await png.arrayBuffer()))
  }

  const montage = await deck.export({ format: 'webp', montage: true })
  await fs.writeFile(path.join(BUILD_DIR, 'montage.webp'), new Uint8Array(await montage.arrayBuffer()))

  const draftPath = path.join(BUILD_DIR, 'draft.pptx')
  await (await PresentationFile.exportPptx(deck)).save(draftPath)

  const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools', 'artifact_tool_utils.mjs')).href)
  const stagingDir = path.join(BUILD_DIR, '.codex-finalizer')
  await fs.mkdir(stagingDir, { recursive: true })
  const candidatePath = path.join(stagingDir, 'candidate.pptx')
  await fs.copyFile(draftPath, candidatePath)

  await finalizePresentation({
    explicitTotalSlideCount: 10,
    requiredNativeTableOwnerSlides: [],
    requiredNativeChartOwnerSlides: [],
    workspaceDir: WORKSPACE,
    candidatePath,
    finalPath: FINAL_PPTX,
    pythonExecutable: RUNTIME_PYTHON,
    integrityValidatorPath: path.join(SKILL_DIR, 'container_tools', 'inspect_presentation_package_integrity.py'),
    layoutValidatorPath: path.join(SKILL_DIR, 'container_tools', 'inspect_presentation_layout_geometry.py'),
    layoutArgs: [
      '--expected-slide-size-emu', '12192000,6858000',
      '--validate-bullet-geometry',
      '--validate-heading-fit',
    ],
    fontPolicy: { basis: 'design', families: [FONT] },
    verifyArtifactToolImport: true,
    receiptPath: path.join(stagingDir, 'Phishing-Hook-Competition-Deck.validation.json'),
  })

  console.log(JSON.stringify({ final: FINAL_PPTX, slides: deck.slides.items.length, montage: path.join(BUILD_DIR, 'montage.webp') }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
