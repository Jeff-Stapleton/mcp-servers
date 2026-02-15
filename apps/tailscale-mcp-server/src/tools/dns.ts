import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TailscaleClient } from '../tailscale-client.js';

export function registerDNSTools(
  server: McpServer,
  client: TailscaleClient
) {
  // Get DNS settings
  server.tool(
    'get_dns_settings',
    'Get current DNS settings including nameservers, MagicDNS status, and search paths',
    {},
    async () => {
      try {
        const [nameservers, preferences, searchPaths] = await Promise.all([
          client.getNameservers(),
          client.getDNSPreferences(),
          client.getSearchPaths(),
        ]);

        const settings = {
          nameservers: nameservers.dns,
          magicDNS: preferences.magicDNS,
          searchPaths: searchPaths.searchPaths,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(settings, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting DNS settings: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Set nameservers
  server.tool(
    'set_nameservers',
    'Configure DNS nameservers for the tailnet',
    {
      nameservers: z
        .array(z.string())
        .describe('Array of DNS nameserver IP addresses'),
    },
    async ({ nameservers }) => {
      try {
        const result = await client.setNameservers(nameservers);
        return {
          content: [
            {
              type: 'text',
              text: `Nameservers set successfully: ${result.dns.join(', ')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting nameservers: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Set MagicDNS
  server.tool(
    'set_magic_dns',
    'Enable or disable MagicDNS for the tailnet',
    {
      enabled: z
        .boolean()
        .describe(
          'Whether to enable (true) or disable (false) MagicDNS'
        ),
    },
    async ({ enabled }) => {
      try {
        const result = await client.setDNSPreferences(enabled);
        return {
          content: [
            {
              type: 'text',
              text: `MagicDNS ${result.magicDNS ? 'enabled' : 'disabled'} successfully`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting MagicDNS: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Set search paths
  server.tool(
    'set_search_paths',
    'Configure DNS search paths for the tailnet',
    {
      searchPaths: z
        .array(z.string())
        .describe('Array of DNS search path domains'),
    },
    async ({ searchPaths }) => {
      try {
        const result = await client.setSearchPaths(searchPaths);
        return {
          content: [
            {
              type: 'text',
              text: `Search paths set successfully: ${result.searchPaths.join(', ')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting search paths: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
