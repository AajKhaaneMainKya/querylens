import { NextResponse } from 'next/server'
import type { WaitlistEntry } from '@querylens/shared'

// TODO: Week 2 — validate body, insert to Supabase waitlist table
export async function POST(request: Request): Promise<NextResponse> {
  const _body: WaitlistEntry = await request.json()
  return NextResponse.json({ success: false, error: 'Not yet implemented' }, { status: 501 })
}
