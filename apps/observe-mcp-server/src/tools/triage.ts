import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObserveClient } from "../observe-client.js";

interface DatasetColumn {
  name: string;
  type: string;
}

const SEARCHABLE_TYPES = new Set(["string", "object", "variant"]);
const SEVERITY_NAMES = ["severity", "severitytext", "level", "log_level", "loglevel"];

async function getDatasetColumns(client: ObserveClient, datasetId: string): Promise<DatasetColumn[]> {
  try {
    const result = await client.getDataset(datasetId) as {
      data?: { state?: { columns?: DatasetColumn[] } };
      state?: { columns?: DatasetColumn[] };
    };
    return result?.data?.state?.columns ?? result?.state?.columns ?? [];
  } catch {
    return [];
  }
}

function findSearchableColumns(columns: DatasetColumn[]): string[] {
  return columns
    .filter((c) => SEARCHABLE_TYPES.has(c.type))
    .map((c) => c.name);
}

function findTimestampColumn(columns: DatasetColumn[]): string {
  const tsCol = columns.find((c) => c.type === "timestamp");
  return tsCol?.name ?? "timestamp";
}

function findSeverityColumn(columns: DatasetColumn[]): string | null {
  for (const col of columns) {
    if (SEVERITY_NAMES.includes(col.name.toLowerCase())) {
      return col.name;
    }
  }
  return null;
}

function escapeOpalString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function register(server: McpServer, client: ObserveClient) {
  server.tool(
    "search_logs",
    "Search logs by keyword in a dataset. Fetches the dataset schema and searches across all text-compatible fields (string, object, variant). For advanced queries, use execute_opal_query directly.",
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
        const escapedKeyword = escapeOpalString(keyword);

        const columns = await getDatasetColumns(client, dataset_id);
        const searchCols = findSearchableColumns(columns);

        let filterExpr: string;
        if (searchCols.length > 0) {
          const conditions = searchCols.map(
            (col) => `contains(string(${col}), "${escapedKeyword}")`
          );
          filterExpr = conditions.join(" or ");
        } else {
          filterExpr = `contains(string(*), "${escapedKeyword}")`;
        }

        const pipeline = `filter ${filterExpr}\nlimit ${rowLimit}`;

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
    "Count errors/warnings in a dataset grouped by a field (e.g. service, namespace). Fetches the dataset schema to find the severity field automatically. For advanced queries, use execute_opal_query directly.",
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

        const columns = await getDatasetColumns(client, dataset_id);
        const severityCol = findSeverityColumn(columns);

        if (!severityCol) {
          const colNames = columns.map((c) => c.name).join(", ");
          return {
            isError: true,
            content: [{
              type: "text",
              text: `No severity field found in dataset. Available columns: [${colNames}]. Use execute_opal_query to write a custom filter.`,
            }],
          };
        }

        const severityList = levels.map((l) => `"${l}"`).join(", ");
        const pipeline = `filter ${severityCol} in (${severityList})\nstatsby count:count(1), group_by(${group_by})`;

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
    "Get the most recent rows from a dataset, sorted by timestamp descending. Automatically detects the timestamp column from the dataset schema. For advanced queries, use execute_opal_query directly.",
    {
      dataset_id: z.string().describe("Dataset ID to get recent observations from"),
      limit: z.number().optional().describe("Number of rows to return (default 25)"),
      interval: z.string().optional().describe("Time window to look back (e.g. '1h', '24h'). Defaults to '1h'."),
    },
    async ({ dataset_id, limit, interval }) => {
      try {
        const rowLimit = limit ?? 25;
        const timeInterval = interval ?? "1h";

        const columns = await getDatasetColumns(client, dataset_id);
        const tsCol = findTimestampColumn(columns);

        const pipeline = `sort ${tsCol} desc\nlimit ${rowLimit}`;

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
