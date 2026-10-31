import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OpsReadOnlyClient } from "../ops-client.js";

const MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function resolveDate(input: string, anchor: Date = new Date()): Date {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === "now") return new Date(anchor.getTime());
  if (trimmed === "today") return startOfUtcDay(anchor);
  if (trimmed === "tomorrow") {
    const t = startOfUtcDay(anchor);
    t.setUTCDate(t.getUTCDate() + 1);
    return t;
  }
  if (trimmed === "yesterday") {
    const t = startOfUtcDay(anchor);
    t.setUTCDate(t.getUTCDate() - 1);
    return t;
  }
  const rel = trimmed.match(/^([+-])(\d+)([hdm])$/);
  if (rel) {
    const sign = rel[1] === "+" ? 1 : -1;
    const n = parseInt(rel[2], 10) * sign;
    const unit = rel[3];
    const t = new Date(anchor.getTime());
    if (unit === "h") t.setUTCHours(t.getUTCHours() + n);
    else if (unit === "d") t.setUTCDate(t.getUTCDate() + n);
    else if (unit === "m") t.setUTCMinutes(t.getUTCMinutes() + n);
    return t;
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `Could not parse date '${input}'. Use ISO-8601 (e.g. 2026-04-26T00:00:00Z), 'today', 'tomorrow', 'yesterday', 'now', or relative like '+24h', '-1d'.`
    );
  }
  return parsed;
}

function jsonToGraphqlLiteral(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[${v.map(jsonToGraphqlLiteral).join(", ")}]`;
  if (typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>).map(
      ([k, val]) => `${k}: ${jsonToGraphqlLiteral(val)}`
    );
    return `{ ${entries.join(", ")} }`;
  }
  throw new Error(`Cannot serialize ${typeof v} to GraphQL literal`);
}

export function register(server: McpServer, client: OpsReadOnlyClient) {
  server.tool(
    "flights",
    [
      "Day-of-operations convenience wrapper around the GraphQL `flights` query.",
      "Accepts relative dates ('today', 'tomorrow', 'now', '+24h', '-1d', etc.) or ISO-8601 strings, and enforces the 7-day window cap.",
      "You MUST provide a `selection` — the GraphQL field selection set, e.g. 'id flightNumber origin destination scheduledDepartureUtc status { code }'.",
      "Use `extraArgs` to pass any additional arguments accepted by the `flights` query (origin, destination, status, etc.) — they're rendered as GraphQL literals.",
      "If you need enum-valued args or a different field name, use `graphql_query` instead. Inspect the schema with `list_query_fields` / `describe_type` first if unsure.",
    ].join(" "),
    {
      startDate: z
        .string()
        .describe(
          "Inclusive start of the window. ISO-8601 UTC, or 'today' / 'tomorrow' / 'yesterday' / 'now' / relative ('+24h', '-2d')."
        ),
      endDate: z
        .string()
        .optional()
        .describe(
          "Exclusive end of the window. Same formats as startDate. Defaults to startDate + 1 day. Window must be <= 7 days."
        ),
      selection: z
        .string()
        .describe(
          "GraphQL field selection set for the flights query (no enclosing braces). Example: 'id flightNumber origin destination scheduledDepartureUtc status'."
        ),
      extraArgs: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Extra GraphQL args passed inline to the flights query, e.g. {\"origin\": \"PVD\"}. Strings are quoted; for enums, use graphql_query instead."
        ),
      fieldName: z
        .string()
        .optional()
        .describe(
          "Override the query field name. Defaults to 'flights'. Use list_query_fields to confirm the actual name in the schema."
        ),
    },
    async ({ startDate, endDate, selection, extraArgs, fieldName }) => {
      try {
        const anchor = new Date();
        const start = resolveDate(startDate, anchor);
        const end = endDate
          ? resolveDate(endDate, anchor)
          : new Date(start.getTime() + 24 * 60 * 60 * 1000);

        if (end.getTime() <= start.getTime()) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `endDate (${end.toISOString()}) must be after startDate (${start.toISOString()}).`,
              },
            ],
          };
        }
        if (end.getTime() - start.getTime() > MAX_WINDOW_MS) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Window is ${(end.getTime() - start.getTime()) / 86400000}d but the API caps at 7 days.`,
              },
            ],
          };
        }

        const startIso = start.toISOString();
        const endIso = end.toISOString();
        const args: Record<string, unknown> = {
          startDate: startIso,
          endDate: endIso,
          ...(extraArgs ?? {}),
        };
        const argString = Object.entries(args)
          .map(([k, v]) => `${k}: ${jsonToGraphqlLiteral(v)}`)
          .join(", ");

        const field = fieldName ?? "flights";
        const query = `query DayOfOpsFlights {\n  ${field}(${argString}) {\n    ${selection}\n  }\n}`;

        const result = await client.query(query);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { window: { startDate: startIso, endDate: endIso }, query, result },
                null,
                2
              ),
            },
          ],
          isError: !!result.errors,
        };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
