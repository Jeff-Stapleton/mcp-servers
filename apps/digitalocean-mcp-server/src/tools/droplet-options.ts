import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DOClient } from "../do-client.js";

export function register(server: McpServer, client: DOClient) {
  server.tool(
    "list_regions",
    "List all available DigitalOcean regions",
    {},
    async () => {
      try {
        const result = await client.listRegions();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "list_sizes",
    "List all available Droplet sizes",
    {},
    async () => {
      try {
        const result = await client.listSizes();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "list_images",
    "List available DigitalOcean images (OS, snapshots, backups, or custom)",
    {
      type: z.enum(["distribution", "application", "custom"]).optional()
        .describe("Filter images by type: distribution, application, or custom"),
    },
    async ({ type }) => {
      try {
        const result = await client.listImages(type ? { type } : undefined);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
