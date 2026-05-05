'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import TableauConnect, { type TableauSession } from '../../components/TableauConnect'
import ChatInterface from '../../components/ChatInterface'
import WaitlistGate, { incrementQueryCount, isWaitlisted } from '../../components/WaitlistGate'

function ChatPage() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('client')

  const [session, setSession] = useState<TableauSession | null>(null)
  const [queryCount, setQueryCount] = useState(0)
  const [gateVisible, setGateVisible] = useState(false)

  useEffect(() => {
    const stored = parseInt(localStorage.getItem('ql_query_count') ?? '0', 10)
    setQueryCount(stored)
    if (stored > 1 && !isWaitlisted()) setGateVisible(true)
  }, [])

  function handleQueryComplete() {
    const next = incrementQueryCount()
    setQueryCount(next)
    if (next > 1 && !isWaitlisted()) setGateVisible(true)
  }

  if (!clientId) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-white">
        <p className="text-gray-500 text-sm">
          Missing <code>?client=</code> query parameter.
        </p>
      </main>
    )
  }

  if (!session) {
    return <TableauConnect onConnect={setSession} />
  }

  return (
    <main className="flex flex-col h-screen bg-white">
      <header className="flex items-center px-6 py-4 border-b border-gray-200 shrink-0">
        <span className="text-sm font-semibold text-gray-900">QueryLens</span>
      </header>
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          clientId={clientId}
          tableauSession={session}
          onQueryComplete={handleQueryComplete}
          blocked={gateVisible}
        />
      </div>
      <WaitlistGate queryCount={queryCount} onDismiss={() => setGateVisible(false)} />
    </main>
  )
}

export default function ChatPageWrapper() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  )
}
