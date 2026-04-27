import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QueryLens',
  description: 'Natural language intelligence for Tableau',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
