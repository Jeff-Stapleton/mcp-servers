import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DOClient } from "../do-client.js";

export function register(server: McpServer, client: DOClient) {
  server.tool(
    "create_database",
    "Create a new managed database cluster",
    {
      name: z.string().describe("Name for the database cluster"),
      engine: z.enum(["pg", "mysql", "redis", "mongodb", "kafka", "opensearch"])
        .describe("Database engine type"),
      version: z.string().describe("Engine version (e.g. '16' for PostgreSQL 16)"),
      region: z.string().describe("Slug of the region to deploy in"),
      size: z.string().describe("Slug of the database size (e.g. db-s-1vcpu-1gb)"),
      num_nodes: z.number().describe("Number of nodes in the cluster (1 for single, 3 for HA)"),
      tags: z.array(z.string()).optional().describe("Tags to apply to the database cluster"),
    },
    async (params) => {
      try {
        const result = await client.createDatabase(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "get_database",
    "Get details of a specific managed database cluster",
    {
      database_id: z.string().describe("UUID of the database cluster"),
    },
    async ({ database_id }) => {
      try {
        const result = await client.getDatabase(database_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "list_databases",
    "List all managed database clusters in the account",
    {
      page: z.number().optional().describe("Page number for pagination"),
      per_page: z.number().optional().describe("Number of results per page (max 200)"),
    },
    async (params) => {
      try {
        const result = await client.listDatabases(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "list_database_options",
    "List available database engines, versions, and sizes",
    {},
    async () => {
      try {
        const result = await client.listDatabaseOptions();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
