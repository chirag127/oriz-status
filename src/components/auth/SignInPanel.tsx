/*
 * SignInPanel — dedicated /sign-in route island. Reuses the shared CRT
 * annunciator ClerkProvider (one provider per page) + Clerk <SignIn/>.
 * Public board never gated; this only fronts oriz.in SSO.
 */
import { SignIn } from '@clerk/clerk-react'
import ClerkProvider from './ClerkProvider'

const hasClerk = Boolean(import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY)

export default function SignInPanel() {
  if (!hasClerk) {
    return (
      <p style={{ color: 'var(--ivory-faint)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
        Sign-in unavailable — auth not configured.
      </p>
    )
  }
  return (
    <ClerkProvider>
      <SignIn routing="hash" />
    </ClerkProvider>
  )
}
