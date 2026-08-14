import { describe, it, expect } from 'vitest'
import {
  classify,
  detectTransitions,
  rollupDay,
  mergeIncidents,
  pruneHistory,
} from '../workers/ping-cron'

type ProbeResult = Parameters<typeof detectTransitions>[0][number]
type Transition = ReturnType<typeof detectTransitions>[number]
type DayRollup = Parameters<typeof rollupDay>[0]

const probe = (slug: string, status: ProbeResult['status'], code = 200): ProbeResult => ({
  slug, name: `${slug}.oriz.in`, url: `https://${slug}.oriz.in`, category: 'app', status, code, ms: 100, ts: 0,
})

describe('classify', () => {
  it('is up for a fast ok response', () => {
    expect(classify(true, 100)).toBe('up')
  })
  it('is degraded for a slow (>3s) ok response', () => {
    expect(classify(true, 3001)).toBe('degraded')
    expect(classify(true, 3000)).toBe('up') // boundary: 3000 is still up
  })
  it('is down for a non-ok response regardless of latency', () => {
    expect(classify(false, 50)).toBe('down')
    expect(classify(false, 9999)).toBe('down')
  })
})

describe('detectTransitions', () => {
  it('flags a slug whose status changed', () => {
    const prev = [probe('me', 'up'), probe('blog', 'up')]
    const cur = [probe('me', 'down', 503), probe('blog', 'up')]
    const t = detectTransitions(cur, prev, 1000)
    expect(t).toHaveLength(1)
    expect(t[0]).toMatchObject({ slug: 'me', from: 'up', to: 'down', at: 1000, code: 503 })
  })

  it('does not flag unchanged statuses', () => {
    const prev = [probe('me', 'up')]
    const cur = [probe('me', 'up')]
    expect(detectTransitions(cur, prev, 1)).toHaveLength(0)
  })

  it('does not flag brand-new slugs with no prior state', () => {
    const cur = [probe('newapp', 'down')]
    expect(detectTransitions(cur, [], 1)).toHaveLength(0)
  })

  it('detects recovery (down → up) too', () => {
    const prev = [probe('me', 'down')]
    const cur = [probe('me', 'up')]
    const t = detectTransitions(cur, prev, 5)
    expect(t[0]).toMatchObject({ from: 'down', to: 'up' })
  })
})

describe('rollupDay', () => {
  it('counts up and degraded as available, down against it', () => {
    const day: DayRollup = {}
    rollupDay(day, [probe('me', 'up'), probe('blog', 'degraded'), probe('post', 'down')])
    expect(day.me).toEqual({ up: 1, down: 0, total: 1 })
    expect(day.blog).toEqual({ up: 1, down: 0, total: 1 })
    expect(day.post).toEqual({ up: 0, down: 1, total: 1 })
  })

  it('accumulates across successive ticks (mutating the same rollup)', () => {
    const day: DayRollup = {}
    rollupDay(day, [probe('me', 'up')])
    rollupDay(day, [probe('me', 'down')])
    rollupDay(day, [probe('me', 'up')])
    expect(day.me).toEqual({ up: 2, down: 1, total: 3 })
  })
})

describe('mergeIncidents', () => {
  const t = (slug: string, at: number): Transition => ({ slug, name: slug, from: 'up', to: 'down', at, code: 0 })

  it('returns the previous log unchanged when there are no new transitions', () => {
    const prev = [t('a', 1)]
    expect(mergeIncidents([], prev)).toBe(prev)
  })

  it('prepends new transitions (newest first)', () => {
    const merged = mergeIncidents([t('new', 2)], [t('old', 1)])
    expect(merged.map((x) => x.slug)).toEqual(['new', 'old'])
  })

  it('caps the log at 50 entries', () => {
    const prev = Array.from({ length: 60 }, (_, i) => t(`s${i}`, i))
    const merged = mergeIncidents([t('newest', 999)], prev)
    expect(merged).toHaveLength(50)
    expect(merged[0].slug).toBe('newest')
  })
})

describe('pruneHistory', () => {
  it('keeps the current day and drops days older than the 90-day window', () => {
    const history: Record<string, DayRollup> = {
      '2026-08-14': { me: { up: 1, down: 0, total: 1 } }, // today
      '2026-05-17': { me: { up: 1, down: 0, total: 1 } }, // cutoff edge (today - 89d), retained
      '2026-05-16': { me: { up: 1, down: 0, total: 1 } }, // one day past the window, dropped
      '2026-01-01': { me: { up: 1, down: 0, total: 1 } }, // way old
    }
    const pruned = pruneHistory(history, '2026-08-14')
    expect(pruned['2026-08-14']).toBeDefined()
    expect(pruned['2026-05-17']).toBeDefined() // exactly at the 90-day cutoff is retained
    expect(pruned['2026-05-16']).toBeUndefined()
    expect(pruned['2026-01-01']).toBeUndefined()
  })

  it('is a no-op when everything is within the window', () => {
    const history: Record<string, DayRollup> = {
      '2026-08-14': { me: { up: 1, down: 0, total: 1 } },
      '2026-08-13': { me: { up: 1, down: 0, total: 1 } },
    }
    expect(Object.keys(pruneHistory(history, '2026-08-14')).sort()).toEqual(['2026-08-13', '2026-08-14'])
  })
})
