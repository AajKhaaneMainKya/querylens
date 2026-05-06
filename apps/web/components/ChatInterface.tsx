'use client'

import { useState, useRef, useEffect } from 'react'
import type { QueryResponse, OrchestratorResult, QueryResult, ExportResult, SchemaResult } from '@querylens/shared'
import type { TableauSession, TableauCredentials } from './TableauConnect'
import ChartDisplay from './ChartDisplay'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  chartUrl?: string
  downloadUrl?: string
  downloadFormat?: string
}

interface ChatInterfaceProps {
  clientId: string
  tableauSession?: TableauSession
  tableauCredentials?: TableauCredentials | null
  onSessionRefresh?: (session: TableauSession) => void
  onQueryComplete?: () => void
  blocked?: boolean
}

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

export default function ChatInterface({
  clientId,
  tableauSession,
  tableauCredentials,
  onSessionRefresh,
  onQueryComplete,
  blocked,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function buildTableauHeaders(session?: TableauSession): Record<string, string> {
    if (!session) return {}
    return {
      'x-tableau-url': session.serverUrl,
      'x-tableau-site-id': session.siteId,
      'x-tableau-token': session.sessionToken,
    }
  }

  // Makes a fetch call, and on 401 silently re-authenticates using stored
  // credentials and retries once with the fresh token.
  async function fetchWithTokenRefresh(url: string, init: RequestInit): Promise<Response> {
    const res = await fetch(url, init)

    if (res.status !== 401 || !tableauCredentials) return res

    const refreshRes = await fetch(`${API_URL}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serverUrl: tableauCredentials.serverUrl,
        siteId: tableauCredentials.siteId,
        username: tableauCredentials.username,
        password: tableauCredentials.password,
      }),
    })

    if (!refreshRes.ok) return res

    const refreshJson = await refreshRes.json()
    if (!refreshJson.success) return res

    const newSession: TableauSession = {
      sessionToken: refreshJson.sessionToken,
      siteId: refreshJson.siteId,
      serverUrl: tableauCredentials.serverUrl,
    }
    onSessionRefresh?.(newSession)

    // Retry with fresh token, replacing only the auth header
    const newHeaders: Record<string, string> = {
      ...(init.headers as Record<string, string>),
      ...buildTableauHeaders(newSession),
    }
    return fetch(url, { ...init, headers: newHeaders })
  }

  async function send() {
    const query = input.trim()
    if (!query || isLoading || blocked) return

    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: query }])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetchWithTokenRefresh(`${API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildTableauHeaders(tableauSession) },
        body: JSON.stringify({ query, clientId, conversationId: conversationId ?? undefined }),
      })
      const json: QueryResponse = await res.json()

      if (json.conversationId) setConversationId(json.conversationId)
      const msg = buildAssistantMessage(json)
      setMessages(prev => [...prev, msg])

      if (json.success) onQueryComplete?.()
    } catch {
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function buildAssistantMessage(json: QueryResponse): Message {
    const base = { id: crypto.randomUUID(), role: 'assistant' as const }

    if (!json.success || !json.result) {
      return { ...base, text: json.errorMessage ?? 'An error occurred.' }
    }

    const result = json.result as OrchestratorResult

    if (result.clarifyQuestion) {
      return { ...base, text: result.clarifyQuestion }
    }

    if (result.intent === 'visualize') {
      const data = result.data as QueryResult
      return { ...base, text: 'Here is your chart.', chartUrl: data.chartUrl }
    }

    if (result.intent === 'export') {
      const data = result.data as ExportResult
      return {
        ...base,
        text: `Export ready — link expires at ${new Date(data.expiresAt).toLocaleTimeString()}.`,
        downloadUrl: data.downloadUrl,
        downloadFormat: data.format,
      }
    }

    if (result.intent === 'schema') {
      const data = result.data as SchemaResult
      return { ...base, text: data?.description ?? 'Schema loaded.' }
    }

    return { ...base, text: 'Done.' }
  }

  const inputDisabled = isLoading || !!blocked

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-20">
            Ask a question about your Tableau data.
          </p>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              {msg.chartUrl && (
                <ChartDisplay
                  chartUrl={msg.chartUrl}
                  clientId={clientId}
                  tableauSession={tableauSession}
                />
              )}
              {msg.downloadUrl && (
                <a
                  href={msg.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
                >
                  Download {msg.downloadFormat?.toUpperCase()}
                </a>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <span className="text-gray-400 text-sm">Thinking…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 px-4 py-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={blocked ? 'Join the waitlist to continue…' : 'Ask about your data…'}
          disabled={inputDisabled}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={inputDisabled || !input.trim()}
          className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  )
}
