import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ObserveClient } from "./observe-client.js";

import { register as registerDatasets } from "./tools/datasets.js";
import { register as registerQuery } from "./tools/query.js";
import { register as registerMonitors } from "./tools/monitors.js";
import { register as registerMuteRules } from "./tools/mute-rules.js";
import { register as registerTriage } from "./tools/triage.js";

const customerId = process.env.OBSERVE_CUSTOMER_ID;
if (!customerId) {
  console.error("OBSERVE_CUSTOMER_ID environment variable is required");
  process.exit(1);
}

const apiToken = process.env.OBSERVE_API_TOKEN;
if (!apiToken) {
  console.error("OBSERVE_API_TOKEN environment variable is required");
  process.exit(1);
}

const instance = process.env.OBSERVE_INSTANCE;
if (!instance) {
  console.error("OBSERVE_INSTANCE environment variable is required (your org subdomain, e.g. 'breezeairways' from https://breezeairways.observeinc.com)");
  process.exit(1);
}

const domain = process.env.OBSERVE_DOMAIN || "observeinc";

const client = new ObserveClient(customerId, apiToken, instance, domain);

const server = new McpServer({
  name: "observe",
  version: "1.0.0",
});

// Register all tools
registerDatasets(server, client);
registerQuery(server, client);
registerMonitors(server, client);
registerMuteRules(server, client);
registerTriage(server, client);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.error("Shutting down...");
  await server.close();
  process.exit(0);
});

// Start
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Observe MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
