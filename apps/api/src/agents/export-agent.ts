import type { AgentContext, AgentResult, ExportResult, ExportFormat } from '@querylens/shared'
import { MCPRouter } from '../mcp/router.js'

const mcpRouter = new MCPRouter()

export interface ExportInput {
  viewUrl: string
  format: ExportFormat
}

export class ExportAgent {
  async run(
    input: ExportInput,
    context: AgentContext
  ): Promise<AgentResult & { data?: ExportResult }> {
    // TODO: Week 7
    // 1. Call mcpRouter.call('export-mcp', `to-${input.format}`, { viewUrl }, context)
    // 2. Upload result blob to Supabase Storage
    // 3. Return signed download URL (expires in 1 hour)
    throw new Error('ExportAgent not yet implemented')
  }
}
