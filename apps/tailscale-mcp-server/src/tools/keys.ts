import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TailscaleClient } from '../tailscale-client.js';

export function registerAuthKeyTools(
  server: McpServer,
  client: TailscaleClient
) {
  // List auth keys
  server.tool(
    'list_auth_keys',
    'List all auth keys for the tailnet',
    {},
    async () => {
      try {
        const result = await client.listAuthKeys();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result.keys, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing auth keys: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Create auth key
  server.tool(
    'create_auth_key',
    'Create a new pre-authorization key for devices to join the tailnet',
    {
      reusable: z
        .boolean()
        .default(false)
        .describe('Whether the key can be used multiple times'),
      ephemeral: z
        .boolean()
        .default(false)
        .describe('Whether devices using this key are ephemeral'),
      preauthorized: z
        .boolean()
        .default(true)
        .describe(
          'Whether devices are pre-authorized (skip manual approval)'
        ),
      tags: z
        .array(z.string())
        .optional()
        .describe(
          "Tags to apply to devices using this key (e.g., ['tag:server'])"
        ),
      expirySeconds: z
        .number()
        .optional()
        .describe('Key expiry time in seconds (default: 90 days)'),
      description: z.string().optional().describe('Description for the key'),
    },
    async ({
      reusable,
      ephemeral,
      preauthorized,
      tags,
      expirySeconds,
      description,
    }) => {
      try {
        const request = {
          capabilities: {
            devices: {
              create: {
                reusable,
                ephemeral,
                preauthorized,
                ...(tags && { tags }),
              },
            },
          },
          ...(expirySeconds && { expirySeconds }),
          ...(description && { description }),
        };

        const result = await client.createAuthKey(request);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating auth key: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get auth key details
  server.tool(
    'get_auth_key',
    'Get details of a specific auth key',
    {
      keyId: z.string().describe('The auth key ID'),
    },
    async ({ keyId }) => {
      try {
        const key = await client.getAuthKey(keyId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(key, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting auth key: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Delete auth key
  server.tool(
    'delete_auth_key',
    'Delete an auth key',
    {
      keyId: z.string().describe('The auth key ID to delete'),
    },
    async ({ keyId }) => {
      try {
        await client.deleteAuthKey(keyId);
        return {
          content: [
            {
              type: 'text',
              text: `Auth key ${keyId} deleted successfully`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting auth key: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
