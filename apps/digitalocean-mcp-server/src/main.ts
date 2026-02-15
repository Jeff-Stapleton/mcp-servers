import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DOClient } from "./do-client.js";

import { register as registerDropletOptions } from "./tools/droplet-options.js";
import { register as registerDroplets } from "./tools/droplets.js";
import { register as registerApps } from "./tools/apps.js";
import { register as registerDatabases } from "./tools/databases.js";
import { register as registerKubernetes } from "./tools/kubernetes.js";

const token = process.env.DIGITALOCEAN_TOKEN;
if (!token) {
  console.error("DIGITALOCEAN_TOKEN environment variable is required");
  process.exit(1);
}

const client = new DOClient(token);

const server = new McpServer({
  name: "digitalocean",
  version: "1.0.0",
});

// Register all tools
registerDropletOptions(server, client);
registerDroplets(server, client);
registerApps(server, client);
registerDatabases(server, client);
registerKubernetes(server, client);

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
  console.error("DigitalOcean MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
