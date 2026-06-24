# Connector Contract — shared org substrate (v1 ↔ v2.1 ↔ any Courtana app)

**Status:** canonical. This is the single source of truth for how any Courtana app
(VibeCo v1, VibeCo v2.1, future Lovable apps) publishes connector state and sync
activity into the **shared Supabase project** (`ulgoahsxkrkzoquvntei`) that the
Courtana MCP server points at. No copy-paste, no per-app forks — everyone reads
and writes these exact shapes.

> Why this exists instead of a custom "handshake" skill: the MCP server is the
> live pipe, and these three tables are what it pipes. A contract doc is enough
> to keep both sides in sync; a bespoke skill would just duplicate this.

---

## The three shared tables

### 1. `org_decisions` — cross-project memory
Written by the MCP `save_decision` tool (and the in-app Hub "Record decision").
Read by `get_decisions` (filter) and `search_decisions` (semantic).

| column      | type           | notes |
|-------------|----------------|-------|
| id          | uuid           | pk |
| session_id  | text           | optional, who/what wrote it |
| project     | text           | e.g. `vibeco`, `vibeco-v2`, `pickle-daas` |
| category    | text           | `architecture` \| `design` \| `strategy` \| `pattern` \| `insight` |
| title       | text           | short |
| content     | text           | full rationale |
| embedding   | vector(1536)   | `text-embedding-3-small`; nullable (filter-only rows allowed) |
| created_at  | timestamptz    | |
| updated_at  | timestamptz    | |

Semantic search RPC: `match_decisions(query_embedding, match_count, filter_project, filter_category)`.

**RLS:** authenticated can read + insert; service_role full. (Org-internal, no anon.)

### 2. `connector_registry` — what connectors exist + their state
The canonical list both v1 and v2 read to know "what's wired and how."

| column       | type        | notes |
|--------------|-------------|-------|
| id           | uuid        | pk |
| key          | text        | stable id: `firecrawl`, `perplexity_sonar`, `anthropic_web_search`, `reddit`, `hackernews` |
| display_name | text        | human label |
| project      | text        | owning app |
| status       | text        | `active` \| `dormant` \| `error` |
| auth_kind    | text        | `workspace` \| `secret` \| `keyless` |
| config       | jsonb       | **no secrets** — only `{ note }` / non-sensitive hints. Keys live server-side. |
| created_at   | timestamptz | |
| updated_at   | timestamptz | |

**RLS:** **admin read only** + service_role write. (Hardened — `config`/`auth_kind`
are infra metadata.) The Hub's Connectors tab is admin-gated to match.

### 3. `connector_sync_events` — append-only sync log
Every app writes one row **after each connector run** (service role).

| column          | type        | notes |
|-----------------|-------------|-------|
| id              | uuid        | pk |
| connector_key   | text        | matches `connector_registry.key` |
| project         | text        | which app ran it |
| status          | text        | `ok` \| `error` \| `partial` |
| items_collected | int         | rows/items pulled |
| message         | text        | optional detail / error |
| created_at      | timestamptz | |

**RLS:** **admin read only** + service_role write.

---

## The rule every app follows

After any connector run, append a `connector_sync_events` row using the
**service role** (edge function / backend only — never the browser):

```ts
await admin.from("connector_sync_events").insert({
  connector_key: "firecrawl",
  project: "vibeco-v2",      // your app id
  status: "ok",              // ok | error | partial
  items_collected: count,
  message: null,
});
```

v1's `signal-collect` already does this — it's the reference implementation.
v2.1 follows the same shape. The Hub's Connectors tab renders these rows as the
live sync timeline.

---

## MCP wiring notes

- The Courtana MCP server (`courtana-mcp-server`) is the live pipe over these
  tables: `save_decision` / `get_decisions` / `search_decisions` (memory),
  `get_project_registry` / `get_project_context` (knowledge),
  `invoke_vibeco_agent` (agents), `get_mcp_insights` / `analyze_mcp_usage`
  (self-improvement → `mcp_improvement_log`).
- **Semantic search needs a real `OPENAI_API_KEY`** in your *local* Claude MCP
  config (`.mcp.json` → `courtana.env.OPENAI_API_KEY`). That key is pasted into
  your machine's MCP config, **not** stored as an app secret. Without it,
  `save_decision`/`search_decisions` fall back to filter-only behavior.
- All these tables live in the shared project, so changes must stay **additive
  and org-generic** — never destructive — so v2 reuses them verbatim.
