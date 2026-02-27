import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObserveClient } from "../observe-client.js";

export function register(server: McpServer, client: ObserveClient) {
  server.tool(
    "search_logs",
    "Search logs by keyword in a dataset. Constructs an OPAL query: filter contains(string(FIELDS), keyword). For advanced queries, use execute_opal_query directly.",
    {
      dataset_id: z.string().describe("Dataset ID to search logs in"),
      keyword: z.string().describe("Keyword to search for in log fields"),
      interval: z.string().optional().describe("Time window (e.g. '1h', '24h'). Defaults to '1h'."),
      limit: z.number().optional().describe("Max rows to return (default 100)"),
    },
    async ({ dataset_id, keyword, interval, limit }) => {
      try {
        const rowLimit = limit ?? 100;
        const timeInterval = interval ?? "1h";
        const pipeline = `filter contains(string(FIELDS), "${keyword}")\nlimit ${rowLimit}`;

        const queryBody = {
          query: {
            outputStage: "main",
            stages: [{
              stageID: "main",
              input: [{ inputName: "main", datasetId: dataset_id }],
              pipeline,
            }],
          },
        };

        const result = await client.exportQuery(queryBody, { interval: timeInterval });
        return { content: [{ type: "text", text: result.body }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "get_error_counts",
    "Count errors/warnings in a dataset grouped by a field (e.g. service, namespace). Constructs an OPAL query: filter severity in (...) | statsby count. For advanced queries, use execute_opal_query directly.",
    {
      dataset_id: z.string().describe("Dataset ID to query"),
      group_by: z.string().describe("Field to group error counts by (e.g. 'service', 'namespace', 'containerName')"),
      severity_levels: z.array(z.string()).optional().describe("Severity levels to include (default: ['error', 'warning', 'critical', 'fatal'])"),
      interval: z.string().optional().describe("Time window (e.g. '1h', '24h'). Defaults to '1h'."),
    },
    async ({ dataset_id, group_by, severity_levels, interval }) => {
      try {
        const levels = severity_levels ?? ["error", "warning", "critical", "fatal"];
        const timeInterval = interval ?? "1h";
        const severityList = levels.map((l) => `"${l}"`).join(", ");
        const pipeline = `filter severity in (${severityList})\nstatsby count:count(1), group_by(${group_by})`;

        const queryBody = {
          query: {
            outputStage: "main",
            stages: [{
              stageID: "main",
              input: [{ inputName: "main", datasetId: dataset_id }],
              pipeline,
            }],
          },
        };

        const result = await client.exportQuery(queryBody, { interval: timeInterval });
        return { content: [{ type: "text", text: result.body }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "get_recent_observations",
    "Get the most recent rows from a dataset, sorted by timestamp descending. For advanced queries, use execute_opal_query directly.",
    {
      dataset_id: z.string().describe("Dataset ID to get recent observations from"),
      limit: z.number().optional().describe("Number of rows to return (default 25)"),
      interval: z.string().optional().describe("Time window to look back (e.g. '1h', '24h'). Defaults to '1h'."),
    },
    async ({ dataset_id, limit, interval }) => {
      try {
        const rowLimit = limit ?? 25;
        const timeInterval = interval ?? "1h";
        const pipeline = `sort timestamp desc\nlimit ${rowLimit}`;

        const queryBody = {
          query: {
            outputStage: "main",
            stages: [{
              stageID: "main",
              input: [{ inputName: "main", datasetId: dataset_id }],
              pipeline,
            }],
          },
        };

        const result = await client.exportQuery(queryBody, { interval: timeInterval });
        return { content: [{ type: "text", text: result.body }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
