import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/*
 * The watchlist store must degrade gracefully when Firebase env is absent.
 * We force the no-config path with stubEnv (rather than depending on ambient
 * .env state on the dev machine / CI), then assert firestoreReady() is false
 * and load/save become safe no-ops instead of throwing or hitting the network.
 */
describe('watchlist store (Firebase env forced absent)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('PUBLIC_FIREBASE_API_KEY', '')
    vi.stubEnv('PUBLIC_FIREBASE_PROJECT_ID', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reports not-ready without PUBLIC_FIREBASE_* config', async () => {
    const { firestoreReady } = await import('../src/lib/watchlist')
    expect(firestoreReady()).toBe(false)
  })

  it('loadWatchlist returns an empty array instead of throwing', async () => {
    const { loadWatchlist } = await import('../src/lib/watchlist')
    await expect(loadWatchlist('user_123')).resolves.toEqual([])
  })

  it('saveWatchlist resolves as a no-op instead of throwing', async () => {
    const { saveWatchlist } = await import('../src/lib/watchlist')
    await expect(saveWatchlist('user_123', ['me', 'blog'])).resolves.toBeUndefined()
  })
})
