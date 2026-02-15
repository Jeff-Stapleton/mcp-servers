import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ClickUpClient } from "../clickup-client.js";

export function register(server: McpServer, client: ClickUpClient) {
  server.tool(
    "get_docs",
    "List all docs in a ClickUp workspace (cursor-based pagination)",
    {
      workspace_id: z.string().describe("The workspace ID"),
      cursor: z.string().optional().describe("Pagination cursor from a previous response"),
    },
    async ({ workspace_id, cursor }) => {
      try {
        const data = await client.getDocs(workspace_id, cursor);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    }
  );

  server.tool(
    "get_doc",
    "Get metadata for a single ClickUp doc",
    {
      workspace_id: z.string().describe("The workspace ID"),
      doc_id: z.string().describe("The doc ID"),
    },
    async ({ workspace_id, doc_id }) => {
      try {
        const data = await client.getDoc(workspace_id, doc_id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    }
  );

  server.tool(
    "get_doc_pages",
    "Get the page listing (table of contents) for a ClickUp doc",
    {
      workspace_id: z.string().describe("The workspace ID"),
      doc_id: z.string().describe("The doc ID"),
    },
    async ({ workspace_id, doc_id }) => {
      try {
        const data = await client.getDocPages(workspace_id, doc_id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    }
  );

  server.tool(
    "get_page_content",
    "Get the markdown content of a single page in a ClickUp doc",
    {
      workspace_id: z.string().describe("The workspace ID"),
      doc_id: z.string().describe("The doc ID"),
      page_id: z.string().describe("The page ID"),
    },
    async ({ workspace_id, doc_id, page_id }) => {
      try {
        const data = await client.getPageContent(workspace_id, doc_id, page_id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    }
  );
}
