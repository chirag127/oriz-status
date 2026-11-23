import { describe, it, expect } from 'vitest'
import { TARGETS as SITE_TARGETS } from '../src/data/targets'
import { TARGETS as WORKER_TARGETS } from '../workers/targets'

/*
 * The targets registry is the single source of truth for what the cron
 * worker pings AND what the dashboard renders. src/data/targets.ts and
 * workers/targets.ts are documented as "keep in sync" mirrors — these
 * tests enforce that contract and the per-entry invariants.
 */

const SITE_CATEGORIES = new Set(['master', 'app', 'api', 'package', 'book'])
const WORKER_CATEGORIES = new Set(['master', 'app', 'api'])

describe('site TARGETS registry', () => {
  it('is non-empty', () => {
    expect(SITE_TARGETS.length).toBeGreaterThan(0)
  })

  it('has unique slugs', () => {
    const slugs = SITE_TARGETS.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('has exactly one master apex', () => {
    const masters = SITE_TARGETS.filter((t) => t.category === 'master')
    expect(masters).toHaveLength(1)
    expect(masters[0].slug).toBe('master')
  })

  it('gives every entry a valid category, https url, and non-empty name', () => {
    for (const t of SITE_TARGETS) {
      expect(SITE_CATEGORIES.has(t.category), `${t.slug} category`).toBe(true)
      expect(t.url, `${t.slug} url`).toMatch(/^https:\/\//)
      expect(t.name.length, `${t.slug} name`).toBeGreaterThan(0)
      expect(['live', 'planned'], `${t.slug} status`).toContain(t.status)
    }
  })

  it('uses slug-like identifiers (lowercase, dash-safe)', () => {
    for (const t of SITE_TARGETS) {
      expect(t.slug, t.slug).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('parses every url', () => {
    for (const t of SITE_TARGETS) {
      expect(() => new URL(t.url), t.slug).not.toThrow()
    }
  })
})

describe('worker TARGETS registry', () => {
  it('has unique slugs and valid categories', () => {
    const slugs = WORKER_TARGETS.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const t of WORKER_TARGETS) {
      expect(WORKER_CATEGORIES.has(t.category), `${t.slug} category`).toBe(true)
      expect(t.url, `${t.slug} url`).toMatch(/^https:\/\//)
    }
  })
})

describe('site ⇄ worker sync contract', () => {
  it('worker targets are the live subset of site targets (same slug/name/url/category)', () => {
    const siteBySlug = new Map(SITE_TARGETS.map((t) => [t.slug, t]))
    for (const w of WORKER_TARGETS) {
      const s = siteBySlug.get(w.slug)
      expect(s, `worker slug ${w.slug} missing from site registry`).toBeDefined()
      expect(w.name, `${w.slug} name`).toBe(s!.name)
      expect(w.url, `${w.slug} url`).toBe(s!.url)
      expect(w.category, `${w.slug} category`).toBe(s!.category)
    }
  })

  it('every live site target the worker can probe is present in the worker registry', () => {
    const workerSlugs = new Set(WORKER_TARGETS.map((t) => t.slug))
    const probeable = SITE_TARGETS.filter(
      (t) => t.status === 'live' && WORKER_CATEGORIES.has(t.category),
    )
    for (const t of probeable) {
      expect(workerSlugs.has(t.slug), `live target ${t.slug} not probed by worker`).toBe(true)
    }
  })
})
