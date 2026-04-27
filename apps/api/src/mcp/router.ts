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
    const start = Date.now()
    const serverUrl = MCPRegistry[mcpName]

    // TODO: Week 6 — check client_mcps table, throw MCPNotEnabledError if not enabled
    // TODO: Week 6 — wrap in try/finally and always call this.logCall()

    let response: Response
    try {
      response = await fetch(`${serverUrl}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName, input }),
      })
    } catch (err) {
      throw new Error(`MCP server '${mcpName}' unreachable at ${serverUrl}: ${String(err)}`)
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`MCP call '${toolName}' on '${mcpName}' failed (${response.status}): ${text}`)
    }

    const result = (await response.json()) as MCPToolResult
    return { ...result, durationMs: Date.now() - start }
  }

  // IMPORTANT: Must always be called — even on failure. This is the billing foundation.
  // TODO: Week 6 — insert to mcp_call_logs via Supabase
  private async logCall(_log: MCPCallLog): Promise<void> {}
}
