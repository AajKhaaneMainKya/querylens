'use client'

import React, { useState } from 'react'

export interface TableauSession {
  sessionToken: string
  siteId: string
  serverUrl: string
}

export interface TableauCredentials {
  serverUrl: string
  siteId: string
  username: string
  password: string
}

interface TableauConnectProps {
  onConnect: (session: TableauSession, credentials: TableauCredentials) => void
}

type Status = 'idle' | 'loading' | 'error'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export default function TableauConnect({ onConnect }: TableauConnectProps) {
  const [serverUrl, setServerUrl] = useState('')
  const [siteId, setSiteId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch(`${API_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl, siteId, username, password }),
      })
      const json = await res.json()

      if (json.success) {
        const session: TableauSession = { sessionToken: json.sessionToken, siteId: json.siteId, serverUrl }
        const credentials: TableauCredentials = { serverUrl, siteId: json.siteId, username, password }
        onConnect(session, credentials)
      } else {
        setErrorMessage(json.error ?? 'Connection failed. Check your credentials.')
        setStatus('error')
      }
    } catch {
      setErrorMessage('Could not reach the API. Make sure the server is running.')
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Connect to Tableau</h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter your Tableau credentials to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="url"
            placeholder="Tableau Server URL — e.g. https://prod-in-a.online.tableau.com"
            required
            value={serverUrl}
            onChange={e => setServerUrl(e.target.value)}
            disabled={status === 'loading'}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <input
            type="text"
            placeholder="Site ID (leave blank for default site)"
            value={siteId}
            onChange={e => setSiteId(e.target.value)}
            disabled={status === 'loading'}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <input
            type="text"
            placeholder="Username"
            required
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={status === 'loading'}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={status === 'loading'}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />

          {status === 'error' && (
            <p className="text-sm text-red-500">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === 'loading' || !serverUrl || !username || !password}
            className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Connecting…' : 'Connect'}
          </button>
        </form>
      </div>
    </main>
  )
}
