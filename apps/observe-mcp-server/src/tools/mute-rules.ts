import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObserveClient } from "../observe-client.js";

export function register(server: McpServer, client: ObserveClient) {
  server.tool(
    "list_mute_rules",
    "List monitor mute rules in Observe with optional name filter",
    {
      nameExact: z.string().optional().describe("Exact mute rule name to match"),
      nameSubstring: z.string().optional().describe("Substring to match in mute rule name"),
    },
    async (params) => {
      try {
        const result = await client.listMuteRules(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "get_mute_rule",
    "Get full details of a mute rule by ID",
    {
      mute_rule_id: z.string().describe("The mute rule ID"),
    },
    async ({ mute_rule_id }) => {
      try {
        const result = await client.getMuteRule(mute_rule_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "create_mute_rule",
    "Create a mute rule to silence monitor alerts. Requires a name and schedule. Optionally associate with a specific monitor and add criteria conditions.",
    {
      name: z.string().describe("Name for the mute rule"),
      schedule: z.object({
        type: z.literal("OneTime").describe("Schedule type (currently only 'OneTime' is supported)"),
        oneTime: z.object({
          startTime: z.string().describe("Start time for the mute window (RFC 3339 format)"),
          endTime: z.string().optional().describe("End time for the mute window (RFC 3339 format)"),
        }).describe("One-time schedule configuration"),
      }).describe("Schedule defining when the mute rule is active"),
      monitorID: z.string().optional().describe("Monitor ID to associate with this mute rule (omit for global mute)"),
      criteria: z.record(z.string(), z.any()).optional().describe("Criteria expression for conditional muting. Passed through to the API."),
    },
    async ({ name, schedule, monitorID, criteria }) => {
      try {
        const body: Record<string, unknown> = { name, schedule };
        if (monitorID) body.monitorID = monitorID;
        if (criteria) body.criteria = criteria;
        const result = await client.createMuteRule(body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "delete_mute_rule",
    "Delete a mute rule by ID",
    {
      mute_rule_id: z.string().describe("The mute rule ID to delete"),
    },
    async ({ mute_rule_id }) => {
      try {
        await client.deleteMuteRule(mute_rule_id);
        return { content: [{ type: "text", text: "Mute rule deleted successfully." }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
