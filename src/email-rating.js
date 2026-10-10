// A fast preliminary text check. It makes no AI calls and never copies excerpts.
export function quickEmailRating(body, subject = '') {
  if (typeof body !== 'string' || !body.trim()) return null
  const text = `${subject}\n${body}`.toLowerCase()
  const pressure = /\b(urgent|immediately|act now|final notice|expires today|within \d+ hours?)\b/.test(text)
  const threat = /\b(account|profile|access)\b.{0,80}\b(suspend(?:ed)?|restrict(?:ed)?|lock(?:ed)?|deactivat\w*|clos(?:ed|ure))\b|\b(suspend(?:ed)?|lock(?:ed)?|deactivat\w*)\b.{0,40}\b(account|profile|access)\b/.test(text)
  const credentials = /\b(enter|send|provide|share|submit|confirm|verify|update)\b.{0,80}\b(password|passcode|one[- ]time (?:code|password)|verification code|login (?:details|credentials)|seed phrase|private key)\b/.test(text)
  const verification = /\b(verify|confirm|validate|restore|reactivate|unlock|update)\b.{0,60}\b(account|identity|login|details|access)\b/.test(text)
  const link = /https?:\/\/|\bwww\.|\bclick(?:ing)?\b.{0,60}\b(link|button|below|here)\b|\bverify account now\b/.test(text)
  const unusualPayment = /\b(gift cards?|wire transfer|send (?:money|bitcoin|crypto)|pay (?:in|with) (?:bitcoin|crypto)|seed phrase|private key)\b/.test(text)
  const prize = /\b(won|winner|selected|claim)\b.{0,60}\b(prize|lottery|reward)\b|\blottery winner\b/.test(text)
  const secrecy = /\bkeep (?:this|it) (?:secret|private)\b|\b(?:do not|don't) (?:tell anyone|contact (?:your |the )?(?:bank|support))\b/.test(text)

  const high = (credentials && (link || pressure || threat))
    || (verification && threat && (link || pressure))
    || (verification && link && pressure)
    || (unusualPayment && (pressure || secrecy || prize))
    || (pressure && threat && link)
  const suspicious = credentials || unusualPayment || prize || secrecy || threat
    || (verification && (link || pressure)) || (pressure && link)
  const level = high ? 'high' : suspicious ? 'moderate' : 'low'
  const reasons = level === 'low' ? [] : [
    credentials && 'Requests passwords, codes or other secrets.',
    unusualPayment && 'Mentions unusual payment methods or wallet secrets.',
    threat && 'Threatens account suspension, restriction or closure.',
    pressure && 'Pressures you to act quickly.',
    verification && link && 'Pairs an account or identity verification request with a link.',
    prize && 'Uses a prize or reward claim.',
    secrecy && 'Asks for secrecy or discourages contacting support.',
  ].filter(Boolean).slice(0, 3)

  return {
    level,
    verdict: high ? 'Likely scam/phishing' : suspicious ? 'Suspicious — review carefully' : 'No strong phishing pattern detected',
    reasons,
  }
}

export function formatQuickEmailRating(rating, hasAttachments = false) {
  if (!rating) return 'Quick rating: UNAVAILABLE — No readable message body was fully checked.'
  return [
    `Quick rating: ${rating.level.toUpperCase()} — ${rating.verdict}.`,
    ...rating.reasons.map(reason => `- ${reason}`),
    'Preliminary text check, not the full AI analysis. A low rating does not prove the message is safe.',
    hasAttachments && 'Only the message text was checked; attachments were not analyzed.',
  ].filter(Boolean).join('\n')
}
