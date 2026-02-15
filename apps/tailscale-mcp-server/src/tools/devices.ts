import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TailscaleClient } from '../tailscale-client.js';

export function registerDeviceTools(
  server: McpServer,
  client: TailscaleClient
) {
  // List all devices
  server.tool('list_devices', 'List all devices in the tailnet', {}, async () => {
    try {
      const result = await client.listDevices();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.devices, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing devices: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Get device details
  server.tool(
    'get_device',
    'Get details of a specific device by ID',
    {
      deviceId: z.string().describe('The device ID'),
    },
    async ({ deviceId }) => {
      try {
        const device = await client.getDevice(deviceId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(device, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting device: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Authorize device
  server.tool(
    'authorize_device',
    'Authorize or deauthorize a device to join the tailnet',
    {
      deviceId: z.string().describe('The device ID'),
      authorized: z
        .boolean()
        .describe(
          'Whether to authorize (true) or deauthorize (false) the device'
        ),
    },
    async ({ deviceId, authorized }) => {
      try {
        await client.authorizeDevice(deviceId, authorized);
        return {
          content: [
            {
              type: 'text',
              text: `Device ${deviceId} ${authorized ? 'authorized' : 'deauthorized'} successfully`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error authorizing device: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Remove device
  server.tool(
    'remove_device',
    'Remove a device from the tailnet',
    {
      deviceId: z.string().describe('The device ID to remove'),
    },
    async ({ deviceId }) => {
      try {
        await client.deleteDevice(deviceId);
        return {
          content: [
            {
              type: 'text',
              text: `Device ${deviceId} removed successfully`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error removing device: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Set device tags
  server.tool(
    'set_device_tags',
    'Set ACL tags on a device',
    {
      deviceId: z.string().describe('The device ID'),
      tags: z
        .array(z.string())
        .describe(
          "Array of tags to set (e.g., ['tag:server', 'tag:production'])"
        ),
    },
    async ({ deviceId, tags }) => {
      try {
        await client.setDeviceTags(deviceId, tags);
        return {
          content: [
            {
              type: 'text',
              text: `Tags set on device ${deviceId}: ${tags.join(', ')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting device tags: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
