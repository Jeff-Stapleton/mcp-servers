import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DOClient } from "../do-client.js";

export function register(server: McpServer, client: DOClient) {
  server.tool(
    "create_app",
    "Create a new App Platform application. The spec object is passed directly to the DigitalOcean API - see DO docs for full spec format",
    {
      spec: z.record(z.string(), z.any()).describe("App spec object including name, region, services, static_sites, workers, etc. Validated server-side by DigitalOcean"),
    },
    async ({ spec }) => {
      try {
        const result = await client.createApp(spec);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "get_app",
    "Get details of a specific App Platform application",
    {
      app_id: z.string().describe("UUID of the application"),
    },
    async ({ app_id }) => {
      try {
        const result = await client.getApp(app_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "list_apps",
    "List all App Platform applications in the account",
    {
      page: z.number().optional().describe("Page number for pagination"),
      per_page: z.number().optional().describe("Number of results per page (max 200)"),
    },
    async (params) => {
      try {
        const result = await client.listApps(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "list_app_deployments",
    "List deployments for a specific App Platform application",
    {
      app_id: z.string().describe("UUID of the application"),
      page: z.number().optional().describe("Page number for pagination"),
      per_page: z.number().optional().describe("Number of results per page (max 200)"),
    },
    async ({ app_id, ...params }) => {
      try {
        const result = await client.listAppDeployments(app_id, params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
