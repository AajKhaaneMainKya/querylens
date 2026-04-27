import type { MCPName, MCPToolResult, MCPCallLog, AgentName } from '@querylens/shared'
import { MCPRegistry } from './registry.js'

export interface MCPCallContext {
  clientId: string
  agentName: AgentName
  userId?: string
}

export class MCPNotEnabledError extends Error {
  constructor(clientId: string, mcpName: string) {
    super(`MCP '${mcpName}' is not enabled for client '${clientId}'`)
    this.name = 'MCPNotEnabledError'
  }
}

export class MCPRouter {
  async call(
    mcpName: MCPName,
    toolName: string,
    input: object,
    context: MCPCallContext
  ): Promise<MCPToolResult> {
    // TODO: Week 3–6
    // 1. Look up server URL: MCPRegistry[mcpName]
    // 2. Check client has this MCP enabled in Supabase client_mcps — throw MCPNotEnabledError if not
    // 3. Call MCP server via @anthropic-ai/sdk MCP client
    // 4. Call this.logCall() — always, on success AND failure (billing foundation)
    // 5. Return typed MCPToolResult or throw typed error
    throw new Error('MCPRouter.call not yet implemented')
  }

  // IMPORTANT: Must always be called — even on failure. This is the billing foundation.
  private async logCall(_log: MCPCallLog): Promise<void> {
    // TODO: Week 3 — insert to mcp_call_logs via Supabase
  }
}
