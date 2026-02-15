import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from './auth0-client.js';
import { registerApplicationTools } from './tools/applications.js';

async function main() {
  const server = new McpServer({
    name: 'auth0-mcp',
    version: '1.0.0',
  });

  const client = createClient();

  // Register all tool modules
  registerApplicationTools(server, client);

  // Start the server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Auth0 MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
