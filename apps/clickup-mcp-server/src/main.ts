import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ClickUpClient } from "./clickup-client.js";

import { register as registerWorkspaces } from "./tools/workspaces.js";
import { register as registerSpaces } from "./tools/spaces.js";
import { register as registerFolders } from "./tools/folders.js";
import { register as registerLists } from "./tools/lists.js";
import { register as registerTasks } from "./tools/tasks.js";
import { register as registerComments } from "./tools/comments.js";
import { register as registerDocs } from "./tools/docs.js";

const apiToken = process.env.CLICKUP_API_TOKEN;
if (!apiToken) {
  console.error("CLICKUP_API_TOKEN environment variable is required");
  process.exit(1);
}

const client = new ClickUpClient(apiToken);

const server = new McpServer({
  name: "clickup",
  version: "1.0.0",
});

// Register all tools
registerWorkspaces(server, client);
registerSpaces(server, client);
registerFolders(server, client);
registerLists(server, client);
registerTasks(server, client);
registerComments(server, client);
registerDocs(server, client);

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
  console.error("ClickUp MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
