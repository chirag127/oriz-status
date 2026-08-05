/*
 * Watchlist — Clerk-gated personal panel (client:load).
 * PUBLIC board stays ungated; this only lets a signed-in user pin channels
 * they care about, persisted to Firestore keyed by their Clerk id. Live
 * lat/status pulled from the same status-api the board polls.
 */
import { useEffect, useState, useCallback } from 'react'
import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/clerk-react'
import ClerkProvider from './auth/ClerkProvider'
import { loadWatchlist, saveWatchlist, firestoreReady } from '~/lib/watchlist'

export interface Channel {
  slug: string
  name: string
  url: string
}

interface Live {
  status: 'up' | 'degraded' | 'down' | 'unknown'
  ms: number | null
}

const hasClerk = Boolean(import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY)

function fmtMs(ms: number | null): string {
  if (ms == null) return '—'
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

function Panel({ channels, apiBase }: { channels: Channel[]; apiBase: string }) {
  const { user, isLoaded } = useUser()
  const [picked, setPicked] = useState<string[]>([])
  const [live, setLive] = useState<Record<string, Live>>({})

  const uid = user?.id ?? null

  useEffect(() => {
    if (!uid || !firestoreReady()) return
    loadWatchlist(uid).then(setPicked).catch(() => {})
  }, [uid])

  useEffect(() => {
    let alive = true
    const pull = async () => {
      try {
        const res = await fetch(`${apiBase}/api/status`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!alive || !Array.isArray(data?.services)) return
        const map: Record<string, Live> = {}
        for (const s of data.services) map[s.slug] = { status: s.status ?? 'unknown', ms: s.ms ?? null }
        setLive(map)
      } catch { /* board keeps last known */ }
    }
    pull()
    const id = setInterval(pull, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [apiBase])

  const toggle = useCallback((slug: string) => {
    setPicked((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
      if (uid) saveWatchlist(uid, next).catch(() => {})
      return next
    })
  }, [uid])

  const pinned = channels.filter((c) => picked.includes(c.slug))

  return (
    <div className="watch">
      <div className="watch__head">
        <h2>Your watchlist</h2>
        <span className="watch__note">
          {firestoreReady() ? 'synced to your account' : 'sign-in enabled once Firestore key is set'}
        </span>
      </div>
      {!isLoaded ? (
        <p className="watch__empty">Loading account…</p>
      ) : pinned.length === 0 ? (
        <p className="watch__empty">
          Pin channels below to keep them one glance away. Watchlist follows you across devices.
        </p>
      ) : (
        <div className="watch__list">
          {pinned.map((c) => {
            const l = live[c.slug] ?? { status: 'unknown', ms: null }
            return (
              <div className="tile" data-status={l.status} key={c.slug}>
                <span className={`lamp${l.status === 'unknown' ? ' pulse' : ''}`} aria-hidden />
                <a className="chan" href={c.url} target="_blank" rel="noopener">{c.name}</a>
                <span className="lat">{fmtMs(l.ms)}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="watch__list" style={{ marginTop: pinned.length ? 20 : 14 }}>
        {channels.map((c) => (
          <button
            type="button"
            key={c.slug}
            className="watch__pill"
            data-on={picked.includes(c.slug)}
            aria-pressed={picked.includes(c.slug)}
            onClick={() => toggle(c.slug)}
          >
            <span
              className="lamp"
              style={{ width: 8, height: 8, borderRadius: '50%' }}
              aria-hidden
            />
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Watchlist({ channels, apiBase }: { channels: Channel[]; apiBase: string }) {
  if (!hasClerk) return null
  return (
    <ClerkProvider>
      <SignedOut>
        <div className="watch">
          <div className="watch__head">
            <h2>Your watchlist</h2>
            <SignInButton mode="modal">
              <button className="auth-btn" type="button">Sign in</button>
            </SignInButton>
          </div>
          <p className="watch__empty">
            The board is fully public. Sign in only to pin the channels you watch — synced across devices, keyed to your oriz account.
          </p>
        </div>
      </SignedOut>
      <SignedIn>
        <Panel channels={channels} apiBase={apiBase} />
      </SignedIn>
    </ClerkProvider>
  )
}
