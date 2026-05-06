'use client'

import { useEffect, useState } from 'react'
import WaitlistForm from './WaitlistForm'

const QUERY_COUNT_KEY = 'ql_query_count'
const WAITLISTED_KEY  = 'ql_waitlisted'

const ALLOWED_EMAILS = ['rshivs.1295@gmail.com', 'rahul.shivshankar@regenesys.com']

export function incrementQueryCount(): number {
  const current = parseInt(localStorage.getItem(QUERY_COUNT_KEY) ?? '0', 10)
  const next = current + 1
  localStorage.setItem(QUERY_COUNT_KEY, String(next))
  return next
}

export function isWaitlisted(): boolean {
  return localStorage.getItem(WAITLISTED_KEY) === 'true'
}

export function checkAndSetAllowlist(email: string): boolean {
  if (!ALLOWED_EMAILS.includes(email.toLowerCase().trim())) return false
  localStorage.setItem(WAITLISTED_KEY, 'true')
  return true
}

interface WaitlistGateProps {
  queryCount: number
  onDismiss: () => void
}

export default function WaitlistGate({ queryCount, onDismiss }: WaitlistGateProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (queryCount > 1 && !isWaitlisted()) {
      setVisible(true)
    }
  }, [queryCount])

  function handleSuccess() {
    localStorage.setItem(WAITLISTED_KEY, 'true')
    setVisible(false)
    onDismiss()
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl px-8 py-10 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">QueryLens</h2>
          <p className="mt-2 text-sm text-gray-500">
            You've seen what QueryLens can do. Join the waitlist for full access.
          </p>
        </div>
        <WaitlistForm onSuccess={handleSuccess} />
      </div>
    </div>
  )
}
