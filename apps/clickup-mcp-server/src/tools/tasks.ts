import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ClickUpClient } from "../clickup-client.js";

export function register(server: McpServer, client: ClickUpClient) {
  server.tool(
    "get_tasks",
    "Get tasks in a ClickUp list (100 per page)",
    {
      list_id: z.string().describe("The list ID"),
      page: z.number().optional().describe("Page number (0-indexed, default 0)"),
      include_closed: z.boolean().optional().describe("Include closed tasks"),
      subtasks: z.boolean().optional().describe("Include subtasks"),
      statuses: z.array(z.string()).optional().describe("Filter by status names"),
      assignees: z.array(z.string()).optional().describe("Filter by assignee user IDs"),
    },
    async ({ list_id, page, include_closed, subtasks, statuses, assignees }) => {
      try {
        const data = await client.getTasks(list_id, {
          page,
          include_closed,
          subtasks,
          statuses,
          assignees,
        });
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

  server.tool(
    "search_tasks",
    "Search tasks across a ClickUp workspace with optional filters",
    {
      team_id: z.string().describe("The workspace (team) ID"),
      page: z.number().optional().describe("Page number (0-indexed)"),
      space_ids: z.array(z.string()).optional().describe("Filter to specific space IDs"),
      list_ids: z.array(z.string()).optional().describe("Filter to specific list IDs"),
      statuses: z.array(z.string()).optional().describe("Filter by status names"),
      assignees: z.array(z.string()).optional().describe("Filter by assignee user IDs"),
      tags: z.array(z.string()).optional().describe("Filter by tag names"),
    },
    async ({ team_id, page, space_ids, list_ids, statuses, assignees, tags }) => {
      try {
        const data = await client.searchTasks(team_id, {
          page,
          space_ids,
          list_ids,
          statuses,
          assignees,
          tags,
        });
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

  server.tool(
    "get_task",
    "Get full details for a single ClickUp task (includes subtasks and markdown description)",
    {
      task_id: z.string().describe("The task ID"),
    },
    async ({ task_id }) => {
      try {
        const data = await client.getTask(task_id);
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
