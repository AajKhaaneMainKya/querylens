import type { AgentContext, AgentResult, SchemaResult } from '@querylens/shared'

export type SchemaMode = 'sync' | 'describe'

export class SchemaAgent {
  async run(
    input: string,
    context: AgentContext,
    mode: SchemaMode = 'describe'
  ): Promise<AgentResult & { data?: SchemaResult }> {
    // TODO: Week 4
    //
    // Mode 'sync' (onboarding / nightly cron):
    //   1. Auth against Tableau REST API using client PAT (loaded from Supabase)
    //   2. Fetch all workbooks → datasources → dimensions, measures, filter fields
    //   3. Upsert into Supabase client_schemas
    //
    // Mode 'describe' (user asks "what data do you have?"):
    //   1. Load schema from Supabase client_schemas
    //   2. Call chat() from services/llm.ts to summarise in plain English
    //   3. Return friendly description of available workbooks and fields
    throw new Error('SchemaAgent not yet implemented')
  }
}
