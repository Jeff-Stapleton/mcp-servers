import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObserveClient } from "../observe-client.js";

export function register(server: McpServer, client: ObserveClient) {
  server.tool(
    "list_monitors",
    "List monitors in Observe with optional name filter",
    {
      nameExact: z.string().optional().describe("Exact monitor name to match"),
      nameSubstring: z.string().optional().describe("Substring to match in monitor name"),
    },
    async (params) => {
      try {
        const result = await client.listMonitors(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "get_monitor",
    "Get full details of a monitor by ID, including definition and action rules",
    {
      monitor_id: z.string().describe("The monitor ID"),
    },
    async ({ monitor_id }) => {
      try {
        const result = await client.getMonitor(monitor_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "create_monitor",
    "Create a new monitor with rules and actions. The definition object is passed through to the Observe API which validates the full schema.",
    {
      name: z.string().describe("Name for the monitor"),
      ruleKind: z.enum(["Count", "Promote", "Threshold"]).describe("Type of monitor rule"),
      definition: z.record(z.string(), z.any()).describe("Monitor definition including inputQuery, rules, lookbackTime, etc. Passed through to the API."),
      actionRules: z.array(z.record(z.string(), z.any())).optional().describe("Action rules to bind to the monitor (notifications, webhooks, etc.)"),
    },
    async ({ name, ruleKind, definition, actionRules }) => {
      try {
        const body: Record<string, unknown> = { name, ruleKind, definition };
        if (actionRules) body.actionRules = actionRules;
        const result = await client.createMonitor(body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "update_monitor",
    "Update an existing monitor by ID. Sends a partial update (PATCH) with only the fields provided.",
    {
      monitor_id: z.string().describe("The monitor ID to update"),
      updates: z.record(z.string(), z.any()).describe("Fields to update (e.g. name, definition, actionRules). Passed through to the API."),
    },
    async ({ monitor_id, updates }) => {
      try {
        const result = await client.updateMonitor(monitor_id, updates);
        if (result === null) {
          return { content: [{ type: "text", text: "Monitor updated successfully." }] };
        }
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "delete_monitor",
    "Delete a monitor by ID",
    {
      monitor_id: z.string().describe("The monitor ID to delete"),
    },
    async ({ monitor_id }) => {
      try {
        await client.deleteMonitor(monitor_id);
        return { content: [{ type: "text", text: "Monitor deleted successfully." }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
