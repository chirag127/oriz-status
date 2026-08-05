/*
 * AuthButton — compact console sign-in / account island (client:load).
 * Public-first: gates only the personal watchlist, never the free board.
 * Renders nothing but its wrapper when Clerk key is absent (build-safe).
 */
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import ClerkProvider from './ClerkProvider'

const hasClerk = Boolean(import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY)

export default function AuthButton() {
  if (!hasClerk) return null
  return (
    <ClerkProvider>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="auth-btn" type="button" aria-label="Sign in to save a watchlist">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              userButtonAvatarBox: {
                width: '26px',
                height: '26px',
                border: '1.5px solid #5bf2a5',
                boxShadow: '0 0 0 2px rgba(91,242,165,0.28)',
              },
            },
          }}
        />
      </SignedIn>
    </ClerkProvider>
  )
}
