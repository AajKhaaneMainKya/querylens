'use client'

import React, { useState } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface WaitlistFormProps {
  onSuccess?: () => void
}

export default function WaitlistForm({ onSuccess }: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [isTableauUser, setIsTableauUser] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company, isTableauUser }),
      })
      const json = await res.json()

      if (json.success) {
        setStatus('success')
        onSuccess?.()
      } else {
        setErrorMessage(json.error ?? 'Something went wrong.')
        setStatus('error')
      }
    } catch {
      setErrorMessage('Could not reach the server. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl bg-green-50 border border-green-200 px-6 py-8 text-center">
        <p className="text-green-800 font-medium">You're on the list.</p>
        <p className="text-green-600 text-sm mt-1">We'll reach out when your spot is ready.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
      <input
        type="email"
        placeholder="Work email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={status === 'loading'}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <input
        type="text"
        placeholder="Company"
        required
        value={company}
        onChange={e => setCompany(e.target.value)}
        disabled={status === 'loading'}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
        <input
          type="checkbox"
          checked={isTableauUser}
          onChange={e => setIsTableauUser(e.target.checked)}
          disabled={status === 'loading'}
          className="rounded"
        />
        I currently use Tableau
      </label>

      {status === 'error' && (
        <p className="text-red-500 text-sm">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !email || !company}
        className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Joining…' : 'Join the waitlist'}
      </button>
    </form>
  )
}
