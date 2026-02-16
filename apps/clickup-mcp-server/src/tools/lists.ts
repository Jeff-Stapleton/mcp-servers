import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ClickUpClient } from "../clickup-client.js";

export function register(server: McpServer, client: ClickUpClient) {
  server.tool(
    "get_lists",
    "Get lists in a folder or folderless lists in a space. Provide either folder_id or space_id.",
    {
      folder_id: z.string().optional().describe("Folder ID — returns lists in this folder"),
      space_id: z.string().optional().describe("Space ID — returns folderless lists in this space"),
    },
    async ({ folder_id, space_id }) => {
      try {
        if (!folder_id && !space_id) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: "Either folder_id or space_id must be provided",
              },
            ],
          };
        }
        const data = folder_id
          ? await client.getLists(folder_id)
          : await client.getFolderlessLists(space_id!);
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
