import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ClickUpClient } from "../clickup-client.js";

export function register(server: McpServer, client: ClickUpClient) {
  server.tool(
    "get_task_comments",
    "Get comments on a ClickUp task",
    {
      task_id: z.string().describe("The task ID (internal ID or custom ID like OPS-1234)"),
      team_id: z.string().optional().describe("Required when using custom task IDs (e.g. OPS-1234). The workspace/team ID."),
    },
    async ({ task_id, team_id }) => {
      try {
        const data = await client.getTaskComments(task_id, team_id);
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
