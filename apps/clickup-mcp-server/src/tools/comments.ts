import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ClickUpClient } from "../clickup-client.js";

export function register(server: McpServer, client: ClickUpClient) {
  server.tool(
    "get_task_comments",
    "Get comments on a ClickUp task",
    {
      task_id: z.string().describe("The task ID"),
    },
    async ({ task_id }) => {
      try {
        const data = await client.getTaskComments(task_id);
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
