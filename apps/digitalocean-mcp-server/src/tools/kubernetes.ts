import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DOClient } from "../do-client.js";

const nodePoolSchema = z.object({
  size: z.string().describe("Slug of the Droplet size for worker nodes (e.g. s-2vcpu-4gb)"),
  name: z.string().describe("Name for this node pool"),
  count: z.number().describe("Number of nodes in this pool"),
  tags: z.array(z.string()).optional().describe("Tags to apply to nodes in this pool"),
  auto_scale: z.boolean().optional().describe("Enable auto-scaling for this pool"),
  min_nodes: z.number().optional().describe("Minimum nodes when auto-scaling is enabled"),
  max_nodes: z.number().optional().describe("Maximum nodes when auto-scaling is enabled"),
});

export function register(server: McpServer, client: DOClient) {
  server.tool(
    "create_kubernetes_cluster",
    "Create a new managed Kubernetes cluster",
    {
      name: z.string().describe("Name for the Kubernetes cluster"),
      region: z.string().describe("Slug of the region to deploy in"),
      version: z.string().describe("Kubernetes version slug (e.g. 1.29.1-do.0). Use list_kubernetes_options to see available versions"),
      node_pools: z.array(nodePoolSchema).describe("Array of node pool configurations"),
      tags: z.array(z.string()).optional().describe("Tags to apply to the cluster"),
      vpc_uuid: z.string().optional().describe("UUID of the VPC to place the cluster in"),
    },
    async (params) => {
      try {
        const result = await client.createKubernetesCluster(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "get_kubernetes_cluster",
    "Get details of a specific Kubernetes cluster",
    {
      cluster_id: z.string().describe("UUID of the Kubernetes cluster"),
    },
    async ({ cluster_id }) => {
      try {
        const result = await client.getKubernetesCluster(cluster_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "list_kubernetes_clusters",
    "List all Kubernetes clusters in the account",
    {
      page: z.number().optional().describe("Page number for pagination"),
      per_page: z.number().optional().describe("Number of results per page (max 200)"),
    },
    async (params) => {
      try {
        const result = await client.listKubernetesClusters(params);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "get_kubeconfig",
    "Get the kubeconfig YAML for a Kubernetes cluster",
    {
      cluster_id: z.string().describe("UUID of the Kubernetes cluster"),
    },
    async ({ cluster_id }) => {
      try {
        const result = await client.getKubeconfig(cluster_id);
        return { content: [{ type: "text", text: result }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "list_kubernetes_options",
    "List available Kubernetes versions, regions, and node sizes",
    {},
    async () => {
      try {
        const result = await client.listKubernetesOptions();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "list_kubernetes_node_pools",
    "List all node pools in a Kubernetes cluster",
    {
      cluster_id: z.string().describe("UUID of the Kubernetes cluster"),
    },
    async ({ cluster_id }) => {
      try {
        const result = await client.listKubernetesNodePools(cluster_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
