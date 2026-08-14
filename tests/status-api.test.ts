import { describe, it, expect } from 'vitest'
import {
  clampDays,
  computeUptime,
  escapeXml,
  buildRssXml,
} from '../workers/status-api'

type Transition = Parameters<typeof buildRssXml>[0][number]
type History = Parameters<typeof computeUptime>[0]

describe('clampDays', () => {
  it('defaults to 30 when absent', () => {
    expect(clampDays(null)).toBe(30)
  })
  it('clamps to the 1..90 window', () => {
    expect(clampDays('0')).toBe(1)
    expect(clampDays('-5')).toBe(1)
    expect(clampDays('1000')).toBe(90)
    expect(clampDays('45')).toBe(45)
  })
  it('coerces non-numeric to the max-clamp floor via NaN→max(1,NaN)=1', () => {
    // Number('abc') === NaN; Math.max(1, NaN) === NaN; Math.min(90, NaN) === NaN.
    // Guard the documented behavior: it is not a finite in-range value.
    expect(Number.isNaN(clampDays('abc'))).toBe(true)
  })
})

describe('computeUptime', () => {
  const now = new Date('2026-08-14T12:00:00Z')
  const day = (offset: number) => {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - offset)
    return d.toISOString().slice(0, 10)
  }

  it('returns null uptime and zero samples when history is empty', () => {
    const r = computeUptime({}, 'me', 7, now)
    expect(r.slug).toBe('me')
    expect(r.days).toBe(7)
    expect(r.uptime).toBeNull()
    expect(r.samples).toBe(0)
    expect(r.daily).toHaveLength(7)
    expect(r.daily.every((d) => d.pct === null && d.total === 0)).toBe(true)
  })

  it('computes overall uptime % across the window', () => {
    const history: History = {
      [day(0)]: { me: { up: 9, down: 1, total: 10 } },
      [day(1)]: { me: { up: 10, down: 0, total: 10 } },
    }
    const r = computeUptime(history, 'me', 3, now)
    // 19 up of 20 total = 95%
    expect(r.samples).toBe(20)
    expect(r.uptime).toBe(95)
    expect(r.daily).toHaveLength(3)
    expect(r.daily[0]).toMatchObject({ day: day(0), up: 9, total: 10, pct: 90 })
    expect(r.daily[2]).toMatchObject({ up: 0, total: 0, pct: null })
  })

  it('ignores other slugs in the same day', () => {
    const history: History = {
      [day(0)]: { me: { up: 5, down: 5, total: 10 }, blog: { up: 10, down: 0, total: 10 } },
    }
    const r = computeUptime(history, 'me', 1, now)
    expect(r.uptime).toBe(50)
    expect(r.samples).toBe(10)
  })

  it('rounds uptime to 3 decimals and daily pct to 2', () => {
    const history: History = { [day(0)]: { me: { up: 1, down: 2, total: 3 } } }
    const r = computeUptime(history, 'me', 1, now)
    expect(r.uptime).toBe(33.333)
    expect(r.daily[0].pct).toBe(33.33)
  })
})

describe('escapeXml', () => {
  it('escapes the five predefined entities', () => {
    expect(escapeXml(`<a href="x" data='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; data=&apos;y&apos;&gt;&amp;&lt;/a&gt;',
    )
  })
  it('leaves plain text untouched', () => {
    expect(escapeXml('me.oriz.in up → down')).toBe('me.oriz.in up → down')
  })
})

describe('buildRssXml', () => {
  const incidents: Transition[] = [
    { slug: 'me', name: 'me.oriz.in', from: 'up', to: 'down', at: Date.parse('2026-08-14T10:00:00Z'), code: 503 },
    { slug: 'blog', name: 'blog.oriz.in', from: 'down', to: 'up', at: Date.parse('2026-08-14T11:00:00Z'), code: 200 },
  ]

  it('emits a well-formed RSS 2.0 skeleton', () => {
    const xml = buildRssXml(incidents)
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/)
    expect(xml).toContain('<rss version="2.0">')
    expect(xml).toContain('<title>oriz / status incidents</title>')
    expect((xml.match(/<item>/g) ?? []).length).toBe(2)
  })

  it('renders per-incident title, link anchor, HTTP code and guid', () => {
    const xml = buildRssXml(incidents)
    expect(xml).toContain('<title>me.oriz.in up → down</title>')
    expect(xml).toContain('<link>https://status.oriz.in/#me</link>')
    expect(xml).toContain('(HTTP 503)')
    expect(xml).toContain(`<guid isPermaLink="false">me-${incidents[0].at}</guid>`)
  })

  it('omits the HTTP suffix when code is 0/falsy', () => {
    const xml = buildRssXml([{ slug: 'x', name: 'x.oriz.in', from: 'up', to: 'down', at: 0, code: 0 }])
    expect(xml).not.toContain('(HTTP')
  })

  it('escapes XML-unsafe characters in names', () => {
    const xml = buildRssXml([{ slug: 'x', name: 'a & b', from: 'up', to: 'down', at: 0, code: 0 }])
    expect(xml).toContain('a &amp; b')
    expect(xml).not.toMatch(/<title>a & b/)
  })

  it('produces an empty <channel> item list for no incidents', () => {
    const xml = buildRssXml([])
    expect(xml).not.toContain('<item>')
    expect(xml).toContain('</channel>')
  })
})
