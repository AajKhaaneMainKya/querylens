import type { AgentContext, OrchestratorResult } from '@querylens/shared'
import { QueryAgent } from './query-agent.js'
import { SchemaAgent } from './schema-agent.js'
import { ExportAgent } from './export-agent.js'

export class OrchestratorAgent {
  private queryAgent = new QueryAgent()
  private schemaAgent = new SchemaAgent()
  private exportAgent = new ExportAgent()

  async run(input: string, context: AgentContext): Promise<OrchestratorResult> {
    // TODO: Week 6
    // 1. Call chatWithTools() from services/llm.ts with classify_intent tool
    //    system message: role + client name + enabled MCPs
    //    user message: last 10 conversation messages + current query
    // 2. If intent === 'clarify': return clarifyQuestion directly, no agent call
    // 3. Route to this.queryAgent | this.schemaAgent | this.exportAgent
    // 4. Return OrchestratorResult with intent + agent data
    throw new Error('OrchestratorAgent not yet implemented')
  }
}
