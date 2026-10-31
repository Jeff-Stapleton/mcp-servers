import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OpsReadOnlyClient } from "./ops-client.js";

import { register as registerQuery } from "./tools/query.js";
import { register as registerSchema } from "./tools/schema.js";
import { register as registerFlights } from "./tools/flights.js";

const apiKey = process.env.OPS_READONLY_API_KEY ?? process.env.BREEZE_API_KEY;
if (!apiKey) {
  console.error(
    "OPS_READONLY_API_KEY (or BREEZE_API_KEY) environment variable is required. " +
      "Get a key from the Breeze Ops team — it should start with 'brz_pub_'."
  );
  process.exit(1);
}

const endpoint =
  process.env.OPS_READONLY_ENDPOINT ??
  "https://api.flybreeze.com/operations/readonly/graphql-public";

const client = new OpsReadOnlyClient(apiKey, endpoint);

const server = new McpServer({
  name: "ops-readonly",
  version: "0.1.0",
});

registerQuery(server, client);
registerSchema(server, client);
registerFlights(server, client);

process.on("SIGINT", async () => {
  console.error("Shutting down...");
  await server.close();
  process.exit(0);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Ops Read-Only MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
