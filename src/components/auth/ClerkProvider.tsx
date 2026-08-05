import { ClerkProvider as ClerkReactProvider } from '@clerk/clerk-react'
import type { ReactNode } from 'react'

const publishableKey = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY

// CRT annunciator console — phosphor-on-petrol, mono chrome.
const appearance = {
  variables: {
    colorPrimary: '#5bf2a5',
    colorText: '#e8ead8',
    colorTextSecondary: '#a9b6a4',
    colorBackground: '#14262a',
    colorInputBackground: '#0a1416',
    colorInputText: '#e8ead8',
    colorDanger: '#ff5c57',
    colorNeutral: '#24403f',
    borderRadius: '3px',
    fontFamily: "'Hanken Grotesk Variable', system-ui, sans-serif",
  },
  elements: {
    card: {
      backgroundColor: '#14262a',
      border: '1px solid #24403f',
      boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      borderRadius: '4px',
    },
    headerTitle: {
      fontFamily: "'Space Grotesk Variable', system-ui, sans-serif",
      color: '#e8ead8',
      letterSpacing: '-0.01em',
    },
    headerSubtitle: { color: '#a9b6a4' },
    formButtonPrimary: {
      backgroundColor: '#5bf2a5',
      color: '#0a1416',
      fontFamily: "'Martian Mono Variable', ui-monospace, monospace",
      fontWeight: '600',
      fontSize: '12px',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      borderRadius: '2px',
      boxShadow: '0 0 14px rgba(91,242,165,0.35)',
    },
    formFieldInput: {
      backgroundColor: '#0a1416',
      borderColor: '#24403f',
      color: '#e8ead8',
    },
    formFieldLabel: { color: '#e8ead8' },
    footerActionLink: { color: '#5bf2a5' },
  },
} as const

export default function ClerkProvider({ children }: { children: ReactNode }) {
  if (!publishableKey) {
    return <>{children}</>
  }
  return (
    <ClerkReactProvider publishableKey={publishableKey} appearance={appearance}>
      {children}
    </ClerkReactProvider>
  )
}
