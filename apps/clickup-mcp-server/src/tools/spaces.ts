import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ClickUpClient } from "../clickup-client.js";

export function register(server: McpServer, client: ClickUpClient) {
  server.tool(
    "get_spaces",
    "List all spaces in a ClickUp workspace",
    {
      team_id: z.string().describe("The workspace (team) ID"),
    },
    async ({ team_id }) => {
      try {
        const data = await client.getSpaces(team_id);
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
