import type { MCPName, MCPToolResult, MCPCallLog, AgentName, TableauCreds } from '@querylens/shared'
import { MCPRegistry } from './registry.js'
import { supabase } from '../lib/supabase.js'

export interface MCPCallContext {
  clientId: string
  agentName: AgentName
  userId?: string
  tableauCreds?: TableauCreds
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
    context: MCPCallContext,
  ): Promise<MCPToolResult> {
    const start = Date.now()
    const serverUrl = MCPRegistry[mcpName]

    // Check client has this MCP enabled
    const { data: mcpRow } = await supabase
      .from('client_mcps')
      .select('enabled')
      .eq('client_id', context.clientId)
      .eq('mcp_name', mcpName)
      .single()

    if (!mcpRow?.enabled) {
      throw new MCPNotEnabledError(context.clientId, mcpName)
    }

    let success = false
    let errorMessage: string | undefined

    try {
      let response: Response
      try {
        response = await fetch(`${serverUrl}/call`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(context.tableauCreds ? {
              'x-tableau-url': context.tableauCreds.serverUrl,
              'x-tableau-site-id': context.tableauCreds.siteId,
              'x-tableau-token': context.tableauCreds.token,
            } : {}),
          },
          body: JSON.stringify({ tool: toolName, input }),
        })
      } catch (err) {
        throw new Error(`MCP server '${mcpName}' unreachable at ${serverUrl}: ${String(err)}`)
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(
          `MCP call '${toolName}' on '${mcpName}' failed (${response.status}): ${text}`,
        )
      }

      const result = (await response.json()) as MCPToolResult
      success = true
      return { ...result, durationMs: Date.now() - start }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      // Always log — this is the billing foundation
      void this.logCall({
        clientId: context.clientId,
        mcpName,
        toolName,
        agentName: context.agentName,
        durationMs: Date.now() - start,
        success,
        errorMessage,
      })
    }
  }

  private async logCall(log: MCPCallLog): Promise<void> {
    const { error } = await supabase.from('mcp_call_logs').insert({
      client_id: log.clientId,
      mcp_name: log.mcpName,
      tool_name: log.toolName,
      agent_name: log.agentName,
      input_tokens: log.inputTokens ?? null,
      output_tokens: log.outputTokens ?? null,
      duration_ms: log.durationMs,
      success: log.success,
      error_message: log.errorMessage ?? null,
    })
    if (error) {
      console.warn('[MCPRouter] Failed to write call log:', error.message)
    }
  }
}
