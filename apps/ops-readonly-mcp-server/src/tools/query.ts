import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OpsReadOnlyClient } from "../ops-client.js";

export function register(server: McpServer, client: OpsReadOnlyClient) {
  server.tool(
    "health",
    "Verify connectivity and auth against the Breeze Ops read-only GraphQL API. Returns an 'ok' string with a timestamp on success.",
    {},
    async () => {
      try {
        const result = await client.health();
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: !!result.errors,
        };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "graphql_query",
    "Execute an arbitrary GraphQL query against the Breeze Ops read-only API. Use this for any query — pass the query string and optional variables. The endpoint is read-only (no mutations). Prefer small, targeted queries that select only the fields you need.",
    {
      query: z
        .string()
        .describe("The GraphQL query string. Read-only — mutations will fail."),
      variables: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("GraphQL variables as a JSON object, keyed by variable name (without the leading $)."),
      operationName: z
        .string()
        .optional()
        .describe("Operation name when the document contains multiple operations."),
    },
    async ({ query, variables, operationName }) => {
      try {
        const result = await client.query(query, variables, operationName);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: !!result.errors,
        };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
