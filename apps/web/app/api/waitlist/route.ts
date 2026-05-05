import { NextResponse } from 'next/server'
import type { WaitlistEntry } from '@querylens/shared'
import { supabase } from '../../../lib/supabase'

export async function POST(request: Request): Promise<NextResponse> {
  const body: WaitlistEntry = await request.json()
  const { email, company, isTableauUser } = body

  if (!email || !company) {
    return NextResponse.json(
      { success: false, error: 'email and company are required' },
      { status: 400 },
    )
  }

  const { error } = await supabase
    .from('waitlist')
    .insert({ email, company, is_tableau_user: isTableauUser ?? false, source: 'landing' })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'This email is already on the waitlist.' },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { success: false, error: 'Could not save your entry. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}
