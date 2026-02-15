import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from './tailscale-client.js';
import { registerDeviceTools } from './tools/devices.js';
import { registerDNSTools } from './tools/dns.js';
import { registerACLTools } from './tools/acl.js';
import { registerAuthKeyTools } from './tools/keys.js';

async function main() {
  const server = new McpServer({
    name: 'tailscale-mcp',
    version: '1.0.0',
  });

  const client = createClient();

  // Register all tool modules
  registerDeviceTools(server, client);
  registerDNSTools(server, client);
  registerACLTools(server, client);
  registerAuthKeyTools(server, client);

  // Start the server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Tailscale MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
