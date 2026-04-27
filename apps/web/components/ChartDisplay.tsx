'use client'

// TODO: Week 7 — embed Tableau Embedding API v3 or render PNG from chartUrl

interface ChartDisplayProps {
  chartUrl?: string
}

export default function ChartDisplay({ chartUrl }: ChartDisplayProps) {
  if (!chartUrl) return null
  return <div>{/* TODO: embed chartUrl */}</div>
}
