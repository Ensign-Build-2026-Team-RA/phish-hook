import { describe, expect, it } from 'vitest'
import { formatQuickEmailRating, quickEmailRating } from '../src/email-rating.js'

describe('quick email reply rating', () => {
  it('rates the reported account suspension example as likely phishing', () => {
    const rating = quickEmailRating(`Dear Customer,
We detected unusual login activity and temporarily restricted access to your profile.
Verify your identity immediately by clicking the link below: Verify Account Now.
If you do not confirm your details within 24 hours, your account will be permanently deactivated.`)
    expect(rating).toMatchObject({ level: 'high', verdict: 'Likely scam/phishing' })
    expect(rating.reasons).toContain('Threatens account suspension, restriction or closure.')
    expect(rating.reasons).toContain('Pressures you to act quickly.')
    expect(formatQuickEmailRating(rating)).toContain('Quick rating: HIGH — Likely scam/phishing.')
  })

  it('rates a credential request with a link as high', () => {
    expect(quickEmailRating('Click here to verify your login credentials immediately.')).toMatchObject({ level: 'high' })
  })

  it('rates a lone account threat as suspicious', () => {
    expect(quickEmailRating('Your account has been suspended. Contact support using your usual app.')).toMatchObject({ level: 'moderate' })
  })

  it('does not call an ordinary message or link phishing', () => {
    expect(quickEmailRating('Meeting notes are available at https://example.edu/notes for tomorrow.')).toEqual({
      level: 'low', verdict: 'No strong phishing pattern detected', reasons: [],
    })
    expect(formatQuickEmailRating(quickEmailRating('Lunch is at noon.'))).toContain('A low rating does not prove the message is safe.')
  })

  it('does not echo message text, subjects, links, passwords or codes in its output', () => {
    const secret = 'DO-NOT-ECHO-483920'
    const formatted = formatQuickEmailRating(quickEmailRating(`Urgent: click https://evil.example and enter password ${secret}`, `Subject ${secret}`))
    expect(formatted).not.toContain(secret)
    expect(formatted).not.toContain('evil.example')
    expect(formatted).not.toContain('Subject')
  })

  it('marks unreadable bodies unavailable and attachments as text-only', () => {
    expect(formatQuickEmailRating(null)).toContain('UNAVAILABLE')
    expect(formatQuickEmailRating(quickEmailRating('Urgent: account locked. Click here.'), true)).toContain('attachments were not analyzed')
  })
})
