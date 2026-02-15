import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DOClient } from "../do-client.js";

export function register(server: McpServer, client: DOClient) {
  server.tool(
    "create_droplet",
    "Create a new DigitalOcean Droplet (virtual machine)",
    {
      name: z.string().describe("Hostname for the Droplet"),
      region: z.string().describe("Slug of the region to deploy in (e.g. nyc3, sfo3)"),
      size: z.string().describe("Slug of the Droplet size (e.g. s-1vcpu-1gb)"),
      image: z.union([z.string(), z.number()]).describe("OS image slug (e.g. ubuntu-24-04-x64) or image ID"),
      ssh_keys: z.array(z.union([z.string(), z.number()])).optional()
        .describe("Array of SSH key IDs or fingerprints to embed"),
      backups: z.boolean().optional().describe("Enable automated backups"),
      ipv6: z.boolean().optional().describe("Enable IPv6 networking"),
      monitoring: z.boolean().optional().describe("Enable detailed monitoring"),
      vpc_uuid: z.string().optional().describe("UUID of the VPC to place the Droplet in"),
      user_data: z.string().optional().describe("Cloud-init user data script"),
      tags: z.array(z.string()).optional().describe("Tags to apply to the Droplet"),
    },
    async (params) => {
      try {
        const result = await client.createDroplet(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "get_droplet",
    "Get details of a specific Droplet by ID",
    {
      droplet_id: z.number().describe("The unique ID of the Droplet"),
    },
    async ({ droplet_id }) => {
      try {
        const result = await client.getDroplet(droplet_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "list_droplets",
    "List all Droplets in the account, optionally filtered by tag",
    {
      tag_name: z.string().optional().describe("Filter Droplets by this tag"),
      page: z.number().optional().describe("Page number for pagination"),
      per_page: z.number().optional().describe("Number of results per page (max 200)"),
    },
    async (params) => {
      try {
        const result = await client.listDroplets(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
