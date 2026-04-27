import type { AgentContext, AgentResult, SchemaResult, WorkbookSchema } from '@querylens/shared'
import { supabase } from '../lib/supabase.js'
import { MCPRouter } from '../mcp/router.js'

export type SchemaMode = 'sync' | 'describe'

const mcpRouter = new MCPRouter()

interface RawView {
  id: string
  name: string
  contentUrl: string
  viewContentUrl: string
  workbookId: string
  workbookContentUrl: string
}

export class SchemaAgent {
  async run(
    input: string,
    context: AgentContext,
    mode: SchemaMode = 'describe'
  ): Promise<AgentResult & { data?: SchemaResult }> {
    if (mode === 'sync') return this.sync(context)
    return this.describe(input, context)
  }

  private async sync(context: AgentContext): Promise<AgentResult & { data?: SchemaResult }> {
    // 1. Fetch all views — workbookContentUrl is derived from contentUrl by list-views
    const viewsResult = await mcpRouter.call(
      'tableau-mcp',
      'list-views',
      { clientId: context.clientId },
      context
    )
    const { views } = viewsResult.data as { total: number; views: RawView[] }

    // 2. Group views by workbook
    const grouped = new Map<string, RawView[]>()
    for (const view of views) {
      const bucket = grouped.get(view.workbookId) ?? []
      bucket.push(view)
      grouped.set(view.workbookId, bucket)
    }

    // 3. Upsert one row per workbook into client_schemas
    const upserted: WorkbookSchema[] = []

    for (const [workbookId, wbViews] of grouped) {
      const workbookName = wbViews[0]?.workbookContentUrl ?? workbookId
      const workbookContentUrl = wbViews[0]?.workbookContentUrl ?? ''

      const schemaJson = {
        contentUrl: workbookContentUrl,
        views: wbViews.map((v) => ({
          id: v.id,
          name: v.name,
          viewContentUrl: v.viewContentUrl,
          contentUrl: v.contentUrl,
        })),
        // TODO: populate via Tableau Metadata API (GraphQL) for field-level filtering
        fields: [] as unknown[],
      }

      const { error } = await supabase.from('client_schemas').upsert(
        {
          client_id: context.clientId,
          workbook_id: workbookId,
          workbook_name: workbookName,
          schema_json: schemaJson,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,workbook_id' }
      )

      if (error) {
        return {
          success: false,
          agentName: 'SchemaAgent',
          errorMessage: `Failed to upsert schema for '${workbookName}': ${error.message}`,
        }
      }

      upserted.push({ workbookId, workbookName, fields: [] })
    }

    return {
      success: true,
      agentName: 'SchemaAgent',
      data: {
        workbooks: upserted,
        description: `Synced ${upserted.length} workbook(s) with ${views.length} total view(s) into Supabase.`,
      },
    }
  }

  private async describe(
    _input: string,
    _context: AgentContext
  ): Promise<AgentResult & { data?: SchemaResult }> {
    // TODO: Week 4 (describe mode)
    // 1. Load schema from Supabase client_schemas for context.clientId
    // 2. Call chat() from services/llm.ts to summarise in plain English
    // 3. Return friendly description of available workbooks and views
    throw new Error('SchemaAgent describe mode not yet implemented')
  }
}
