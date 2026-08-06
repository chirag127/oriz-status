import { ClerkProvider, SignIn } from '@clerk/clerk-react'

const publishableKey = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY

// Phosphor NOC console — teal-green phosphor on void deck, JetBrains Mono
// readings, amber/alarm accents. Themed to status.oriz.in's palette.
const appearance = {
  variables: {
    colorPrimary: '#2fd6a6',
    colorText: '#d7e3ec',
    colorTextSecondary: '#7d93a3',
    colorBackground: '#0f1720',
    colorInputBackground: '#0a0f16',
    colorInputText: '#d7e3ec',
    colorDanger: '#ff5c6c',
    borderRadius: '4px',
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Consolas, monospace",
  },
  elements: {
    card: {
      backgroundColor: '#0f1720',
      border: '1px solid #1e2c39',
      boxShadow: '0 0 0 1px #2fd6a622, 0 12px 40px rgba(0,0,0,0.6)',
      borderRadius: '10px',
    },
    headerTitle: {
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      color: '#d7e3ec',
      letterSpacing: '0.01em',
    },
    headerSubtitle: { color: '#7d93a3' },
    formButtonPrimary: {
      backgroundColor: '#2fd6a6',
      color: '#0a0f16',
      fontWeight: '600',
      borderRadius: '4px',
      textTransform: 'none',
    },
    formFieldInput: {
      backgroundColor: '#0a0f16',
      borderColor: '#1e2c39',
      color: '#d7e3ec',
    },
    formFieldLabel: { color: '#d7e3ec' },
    footerActionLink: { color: '#2fd6a6' },
    identityPreviewEditButton: { color: '#2fd6a6' },
  },
} as const

export default function SignInPanel() {
  if (!publishableKey) {
    return <p style={{ color: '#7d93a3', fontFamily: 'var(--font-mono)' }}>Sign-in unavailable — auth not configured.</p>
  }
  return (
    <ClerkProvider publishableKey={publishableKey} appearance={appearance}>
      <SignIn routing="hash" />
    </ClerkProvider>
  )
}
