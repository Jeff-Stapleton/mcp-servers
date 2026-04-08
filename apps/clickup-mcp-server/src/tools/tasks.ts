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
    "create_task",
    "Create a new task in a ClickUp list",
    {
      list_id: z.string().describe("The list ID to create the task in"),
      name: z.string().describe("Task name"),
      markdown_description: z.string().optional().describe("Task description in markdown"),
      parent: z.string().optional().describe("Parent task ID to create as a subtask"),
      points: z.number().optional().describe("Story points"),
      status: z.string().optional().describe("Task status"),
      priority: z.number().optional().describe("Priority (1=urgent, 2=high, 3=normal, 4=low)"),
    },
    async ({ list_id, name, markdown_description, parent, points, status, priority }) => {
      try {
        const data = await client.createTask(list_id, {
          name,
          markdown_description,
          parent,
          points,
          status,
          priority,
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
    "update_task",
    "Update an existing ClickUp task",
    {
      task_id: z.string().describe("The task ID (internal ID or custom ID like OPS-1234)"),
      team_id: z.string().optional().describe("Required when using custom task IDs. The workspace/team ID."),
      name: z.string().optional().describe("New task name"),
      markdown_description: z.string().optional().describe("New description in markdown"),
      points: z.number().nullable().optional().describe("Story points (null to clear)"),
      status: z.string().optional().describe("New status"),
      priority: z.number().nullable().optional().describe("Priority (1=urgent, 2=high, 3=normal, 4=low, null to clear)"),
      parent: z.string().optional().describe("Parent task ID"),
    },
    async ({ task_id, team_id, name, markdown_description, points, status, priority, parent }) => {
      try {
        const opts: Record<string, unknown> = {};
        if (name !== undefined) opts.name = name;
        if (markdown_description !== undefined) opts.markdown_description = markdown_description;
        if (points !== undefined) opts.points = points;
        if (status !== undefined) opts.status = status;
        if (priority !== undefined) opts.priority = priority;
        if (parent !== undefined) opts.parent = parent;
        const data = await client.updateTask(task_id, opts, team_id);
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
      task_id: z.string().describe("The task ID (internal ID or custom ID like OPS-1234)"),
      team_id: z.string().optional().describe("Required when using custom task IDs (e.g. OPS-1234). The workspace/team ID."),
    },
    async ({ task_id, team_id }) => {
      try {
        const data = await client.getTask(task_id, team_id);
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
