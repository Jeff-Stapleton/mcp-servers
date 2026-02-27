import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ObserveClient } from "../observe-client.js";

export function register(server: McpServer, client: ObserveClient) {
  server.tool(
    "list_datasets",
    "List datasets in Observe, optionally filtered by workspace, name, type, or interface",
    {
      workspaceId: z.string().optional().describe("Only include datasets in this workspace ID"),
      match: z.string().optional().describe("Fuzzy match on dataset name"),
      name: z.string().optional().describe("Exact dataset name to match"),
      type: z.string().optional().describe("Only include datasets of this type (e.g. Event)"),
      interface: z.string().optional().describe("Only include datasets implementing this interface (e.g. log, metric)"),
    },
    async (params) => {
      try {
        const result = await client.listDatasets(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "get_dataset",
    "Get details of a specific dataset by ID, including columns, interfaces, and metadata",
    {
      dataset_id: z.string().describe("The dataset ID (plain integer or ORN format)"),
    },
    async ({ dataset_id }) => {
      try {
        const result = await client.getDataset(dataset_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
