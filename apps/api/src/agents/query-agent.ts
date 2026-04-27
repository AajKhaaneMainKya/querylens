import type { AgentContext, AgentResult, QueryResult } from '@querylens/shared'
import { MCPRouter } from '../mcp/router.js'

const mcpRouter = new MCPRouter()

export class QueryAgent {
  async run(input: string, context: AgentContext): Promise<AgentResult & { data?: QueryResult }> {
    // TODO: Week 5
    // 1. Call chatWithTools() from services/llm.ts with build_tableau_filters tool
    //    system message: role + client schema_json from Supabase
    //    user message: last 10 messages + current query
    // 2. Validate: every filter.field must exist in schema_json — return clarifyQuestion if not
    // 3. Call mcpRouter.call('tableau-mcp', 'apply-filters', { clientId, ...filterSpec }, context)
    // 4. Return { chartUrl, chartType, appliedFilters, clarifyQuestion? }
    throw new Error('QueryAgent not yet implemented')
  }
}
