// All shared TypeScript types for QueryLens.
// Both apps/api and apps/web import from here — never duplicate.

// ─── Client ───────────────────────────────────────────────────────────────────

export interface Client {
  id: string
  name: string
  subdomain: string
  planTier: 'pilot' | 'starter' | 'business' | 'enterprise'
  tableauServerUrl: string
  tableauSiteId: string
  tableauPatName: string
  createdAt: string
}

// ─── Agents ───────────────────────────────────────────────────────────────────

export type Intent = 'visualize' | 'export' | 'schema' | 'clarify'
export type AgentName = 'OrchestratorAgent' | 'QueryAgent' | 'SchemaAgent' | 'ExportAgent'

export interface AgentContext {
  clientId: string
  userId?: string
  conversationId: string
  sessionMessages: ConversationMessage[]
}

export interface AgentResult {
  success: boolean
  agentName: AgentName
  data?: unknown
  clarifyQuestion?: string
  errorMessage?: string
}

export interface OrchestratorResult extends AgentResult {
  agentName: 'OrchestratorAgent'
  intent: Intent
  data?: QueryResult | ExportResult | SchemaResult
}

// ─── QueryAgent ───────────────────────────────────────────────────────────────

export type FilterOperator =
  | 'eq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'contains'
  | 'between'
  | 'in'

export type ChartType = 'bar' | 'line' | 'scatter' | 'map' | 'table' | 'pie'

export interface TableauFilter {
  field: string
  operator: FilterOperator
  value: unknown
}

export interface TimeRange {
  start: string
  end: string
}

export interface SortSpec {
  field: string
  direction: 'asc' | 'desc'
}

export interface TableauFilterSpec {
  filters?: TableauFilter[]
  dimensions?: string[]
  measures?: string[]
  chartType: ChartType
  timeRange?: TimeRange
  sort?: SortSpec
  limit?: number
}

export interface QueryResult {
  chartUrl: string
  chartType: ChartType
  appliedFilters: TableauFilter[]
  clarifyQuestion?: string
}

// ─── ExportAgent ──────────────────────────────────────────────────────────────

export type ExportFormat = 'png' | 'pdf'

export interface ExportResult {
  downloadUrl: string
  format: ExportFormat
  expiresAt: string
}

// ─── SchemaAgent ──────────────────────────────────────────────────────────────

export interface SchemaField {
  name: string
  type: 'dimension' | 'measure'
  dataType: string
  description?: string
}

export interface WorkbookSchema {
  workbookId: string
  workbookName: string
  fields: SchemaField[]
}

export interface SchemaResult {
  workbooks: WorkbookSchema[]
  description: string
}

// ─── MCP ──────────────────────────────────────────────────────────────────────

export type MCPName = 'tableau-mcp' | 'export-mcp'

export interface MCPToolResult {
  success: boolean
  data: unknown
  durationMs: number
  inputTokens?: number
  outputTokens?: number
}

export interface MCPCallLog {
  clientId: string
  mcpName: MCPName
  toolName: string
  agentName: AgentName
  inputTokens?: number
  outputTokens?: number
  durationMs: number
  success: boolean
  errorMessage?: string
}

// ─── Conversation ─────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant'

export interface ConversationMessage {
  role: MessageRole
  content: string
  timestamp: string
  agent?: AgentName
}

export interface Conversation {
  id: string
  clientId: string
  userEmail?: string
  messages: ConversationMessage[]
  lastActiveAt: string
}

// ─── API request / response ───────────────────────────────────────────────────

export interface QueryRequest {
  query: string
  clientId: string
  userId?: string
  conversationId?: string
}

export interface QueryResponse {
  success: boolean
  result?: OrchestratorResult
  errorMessage?: string
  conversationId: string
}

export interface SchemaSyncRequest {
  clientId: string
}

export interface SchemaSyncResponse {
  success: boolean
  workbooksIngested: number
  errorMessage?: string
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export interface WaitlistEntry {
  email: string
  company: string
  isTableauUser: boolean
  source?: string
}
