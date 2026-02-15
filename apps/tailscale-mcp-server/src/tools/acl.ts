import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TailscaleClient, ACLPolicy } from '../tailscale-client.js';

const aclRuleSchema = z.object({
  action: z.string(),
  src: z.array(z.string()),
  dst: z.array(z.string()),
});

const sshRuleSchema = z.object({
  action: z.string(),
  src: z.array(z.string()),
  dst: z.array(z.string()),
  users: z.array(z.string()),
});

const nodeAttrSchema = z.object({
  target: z.array(z.string()),
  attr: z.array(z.string()),
});

const testSchema = z.object({
  src: z.string(),
  accept: z.array(z.string()).optional(),
  deny: z.array(z.string()).optional(),
});

const aclPolicySchema = z.object({
  acls: z.array(aclRuleSchema).optional(),
  groups: z.record(z.string(), z.array(z.string())).optional(),
  hosts: z.record(z.string(), z.string()).optional(),
  tagOwners: z.record(z.string(), z.array(z.string())).optional(),
  autoApprovers: z
    .object({
      routes: z.record(z.string(), z.array(z.string())).optional(),
      exitNode: z.array(z.string()).optional(),
    })
    .optional(),
  ssh: z.array(sshRuleSchema).optional(),
  nodeAttrs: z.array(nodeAttrSchema).optional(),
  tests: z.array(testSchema).optional(),
});

export function registerACLTools(
  server: McpServer,
  client: TailscaleClient
) {
  // Get ACL policy
  server.tool(
    'get_acl',
    'Get the current ACL policy for the tailnet',
    {},
    async () => {
      try {
        const acl = await client.getACL();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(acl, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting ACL: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Set ACL policy
  server.tool(
    'set_acl',
    'Update the ACL policy for the tailnet. This replaces the entire policy.',
    {
      policy: aclPolicySchema.describe('The complete ACL policy object'),
    },
    async ({ policy }) => {
      try {
        const result = await client.setACL(policy as ACLPolicy);
        return {
          content: [
            {
              type: 'text',
              text: `ACL policy updated successfully:\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting ACL: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Validate ACL policy
  server.tool(
    'validate_acl',
    'Validate an ACL policy without applying it',
    {
      policy: aclPolicySchema.describe('The ACL policy object to validate'),
    },
    async ({ policy }) => {
      try {
        const result = await client.validateACL(policy as ACLPolicy);

        if (result.parseErrors && result.parseErrors.length > 0) {
          return {
            content: [
              {
                type: 'text',
                text: `ACL validation failed:\n${JSON.stringify(result.parseErrors, null, 2)}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `ACL policy is valid: ${result.message || 'No errors found'}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error validating ACL: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
