import type { AgentContext, AgentResult, QueryResult, TableauFilter, ChartType } from '../lib/types.js'
import { chatWithTools } from '../services/llm.js'
import type { LLMTool } from '../services/llm.js'
import { supabase } from '../lib/supabase.js'
import { MCPRouter } from '../mcp/router.js'

const mcpRouter = new MCPRouter()

// ─── Schema types (as written by SchemaAgent) ─────────────────────────────────

interface StoredView {
  id: string
  name: string
  viewContentUrl: string
  contentUrl: string
}

interface SchemaField {
  name: string
  type: string
}

interface StoredSchemaJson {
  contentUrl: string
  views: StoredView[]
  fields: SchemaField[]
}

interface SchemaRow {
  workbook_id: string
  workbook_name: string
  schema_json: StoredSchemaJson
}

// ─── LLM tool result ──────────────────────────────────────────────────────────

interface FilterToolResult {
  workbook_content_url: string
  view_content_url: string
  filters?: Array<{ field: string; operator: string; value: unknown }>
  dimensions?: string[]
  measures?: string[]
  chart_type: ChartType
  time_range?: { start: string; end: string }
  clarify?: string
}

// ─── Tool definition ──────────────────────────────────────────────────────────

const buildFiltersTool: LLMTool = {
  name: 'build_tableau_filters',
  description:
    'Build Tableau filter parameters from a user query. Call this for every visualisation request.',
  parameters: {
    type: 'object',
    properties: {
      workbook_content_url: {
        type: 'string',
        description: "Workbook slug from the schema, e.g. 'Superstore'",
      },
      view_content_url: {
        type: 'string',
        description: "View slug from the schema, e.g. 'Overview'",
      },
      filters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', description: 'Tableau field name' },
            operator: {
              type: 'string',
              enum: ['eq', 'gt', 'lt', 'gte', 'lte', 'contains', 'between', 'in'],
            },
            value: { description: 'String, number, or array (for in/between)' },
          },
          required: ['field', 'operator', 'value'],
        },
      },
      dimensions: { type: 'array', items: { type: 'string' } },
      measures: { type: 'array', items: { type: 'string' } },
      chart_type: {
        type: 'string',
        enum: ['bar', 'line', 'scatter', 'map', 'table', 'pie'],
      },
      time_range: {
        type: 'object',
        properties: {
          start: { type: 'string', description: 'ISO date, e.g. 2023-01-01' },
          end: { type: 'string', description: 'ISO date, e.g. 2023-12-31' },
        },
      },
      clarify: {
        type: 'string',
        description: 'Only set if the query is too vague to answer. Leave absent otherwise.',
      },
    },
    required: ['workbook_content_url', 'view_content_url', 'chart_type'],
  },
}

// ─── Agent ────────────────────────────────────────────────────────────────────

export class QueryAgent {
  async run(input: string, context: AgentContext): Promise<AgentResult & { data?: QueryResult }> {
    // 1. Load client schema from Supabase
    const { data: rows, error: schemaErr } = await supabase
      .from('client_schemas')
      .select('workbook_id, workbook_name, schema_json')
      .eq('client_id', context.clientId)

    if (schemaErr || !rows?.length) {
      return {
        success: false,
        agentName: 'QueryAgent',
        errorMessage: 'No schema found for this client. Run schema sync first.',
      }
    }

    const schemaRows = rows as SchemaRow[]

    // 2. Build schema summary for the system prompt
    const schemaSummary = schemaRows
      .map((row) => {
        const views = row.schema_json.views.map((v) => `${v.name} (slug: "${v.viewContentUrl}")`).join(', ')
        const fields = row.schema_json.fields.length
          ? row.schema_json.fields.map((f) => `${f.name} (${f.type})`).join(', ')
          : 'common Superstore fields: Region, Category, Sub-Category, Segment, Ship Mode, Order Date, Sales, Profit, Quantity'
        return `Workbook: "${row.schema_json.contentUrl}"\n  Views: ${views}\n  Fields: ${fields}`
      })
      .join('\n\n')

    // 3. Call Mistral with build_tableau_filters tool
    const llmResponse = await chatWithTools(
      [
        {
          role: 'system',
          content:
            `You are a Tableau analyst. Given a user query, call build_tableau_filters with the right parameters.\n\n` +
            `Available schema:\n${schemaSummary}`,
        },
        {
          role: 'user',
          content: input,
        },
      ],
      [buildFiltersTool],
    )

    // 4. No tool call → ask for clarification
    if (!llmResponse.toolCalls.length) {
      return {
        success: true,
        agentName: 'QueryAgent',
        clarifyQuestion: llmResponse.content || 'Could you clarify what you would like to see?',
      }
    }

    const toolInput = llmResponse.toolCalls[0]!.input as unknown as FilterToolResult

    if (toolInput.clarify) {
      return { success: true, agentName: 'QueryAgent', clarifyQuestion: toolInput.clarify }
    }

    // 5. Validate filter fields against schema (skipped if schema has no fields yet)
    const targetSchema = schemaRows.find(
      (r) => r.schema_json.contentUrl === toolInput.workbook_content_url,
    )
    const knownFields = targetSchema?.schema_json.fields.map((f) => f.name) ?? []

    if (knownFields.length) {
      const unknown = (toolInput.filters ?? [])
        .map((f) => f.field)
        .filter((f) => !knownFields.includes(f))

      if (unknown.length) {
        return {
          success: true,
          agentName: 'QueryAgent',
          clarifyQuestion: `I don't recognise these fields in ${toolInput.workbook_content_url}: ${unknown.join(', ')}. Could you rephrase?`,
        }
      }
    }

    // 6. Call MCPRouter → tableau-mcp → apply-filters
    const filters: TableauFilter[] = (toolInput.filters ?? []).map((f) => ({
      field: f.field,
      operator: f.operator as TableauFilter['operator'],
      value: f.value,
    }))

    const mcpResult = await mcpRouter.call(
      'tableau-mcp',
      'apply-filters',
      {
        clientId: context.clientId,
        workbookContentUrl: toolInput.workbook_content_url,
        viewContentUrl: toolInput.view_content_url,
        filters,
        chartType: toolInput.chart_type,
        dimensions: toolInput.dimensions,
        measures: toolInput.measures,
      },
      { clientId: context.clientId, agentName: 'QueryAgent', userId: context.userId, tableauCreds: context.tableauCreds },
    )

    const { chartUrl, appliedFilters } = mcpResult.data as {
      chartUrl: string
      appliedFilters: TableauFilter[]
    }

    return {
      success: true,
      agentName: 'QueryAgent',
      data: { chartUrl, chartType: toolInput.chart_type, appliedFilters },
    }
  }
}
