import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Auth0Client } from '../auth0-client.js';

export function registerApplicationTools(
  server: McpServer,
  client: Auth0Client
) {
  // List all applications
  server.tool(
    'list_applications',
    'List all Auth0 applications in the tenant. Returns basic details including name, client_id, and app_type.',
    {
      page: z.number().int().min(0).default(0).describe('Page number for pagination (default: 0)'),
      per_page: z.number().int().min(1).max(100).default(50).describe('Results per page (default: 50, max: 100)'),
    },
    async ({ page, per_page }) => {
      try {
        const apps = await client.listApplications(page, per_page);

        const result = apps.map((app) => ({
          name: app.name,
          client_id: app.client_id,
          app_type: app.app_type,
          description: app.description || '',
        }));

        return {
          content: [
            {
              type: 'text',
              text: `Found ${result.length} application(s):\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing applications: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get application details
  server.tool(
    'get_application',
    'Get detailed information about a specific Auth0 application. You can search by application name or client_id.',
    {
      identifier: z.string().describe('Application name or client_id'),
    },
    async ({ identifier }) => {
      try {
        const app = await client.getApplication(identifier);

        const details = {
          name: app.name,
          client_id: app.client_id,
          client_secret: app.client_secret,
          app_type: app.app_type,
          description: app.description || '',
          callbacks: app.callbacks || [],
          allowed_logout_urls: app.allowed_logout_urls || [],
          web_origins: app.web_origins || [],
          grant_types: app.grant_types || [],
        };

        return {
          content: [
            {
              type: 'text',
              text: `Application Details:\n\n${JSON.stringify(details, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting application: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Create application
  server.tool(
    'create_application',
    "Create a new Auth0 application. Returns the new application details including client_id and client_secret (if applicable).",
    {
      name: z.string().describe('Application name'),
      app_type: z
        .string()
        .describe(
          "Application type - one of: 'spa' (Single Page App), 'regular_web' (Traditional Web App), 'native' (Native/Mobile App), or 'm2m' (Machine-to-Machine)"
        ),
      description: z.string().optional().describe('Optional application description'),
      redirect_uris: z.array(z.string()).optional().describe('List of allowed callback URLs'),
      logout_uris: z.array(z.string()).optional().describe('List of allowed logout redirect URLs'),
      web_origins: z.array(z.string()).optional().describe('List of allowed web origins for CORS'),
    },
    async ({ name, app_type, description, redirect_uris, logout_uris, web_origins }) => {
      try {
        const app = await client.createApplication({
          name,
          app_type,
          description,
          redirect_uris,
          logout_uris,
          web_origins,
        });

        const details = {
          name: app.name,
          client_id: app.client_id,
          client_secret: app.client_secret,
          app_type: app.app_type,
          callbacks: app.callbacks || [],
          allowed_logout_urls: app.allowed_logout_urls || [],
          web_origins: app.web_origins || [],
        };

        return {
          content: [
            {
              type: 'text',
              text: `Application created successfully:\n\n${JSON.stringify(details, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating application: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Update redirect URLs
  server.tool(
    'update_redirect_urls',
    'Update redirect URLs, logout URLs, and web origins for an Auth0 application. This is useful for adding production URLs or updating development endpoints.',
    {
      identifier: z.string().describe('Application name or client_id'),
      redirect_uris: z.array(z.string()).describe('List of allowed callback URLs (replaces existing)'),
      logout_uris: z.array(z.string()).optional().describe('List of allowed logout redirect URLs (optional)'),
      web_origins: z.array(z.string()).optional().describe('List of allowed web origins for CORS (optional)'),
    },
    async ({ identifier, redirect_uris, logout_uris, web_origins }) => {
      try {
        const app = await client.updateRedirectUrls({
          identifier,
          redirect_uris,
          logout_uris,
          web_origins,
        });

        const details = {
          name: app.name,
          client_id: app.client_id,
          callbacks: app.callbacks || [],
          allowed_logout_urls: app.allowed_logout_urls || [],
          web_origins: app.web_origins || [],
        };

        return {
          content: [
            {
              type: 'text',
              text: `Redirect URLs updated successfully:\n\n${JSON.stringify(details, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating redirect URLs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Assign API permissions
  server.tool(
    'assign_api_permissions',
    'Grant API access and scopes to an Auth0 application. Creates or updates a client grant for the specified API.',
    {
      identifier: z.string().describe('Application name or client_id'),
      api_identifier: z.string().describe('API identifier/audience (e.g., https://api.example.com)'),
      scopes: z.array(z.string()).describe("List of permission scopes to grant (e.g., ['read:users', 'write:users'])"),
    },
    async ({ identifier, api_identifier, scopes }) => {
      try {
        const result = await client.assignApiPermissions({
          identifier,
          api_identifier,
          scopes,
        });

        return {
          content: [
            {
              type: 'text',
              text: `API permissions assigned successfully:\n\nAPI: ${api_identifier}\nScopes: ${scopes.join(', ')}\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error assigning API permissions: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Rotate client secret
  server.tool(
    'rotate_client_secret',
    'Generate a new client secret for an Auth0 application. WARNING: The previous client secret will become invalid immediately.',
    {
      identifier: z.string().describe('Application name or client_id'),
    },
    async ({ identifier }) => {
      try {
        const result = await client.rotateClientSecret(identifier);

        return {
          content: [
            {
              type: 'text',
              text: `Client secret rotated successfully:\n\nClient ID: ${result.client_id}\nNew Secret: ${result.client_secret}\n\nWARNING: The previous secret is now invalid.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error rotating client secret: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Delete application
  server.tool(
    'delete_application',
    'Delete an Auth0 application permanently. This action cannot be undone. Requires confirmation flag for safety.',
    {
      identifier: z.string().describe('Application name or client_id'),
      confirm: z.boolean().describe('Must be true to confirm deletion'),
    },
    async ({ identifier, confirm }) => {
      try {
        if (!confirm) {
          return {
            content: [
              {
                type: 'text',
                text: "Deletion cancelled: 'confirm' parameter must be set to true.",
              },
            ],
          };
        }

        await client.deleteApplication(identifier);

        return {
          content: [
            {
              type: 'text',
              text: `Application '${identifier}' deleted successfully.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting application: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
