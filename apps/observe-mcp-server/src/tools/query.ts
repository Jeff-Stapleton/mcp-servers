import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObserveClient } from "../observe-client.js";

export function register(server: McpServer, client: ObserveClient) {
  server.tool(
    "execute_opal_query",
    "Execute a raw OPAL query against Observe datasets. Returns NDJSON (one JSON object per line). Use paginate=true for large result sets, then call get_query_page to fetch pages.",
    {
      stages: z.array(z.object({
        stageID: z.string().describe("Unique identifier for this stage"),
        input: z.array(z.object({
          inputName: z.string().describe("Name for this input (e.g. 'main')"),
          datasetId: z.string().optional().describe("Dataset ID to query"),
          datasetPath: z.string().optional().describe("Dataset path (e.g. 'Workspace.aws/RDS Cluster')"),
          inputRole: z.string().optional().describe("Role of input: 'Data' or 'Reference'"),
        })).describe("Input datasets for this stage"),
        pipeline: z.string().describe("OPAL pipeline expression"),
      })).describe("Query stages defining inputs and OPAL pipelines"),
      outputStage: z.string().describe("Stage ID to output results from"),
      startTime: z.string().optional().describe("Start of time window (ISO 8601, e.g. 2024-01-01T00:00:00Z)"),
      endTime: z.string().optional().describe("End of time window (ISO 8601)"),
      interval: z.string().optional().describe("Time window length relative to now (e.g. '10m', '1h', '24h')"),
      rowCount: z.string().optional().describe("Max rows to return (default 100000, up to int64 max when paginated)"),
      paginate: z.boolean().optional().describe("Enable async paginated mode. Returns cursor info instead of data. Use get_query_page to fetch results."),
      stage: z.string().optional().describe("Override which stage to output from"),
    },
    async ({ stages, outputStage, startTime, endTime, interval, rowCount, paginate, stage }) => {
      try {
        const queryBody: Record<string, unknown> = {
          query: { outputStage, stages },
        };
        if (rowCount) queryBody.rowCount = rowCount;

        const result = await client.exportQuery(queryBody, {
          startTime,
          endTime,
          interval,
          stage,
          paginate,
        });

        if (result.status === 202) {
          const cursorId = result.headers.get("x-observe-cursor-id") ?? "";
          const nextPage = result.headers.get("x-observe-next-page") ?? "";
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "paginated",
                cursorId,
                nextPage,
                message: "Query accepted. Use get_query_page with the cursorId to fetch results.",
              }, null, 2),
            }],
          };
        }

        const partial = result.status === 206;
        const text = partial
          ? `[Partial results - dataset not fully accelerated for requested window]\n${result.body}`
          : result.body;
        return { content: [{ type: "text", text }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "get_query_page",
    "Fetch a page from a paginated OPAL query. Use the cursorId returned by execute_opal_query (with paginate=true). Uses long polling (up to 30s wait). Check for nextPage in response to continue pagination.",
    {
      cursorId: z.string().describe("Cursor ID from execute_opal_query response"),
      offset: z.string().optional().describe("Row offset into the result set"),
      numRows: z.string().optional().describe("Number of rows to return in this page"),
    },
    async (params) => {
      try {
        const result = await client.exportQueryPage(params);

        if (result.status === 202) {
          const nextPage = result.headers.get("x-observe-next-page") ?? "";
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                status: "in_progress",
                nextPage,
                message: "Query still executing. Retry this call to continue polling.",
              }, null, 2),
            }],
          };
        }

        const totalRows = result.headers.get("x-observe-total-rows") ?? "unknown";
        const nextPage = result.headers.get("x-observe-next-page");
        const header = `[Total rows: ${totalRows}${nextPage ? ` | Next page available` : " | No more pages"}]\n`;
        return { content: [{ type: "text", text: header + result.body }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "export_worksheet",
    "Export data from a saved Observe worksheet by ID. Returns NDJSON.",
    {
      worksheet_id: z.string().describe("The worksheet ID to export"),
      startTime: z.string().optional().describe("Start of time window (ISO 8601)"),
      endTime: z.string().optional().describe("End of time window (ISO 8601)"),
      interval: z.string().optional().describe("Time window length (e.g. '10m', '1h')"),
      stage: z.string().optional().describe("Which stage to get data from (defaults to last)"),
    },
    async ({ worksheet_id, startTime, endTime, interval, stage }) => {
      try {
        const result = await client.exportWorksheet(worksheet_id, {
          startTime,
          endTime,
          interval,
          stage,
        });
        return { content: [{ type: "text", text: result.body }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
