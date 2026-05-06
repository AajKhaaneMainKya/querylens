# QueryLens — Claude Code Project Instructions

> This file is the single source of truth for this project.
> Read it fully at the start of every session before touching any code.

---

## What This Product Is

**QueryLens** is a B2B SaaS platform that puts a natural language intelligence layer on top of Tableau — and, in future phases, any data tool.

A business user (CFO, VP Sales, Marketing Head) types a plain English question.
An **Orchestrator Agent** receives it, routes it to the right **Specialist Agent**, which calls the right **MCP tool**, and returns the correct chart, insight, or action.

No Tableau knowledge required. No analyst needed. No clicking.

**The core loop (Phase 1):**
```
User query
  → OrchestratorAgent (intent classification + routing)
    → QueryAgent     (NLP → Tableau filters → chart)
    → SchemaAgent    (workbook metadata, "what data do you have?")
    → ExportAgent    (PNG/PDF download)
  → MCPRouter        (single gateway — logs every call for future billing)
    → tableau-mcp    (apply filters, get view, embed workbook)
    → export-mcp     (render PNG/PDF)
  → Result returned to user
```

**The platform play (Phase 2+):**
QueryLens becomes a marketplace. Third parties publish MCP servers (CRM, ERP, custom data sources). Clients activate MCPs from the marketplace. You charge per MCP call at the API layer — metered billing via Stripe.

---

## Architecture: Multi-Agent + MCP

### Agent Roles

| Agent | File | Responsibility |
|---|---|---|
| `OrchestratorAgent` | `agents/orchestrator.ts` | Receives every query. Classifies intent. Routes to specialist agents. Manages conversation state. |
| `QueryAgent` | `agents/query-agent.ts` | NLP → Tableau filter JSON. Calls tableau-mcp. Returns chart. |
| `SchemaAgent` | `agents/schema-agent.ts` | Ingests and caches Tableau workbook metadata per client. |
| `ExportAgent` | `agents/export-agent.ts` | PNG/PDF export via export-mcp. Returns signed download URL. |
| `ReportAgent` | `agents/report-agent.ts` | // Phase 2: scheduled reports via email/Slack |
| `AlertAgent` | `agents/alert-agent.ts` | // Phase 2: threshold monitoring, anomaly detection |

**Rules:**
- Agents never call each other directly — only the Orchestrator routes between them.
- Agents never call external APIs directly — only through MCPRouter.
- Each agent is a TypeScript class with a single `run(input, context): Promise<AgentResult>` method.

### MCP Servers

| MCP Name | Purpose | Phase |
|---|---|---|
| `tableau-mcp` | Apply filters, fetch views, embed workbooks | Phase 1 — included in plan |
| `export-mcp` | Render PNG/PDF from Tableau view | Phase 1 — included in plan |
| `slack-mcp` | Post charts to Slack channels | Phase 2 — charged per call |
| `sheets-mcp` | Write results to Google Sheets | Phase 2 — charged per call |
| `salesforce-mcp` | Pull CRM context to enrich queries | Phase 2 — charged per call |
| `powerbi-mcp` | Connect to Power BI datasets | Phase 3 — charged per call |

### MCPRouter — the billing foundation

The `MCPRouter` is the single gateway for all MCP calls. Every agent goes through it. It:

1. Authenticates the client
2. Checks the client's enabled MCPs (`client_mcps` table)
3. Calls the MCP server via `@anthropic-ai/mcp` SDK
4. **Logs every call to `mcp_call_logs`** — clientId, mcpName, toolName, tokens, duration, success
5. Returns the result to the calling agent

This log table is the foundation for Phase 2 usage billing. Build it right from day one.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| API server (agent runtime) | Node.js + Express |
| Agent + NLP | Anthropic Claude API `claude-sonnet-4-6` with `tool_use` |
| MCP runtime | `@anthropic-ai/mcp` SDK |
| Tableau integration | Tableau REST API + Embedding API v3 (via tableau-mcp) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (magic link for pilots) |
| Hosting | Vercel (frontend) + Railway (API + MCP servers) |
| Monorepo | Turborepo |

---

## Repo Structure

```
querylens/
├── CLAUDE.md
├── turbo.json
├── package.json
├── apps/
│   ├── web/                              ← Next.js frontend
│   │   ├── app/
│   │   │   ├── page.tsx                  ← waitlist landing page
│   │   │   ├── chat/page.tsx             ← chat UI for pilot clients
│   │   │   └── api/waitlist/route.ts     ← waitlist form handler
│   │   └── components/
│   │       ├── WaitlistForm.tsx
│   │       ├── ChatInterface.tsx
│   │       └── ChartDisplay.tsx
│   │
│   └── api/                              ← Express API + agent runtime
│       └── src/
│           ├── index.ts                  ← server entry point
│           ├── routes/
│           │   ├── query.ts              ← POST /query → OrchestratorAgent
│           │   └── schema.ts             ← POST /schema/sync → SchemaAgent
│           ├── agents/
│           │   ├── orchestrator.ts       ← OrchestratorAgent
│           │   ├── query-agent.ts        ← QueryAgent
│           │   ├── schema-agent.ts       ← SchemaAgent
│           │   └── export-agent.ts       ← ExportAgent
│           ├── mcp/
│           │   ├── router.ts             ← MCPRouter (all MCP calls go here)
│           │   ├── registry.ts           ← maps MCP names to server URLs
│           │   └── servers/
│           │       ├── tableau/          ← tableau-mcp server
│           │       │   ├── index.ts
│           │       │   └── tools/
│           │       │       ├── apply-filters.ts
│           │       │       ├── get-view.ts
│           │       │       └── embed-workbook.ts
│           │       └── export/           ← export-mcp server
│           │           ├── index.ts
│           │           └── tools/
│           │               ├── to-png.ts
│           │               └── to-pdf.ts
│           └── middleware/auth.ts
│
└── packages/
    └── shared/
        └── types.ts                      ← all shared TypeScript types
```

---

## Agent Implementation Guide

### OrchestratorAgent (`agents/orchestrator.ts`)

Every user query hits this agent first. It classifies intent using Claude `tool_use`, routes to the correct specialist agent, and returns the result.

```typescript
// Intent classification tool for Claude:
const classifyIntentTool = {
  name: 'classify_intent',
  input_schema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        enum: ['visualize', 'export', 'schema', 'clarify'],
        description:
          'visualize=wants a chart | export=wants to download | schema=asks what data exists | clarify=too vague to route'
      },
      target_agent: {
        type: 'string',
        enum: ['QueryAgent', 'ExportAgent', 'SchemaAgent', null],
        description: 'null only when intent is clarify'
      },
      clarify_question: {
        type: 'string',
        description: 'Only set when intent is clarify. One concise question.'
      }
    },
    required: ['intent']
  }
}

// Orchestrator system prompt:
// Role + client context (name, enabled MCPs) [CACHED]
// + last 10 conversation messages [NOT cached, changes per turn]
// → call classify_intent tool
// → if clarify: return clarify_question directly to user (no agent call)
// → else: call agent.run(input, context) and return result
```

### QueryAgent (`agents/query-agent.ts`)

Translates NLP to Tableau filter JSON using Claude `tool_use`, validates against schema, calls MCPRouter.

```typescript
// Filter builder tool for Claude:
const buildFiltersTool = {
  name: 'build_tableau_filters',
  input_schema: {
    type: 'object',
    properties: {
      filters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field:    { type: 'string' },
            operator: { type: 'string', enum: ['eq','gt','lt','gte','lte','contains','between','in'] },
            value:    {}
          },
          required: ['field', 'operator', 'value']
        }
      },
      dimensions:  { type: 'array', items: { type: 'string' } },
      measures:    { type: 'array', items: { type: 'string' } },
      chart_type:  { type: 'string', enum: ['bar','line','scatter','map','table','pie'] },
      time_range:  { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } },
      sort:        { type: 'object', properties: { field: { type: 'string' }, direction: { type: 'string', enum: ['asc','desc'] } } },
      limit:       { type: 'number' },
      clarify:     { type: 'string', description: 'Set only if field not in schema. Leave null otherwise.' }
    },
    required: ['chart_type']
  }
}

// QueryAgent system prompt:
// Role + CLIENT SCHEMA (schema_json from Supabase) [CACHED — mark for prompt caching]
// + last 10 conversation messages [NOT cached]
// → call build_tableau_filters tool
// → validate: every filter.field must exist in schema_json — reject if not
// → call MCPRouter.call('tableau-mcp', 'apply-filters', { clientId, filters, dimensions, measures })
// → return { chartUrl, chartType, appliedFilters, clarifyQuestion? }
```

### SchemaAgent (`agents/schema-agent.ts`)

```typescript
// Two modes:
//
// Mode 1 — SYNC (called during onboarding or nightly cron):
//   1. Auth against Tableau REST API using client PAT
//   2. Fetch all workbooks → datasources → dimensions, measures, filter fields
//   3. Upsert into Supabase client_schemas
//
// Mode 2 — DESCRIBE (called when user asks "what data do you have?"):
//   1. Load schema from Supabase
//   2. Call Claude to summarise it in plain English
//   3. Return a friendly description of available workbooks and fields
```

### ExportAgent (`agents/export-agent.ts`)

```typescript
// 1. Receive: { clientId, viewUrl, format: 'png' | 'pdf' }
// 2. Call MCPRouter.call('export-mcp', `to-${format}`, { viewUrl })
// 3. Upload result to Supabase Storage
// 4. Return signed download URL (expires in 1 hour)
```

---

## MCPRouter (`mcp/router.ts`)

```typescript
class MCPRouter {
  async call(
    mcpName: string,     // 'tableau-mcp' | 'export-mcp' | ...
    toolName: string,    // 'apply-filters' | 'to-png' | ...
    input: object,
    context: { clientId: string; agentName: string; userId?: string }
  ): Promise<MCPToolResult> {
    // 1. Look up server URL from MCPRegistry
    // 2. Check client has this MCP enabled in client_mcps table — throw MCPNotEnabledError if not
    // 3. Call MCP server using @anthropic-ai/mcp SDK
    // 4. Log to mcp_call_logs (always — success or failure):
    //    { clientId, mcpName, toolName, agentName, inputTokens, outputTokens, durationMs, success, errorMessage }
    // 5. Return typed result or throw typed MCPError
  }
}
```

---

## Supabase Schema (Full)

Run in this order:

```sql
-- Clients
create table clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  subdomain text not null unique,
  plan_tier text not null default 'pilot',  -- 'pilot' | 'starter' | 'business' | 'enterprise'
  tableau_server_url text not null,
  tableau_site_id text not null,
  tableau_pat_name text not null,
  tableau_pat_secret text not null,         -- encrypt via Supabase Vault
  created_at timestamp with time zone default now()
);

-- Waitlist
create table waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  company text not null,
  is_tableau_user boolean default false,
  source text default 'organic',
  created_at timestamp with time zone default now()
);

-- Cached Tableau schemas per client
create table client_schemas (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  workbook_id text not null,
  workbook_name text not null,
  schema_json jsonb not null,
  last_synced_at timestamp with time zone default now(),
  unique(client_id, workbook_id)
);

-- Which MCPs each client has enabled
create table client_mcps (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  mcp_name text not null,
  enabled boolean default true,
  config_json jsonb,                        -- MCP-specific config (e.g. Slack workspace token)
  enabled_at timestamp with time zone default now(),
  unique(client_id, mcp_name)
);

-- MCP call log — foundation for usage-based billing
create table mcp_call_logs (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  mcp_name text not null,
  tool_name text not null,
  agent_name text not null,
  input_tokens integer,
  output_tokens integer,
  duration_ms integer,
  success boolean default true,
  error_message text,
  billed boolean default false,             -- Phase 2: true once invoiced via Stripe
  created_at timestamp with time zone default now()
);

-- Query log — one row per user query, links to MCP calls
create table query_logs (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  user_email text,
  raw_query text not null,
  intent text,                              -- classified by OrchestratorAgent
  agent_used text,                          -- which agent handled it
  mcp_calls_count integer default 0,
  parsed_filters jsonb,
  chart_type text,
  response_time_ms integer,
  success boolean default true,
  error_message text,
  created_at timestamp with time zone default now()
);

-- Conversation history per session
create table conversations (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  user_email text,
  messages jsonb not null default '[]',    -- [{ role, content, timestamp, agent? }]
  last_active_at timestamp with time zone default now()
);
```

---

## Environment Variables

**`apps/web/.env.local`**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**`apps/api/.env`**
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
TABLEAU_MCP_URL=http://localhost:3002
EXPORT_MCP_URL=http://localhost:3003
PORT=3001
```

**`apps/api/src/mcp/servers/tableau/.env`**
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
PORT=3002
```

**`apps/api/src/mcp/servers/export/.env`**
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
PORT=3003
```

---

## Key Conventions

- **TypeScript everywhere.** No plain JS.
- **Shared types in `packages/shared/types.ts`.** Never duplicate.
- **Agents never bypass MCPRouter.** If an agent needs external data, it calls `MCPRouter.call()`.
- **Agents never call each other.** Only OrchestratorAgent routes between agents.
- **Every MCP call is logged.** `mcp_call_logs` is non-negotiable. This is the billing foundation.
- **Prompt caching:** mark the schema section of QueryAgent's system prompt for caching. Only the user query and conversation history change per call.
- **No hardcoded client IDs.** All client config from Supabase.
- **User-facing errors must be plain English.** Never expose raw API or MCP errors.
- **Phase 2+ items go as comments** `// Phase 2: description` — never silently skip.

---

## Phase 1 Milestones

| Week | Goal | Done? |
|---|---|---|
| 1 | Turborepo set up, Supabase project + schema created, domain registered | [ ] |
| 2 | Waitlist page live on Vercel | [ ] |
| 3 | `tableau-mcp` server running locally with Tableau auth | [ ] |
| 4 | SchemaAgent: ingests 1 test workbook, stores in Supabase | [ ] |
| 5 | QueryAgent: NLP → filter JSON validated against schema | [ ] |
| 6 | OrchestratorAgent + MCPRouter wired: end-to-end query → chart | [ ] |
| 7 | ExportAgent + Chat UI working, all MCP calls logging to DB | [ ] |
| 8 | Pilot client 1 onboarded (real Tableau workbook) | [ ] |
| 9 | Pilot clients 2 & 3 onboarded | [ ] |
| 10 | First paid conversion / Phase 1 retro | [ ] |

---

## How to Work With Me (Claude Code Instructions)

**Start every session:** Read this file. Check the milestone table. Ask me which milestone we're on if unclear.

**Build commands:**
- `"build the waitlist page"` → `apps/web/app/page.tsx` + Supabase route handler + `waitlist` table SQL
- `"build the orchestrator"` → `agents/orchestrator.ts` + `classify_intent` tool
- `"build the query agent"` → `packages/shared/types.ts` first, then `agents/query-agent.ts`
- `"build the schema agent"` → `agents/schema-agent.ts` + Tableau REST API auth
- `"build the tableau MCP"` → `mcp/servers/tableau/index.ts` + tools in order: `apply-filters`, `get-view`, `embed-workbook`
- `"build the MCP router"` → `mcp/router.ts` + `mcp/registry.ts` — log every call
- `"wire it up"` → `routes/query.ts` → OrchestratorAgent → agents → MCPRouter
- `"build the chat UI"` → `ChatInterface.tsx` + `ChartDisplay.tsx` first, then `chat/page.tsx`
- `"build the export agent"` → `agents/export-agent.ts` + `mcp/servers/export/`

**Always:**
- Ask me for env variable values before writing connection code
- Show SQL before creating a new Supabase service
- Never bypass MCPRouter — flag it if you're tempted to
- Keep commits small: one agent, one MCP tool, or one route per commit

---

## Out of Scope for Phase 1

Do not build. Comment `// Phase 2:` or `// Phase 3:` if referenced:

- MCP marketplace / third-party MCP registration
- Stripe metered billing for MCP calls
- Slack MCP, Sheets MCP, Salesforce MCP, Power BI MCP
- ReportAgent (scheduled emails)
- AlertAgent (anomaly detection)
- Self-serve signup and billing
- On-premise / VPC deployment
- SSO / SAML
- Admin analytics dashboard
- Mobile app

---

## Future Monetisation Architecture (Reference — Do Not Build Yet)

> Included so Phase 1 architecture doesn't need rework later.

**Phase 2 — MCP Usage Billing:**
- `mcp_call_logs.billed` already in schema
- Add `price_per_call` to `client_mcps`
- Monthly cron: aggregate unbilled rows → create Stripe usage records → mark `billed = true`
- Client dashboard shows MCP call breakdown and projected invoice

**Phase 2 — MCP Marketplace:**
- Third parties register MCP servers via a developer API
- `MCPRegistry` moves from env vars to Supabase (editable, marketplace-ready)
- Clients browse + activate MCPs from a marketplace UI
- QueryLens takes revenue share on each MCP call routed through the platform

**Phase 3 — Bring Your Own MCP:**
- Enterprise clients self-host MCP servers (internal ERP, proprietary data)
- MCPRouter supports private MCP endpoints via mTLS
- QueryLens charges a platform fee per query rather than per MCP call

---

## Phase 2 Extension — Metabase Support

> Do not build yet. Architecture reference so Phase 1 code doesn't need rework.

### Architecture Additions

**New MCP server: `apps/api/src/mcp/servers/metabase/`**

Four tools, mirroring the Tableau MCP pattern:

| Tool | Endpoint | Description |
|---|---|---|
| `list-cards` | `GET /api/card` | Returns all saved questions: id, name, display type, dataset_query |
| `get-card` | `GET /api/card/{id}` | Full card metadata incl. result_metadata (field names + types) |
| `apply-filters` | `POST /api/card/{id}/query` | Accepts parameters array, returns query results as JSON |
| `get-image` | `GET /api/card/{id}/query/png` | Returns PNG buffer — same pattern as Tableau image endpoint |

**Metabase auth** is simpler than Tableau PAT — two options:
- Session token: `POST /api/session` with `{ email, password }` → returns `{ id: token }`
- Static API key: generated in Metabase Settings → API Keys (preferred for production)
- All requests use header: `X-Metabase-Session: <token>`

**`MetabaseSchemaAgent`** — syncs card metadata into `client_schemas` with `tool: 'metabase'` flag to distinguish from Tableau schemas. Same upsert pattern as `SchemaAgent`.

**`MCPRegistry`** — add `metabase-mcp` entry pointing to `METABASE_MCP_URL` env var.

---

### Frontend Additions

**`TableauConnect.tsx` → rename to `BIConnect.tsx`**

- Add a toggle at the top: **Tableau** | **Metabase**
- Tableau selected (current): Server URL, Site ID, Username, Password, Email
- Metabase selected (new): Metabase server URL + API token only — no site ID, no username/password
- `TableauSession` → `BISession`, add field `biTool: 'tableau' | 'metabase'`
- `onConnect` callback signature unchanged — still passes `(session, credentials)`

---

### Agent Changes

- **`AgentContext`** — add `biTool: 'tableau' | 'metabase'` (sourced from session, passed by route handlers via header `x-bi-tool`)
- **`OrchestratorAgent`** — passes `biTool` through to specialist agents unchanged
- **`QueryAgent`** — checks `context.biTool`: calls `metabase-mcp` if Metabase, `tableau-mcp` if Tableau
- **`ExportAgent`** — same routing pattern: `get-image` tool on `metabase-mcp` vs `to-png` on `export-mcp`

---

### Database Additions

```sql
-- Add bi_tool column to clients
alter table clients add column bi_tool text not null default 'tableau';

-- Add bi_tool column to client_schemas
alter table client_schemas add column bi_tool text not null default 'tableau';

-- Enable metabase-mcp for Metabase clients
insert into client_mcps (client_id, mcp_name) values ('<client_id>', 'metabase-mcp');
```

---

### New Environment Variables

**`apps/api/src/mcp/servers/metabase/.env`**
```
METABASE_URL=
METABASE_API_TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
PORT=3004
```

**`apps/api/.env`** — add:
```
METABASE_MCP_URL=http://localhost:3004
```

---

### Phase 2 Build Order

1. Add `bi_tool` column to `client_schemas` and `clients` in Supabase
2. Build `metabase-mcp` server and test locally with a Metabase Cloud trial
3. Rename `TableauConnect.tsx` → `BIConnect.tsx`, add tool selector toggle
4. Add `biTool` to `AgentContext` and update `QueryAgent` + `ExportAgent` routing
5. Deploy `metabase-mcp` to Railway as a fourth service (alongside api, tableau-mcp, export-mcp)
6. Update marketing site copy to mention both Tableau and Metabase

---

*QueryLens · Phase 1 · Multi-Agent + MCP Architecture · Last updated April 2026*
