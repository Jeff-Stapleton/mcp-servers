import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ClickUpClient } from "../clickup-client.js";

export function register(server: McpServer, client: ClickUpClient) {
  server.tool(
    "get_workspaces",
    "List all ClickUp workspaces accessible with the current API token",
    {},
    async () => {
      try {
        const data = await client.getWorkspaces();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    }
  );
}
