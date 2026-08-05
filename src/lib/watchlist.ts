/*
 * Firestore watchlist store — shared oriz-in DB, keyed by Clerk user id.
 * Firestore ONLY (Clerk owns auth). Config read from PUBLIC_FIREBASE_* env,
 * never hardcoded. Doc path: statusWatchlists/{clerkUserId} → { slugs: string[] }.
 * Lazy-inits Firebase once; no-ops gracefully when env is absent.
 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from 'firebase/firestore'

const cfg = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
}

let db: Firestore | null = null

export function firestoreReady(): boolean {
  return Boolean(cfg.apiKey && cfg.projectId)
}

function getDb(): Firestore | null {
  if (!firestoreReady()) return null
  if (db) return db
  const app: FirebaseApp = getApps()[0] ?? initializeApp(cfg)
  db = getFirestore(app)
  return db
}

const COLLECTION = 'statusWatchlists'

export async function loadWatchlist(clerkUserId: string): Promise<string[]> {
  const database = getDb()
  if (!database) return []
  const snap = await getDoc(doc(database, COLLECTION, clerkUserId))
  const data = snap.data()
  const slugs = data?.slugs
  return Array.isArray(slugs) ? slugs.filter((s): s is string => typeof s === 'string') : []
}

export async function saveWatchlist(clerkUserId: string, slugs: string[]): Promise<void> {
  const database = getDb()
  if (!database) return
  await setDoc(
    doc(database, COLLECTION, clerkUserId),
    { slugs: [...new Set(slugs)], updatedAt: Date.now() },
    { merge: true },
  )
}
