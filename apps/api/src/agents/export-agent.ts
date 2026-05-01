import type { AgentContext, AgentResult, ExportResult, ExportFormat } from '@querylens/shared'
import { MCPRouter } from '../mcp/router.js'
import { supabase } from '../lib/supabase.js'

const mcpRouter = new MCPRouter()

export interface ExportInput {
  viewUrl: string  // e.g. https://prod-in-a.online.tableau.com/views/Superstore/Overview
  format: ExportFormat
}

interface ExportToolData {
  buffer: string  // base64
  mimeType: string
  filename: string
}

interface StoredView {
  id: string
  viewContentUrl: string
}

interface StoredSchemaJson {
  contentUrl: string
  views: StoredView[]
}

export class ExportAgent {
  async run(
    input: ExportInput,
    context: AgentContext,
  ): Promise<AgentResult & { data?: ExportResult }> {
    const { viewUrl, format } = input

    // 1. Resolve viewId (LUID) from the view URL via client_schemas
    const viewId = await this.resolveViewId(viewUrl, context.clientId)
    if (!viewId) {
      return {
        success: false,
        agentName: 'ExportAgent',
        errorMessage: `Could not find view ID for URL: ${viewUrl}. Run a schema sync first.`,
      }
    }

    // 2. Call export-mcp to render the view
    const mcpResult = await mcpRouter.call(
      'export-mcp',
      `to-${format}`,
      { viewId },
      { clientId: context.clientId, agentName: 'ExportAgent', userId: context.userId },
    )

    const { buffer, mimeType, filename } = mcpResult.data as ExportToolData

    // 3. Upload to Supabase Storage (exports bucket)
    const storagePath = `${context.clientId}/${Date.now()}_${filename}`
    const fileBuffer = Buffer.from(buffer, 'base64')

    const { error: uploadError } = await supabase.storage
      .from('exports')
      .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false })

    if (uploadError) {
      return {
        success: false,
        agentName: 'ExportAgent',
        errorMessage: `Upload failed: ${uploadError.message}`,
      }
    }

    // 4. Create signed URL valid for 24 hours
    const SIGNED_URL_TTL = 24 * 60 * 60

    const { data: signedData, error: signError } = await supabase.storage
      .from('exports')
      .createSignedUrl(storagePath, SIGNED_URL_TTL)

    if (signError || !signedData) {
      return {
        success: false,
        agentName: 'ExportAgent',
        errorMessage: `Failed to create signed URL: ${signError?.message ?? 'unknown'}`,
      }
    }

    return {
      success: true,
      agentName: 'ExportAgent',
      data: {
        downloadUrl: signedData.signedUrl,
        format,
        expiresAt: new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString(),
      },
    }
  }

  private async resolveViewId(viewUrl: string, clientId: string): Promise<string | null> {
    // Parse https://...online.tableau.com/views/Superstore/Overview
    // → workbookSlug="Superstore", viewSlug="Overview"
    const match = viewUrl.match(/\/views\/([^/]+)\/([^/?#]+)/)
    if (!match) return null
    const [, workbookSlug, viewSlug] = match

    const { data: rows } = await supabase
      .from('client_schemas')
      .select('schema_json')
      .eq('client_id', clientId)

    if (!rows?.length) return null

    for (const row of rows) {
      const schema = row.schema_json as StoredSchemaJson
      if (schema.contentUrl !== workbookSlug) continue
      const view = schema.views.find((v) => v.viewContentUrl === viewSlug)
      if (view) return view.id
    }

    return null
  }
}
