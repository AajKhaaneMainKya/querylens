'use client'

import { useState, useEffect } from 'react'
import type { TableauSession } from './TableauConnect'

interface ChartDisplayProps {
  chartUrl: string
  clientId: string
  tableauSession?: TableauSession
}

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

function tableauHeaders(session?: TableauSession): Record<string, string> {
  if (!session) return {}
  return {
    'x-tableau-url': session.serverUrl,
    'x-tableau-site-id': session.siteId,
    'x-tableau-token': session.sessionToken,
  }
}

export default function ChartDisplay({ chartUrl, clientId, tableauSession }: ChartDisplayProps) {
  const [pngUrl, setPngUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    setStatus('loading')
    setPngUrl(null)

    fetch(`${API_URL}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...tableauHeaders(tableauSession) },
      body: JSON.stringify({ viewUrl: chartUrl, format: 'png', clientId }),
    })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.downloadUrl) {
          setPngUrl(json.data.downloadUrl)
          setStatus('done')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [chartUrl, clientId, tableauSession])

  return (
    <div className="mt-3">
      <div
        className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
        style={{ width: 800, minHeight: 200 }}
      >
        {status === 'loading' && (
          <div className="flex items-center justify-center h-48">
            <span className="text-gray-400 text-sm">Rendering chart…</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center justify-center h-48">
            <span className="text-red-400 text-sm">Failed to render chart.</span>
          </div>
        )}
        {status === 'done' && pngUrl && (
          <img src={pngUrl} alt="Tableau chart" className="w-full h-auto" />
        )}
      </div>

      <div className="mt-2 flex gap-3">
        {pngUrl && (
          <a
            href={pngUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-gray-500 hover:text-blue-600"
          >
            Download PNG
          </a>
        )}
        <ExportButton chartUrl={chartUrl} clientId={clientId} tableauSession={tableauSession} label="Download PDF" />
      </div>
    </div>
  )
}

function ExportButton({
  chartUrl,
  clientId,
  tableauSession,
  label,
}: {
  chartUrl: string
  clientId: string
  tableauSession?: TableauSession
  label: string
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleExport() {
    if (status === 'loading') return
    setStatus('loading')

    try {
      const res = await fetch(`${API_URL}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tableauHeaders(tableauSession) },
        body: JSON.stringify({ viewUrl: chartUrl, format: 'pdf', clientId }),
      })
      const json = await res.json()

      if (json.success && json.data?.downloadUrl) {
        window.open(json.data.downloadUrl, '_blank')
        setStatus('done')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    } finally {
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const labels = { idle: label, loading: 'Exporting…', done: 'Done!', error: 'Failed — retry?' }

  return (
    <button
      onClick={handleExport}
      disabled={status === 'loading'}
      className="text-xs font-medium text-gray-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {labels[status]}
    </button>
  )
}
