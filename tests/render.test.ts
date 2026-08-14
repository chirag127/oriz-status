import { describe, it, expect } from 'vitest'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { TARGETS } from '../src/data/targets'
import StatusGrid from '../src/components/StatusGrid.astro'
import { GET as feedGet } from '../src/pages/feed.xml'

/*
 * Container-API render smoke tests — server-side, no browser. We render the
 * StatusGrid (the main page's data-driven component) and assert every target
 * ends up on the board as an accessible, JS-off-friendly tile. index.astro
 * itself pulls in a client:load React island + Clerk, so we exercise the
 * pure server-rendered grid it composes rather than the whole island tree.
 */
describe('StatusGrid render (Astro Container API)', () => {
  it('renders one tile per target with slug, name and unknown initial state', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(StatusGrid)

    // one tile per registered target
    const tileCount = (html.match(/class="tile"/g) ?? []).length
    expect(tileCount).toBe(TARGETS.length)

    // every slug + name is present (progressive enhancement: crawlers see it all)
    for (const t of TARGETS) {
      expect(html, `slug ${t.slug}`).toContain(`data-slug="${t.slug}"`)
      expect(html, `name ${t.name}`).toContain(t.name)
    }

    // SSR placeholder state before client JS resolves
    expect(html).toContain('data-status="unknown"')
  })

  it('renders the category section headings that have members', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(StatusGrid)
    expect(html).toContain('Apex') // master
    expect(html).toContain('Applications') // app
    expect(html).toContain('Interfaces') // api
  })

  it('links each tile out to its target url', async () => {
    const container = await AstroContainer.create()
    const html = await container.renderToString(StatusGrid)
    expect(html).toContain('href="https://oriz.in"')
  })
})

describe('feed.xml build-time route', () => {
  it('returns a valid RSS placeholder pointing at the canonical worker feed', async () => {
    const res = await feedGet({} as Parameters<typeof feedGet>[0])
    expect(res.headers.get('Content-Type')).toContain('application/rss+xml')
    const body = await res.text()
    expect(body).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/)
    expect(body).toContain('<rss version="2.0">')
    expect(body).toContain('status-api.oriz.in/feed.xml')
  })
})
