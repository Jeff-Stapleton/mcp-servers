import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OpsReadOnlyClient } from "../ops-client.js";

interface TypeRef {
  kind: string;
  name: string | null;
  ofType?: TypeRef | null;
}

interface SchemaField {
  name: string;
  description: string | null;
  args?: { name: string; description: string | null; type: TypeRef; defaultValue: string | null }[];
  type: TypeRef;
  isDeprecated?: boolean;
  deprecationReason?: string | null;
}

interface SchemaType {
  kind: string;
  name: string;
  description: string | null;
  fields?: SchemaField[] | null;
  inputFields?: { name: string; description: string | null; type: TypeRef; defaultValue: string | null }[] | null;
  enumValues?: { name: string; description: string | null; isDeprecated: boolean; deprecationReason: string | null }[] | null;
  interfaces?: TypeRef[] | null;
  possibleTypes?: TypeRef[] | null;
}

interface IntrospectionData {
  __schema: {
    queryType: { name: string };
    mutationType: { name: string } | null;
    subscriptionType: { name: string } | null;
    types: SchemaType[];
  };
}

function renderTypeRef(t: TypeRef | null | undefined): string {
  if (!t) return "?";
  if (t.kind === "NON_NULL") return `${renderTypeRef(t.ofType)}!`;
  if (t.kind === "LIST") return `[${renderTypeRef(t.ofType)}]`;
  return t.name ?? "?";
}

export function register(server: McpServer, client: OpsReadOnlyClient) {
  server.tool(
    "introspect_schema",
    "Run a full GraphQL introspection query and return the raw schema. Result is cached in-process — subsequent calls are free unless force=true. Output is large; prefer list_query_fields or describe_type for targeted exploration.",
    {
      force: z
        .boolean()
        .optional()
        .describe("If true, bypass the in-process cache and re-fetch the schema."),
    },
    async ({ force }) => {
      try {
        const data = await client.introspect(force ?? false);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "list_query_fields",
    "List the top-level fields available on the Query type — the entry points for any data you can fetch. Each entry includes name, description, args (with types), and return type. Cheaper than full introspection.",
    {},
    async () => {
      try {
        const data = (await client.introspect()) as IntrospectionData;
        const queryTypeName = data.__schema.queryType.name;
        const queryType = data.__schema.types.find((t) => t.name === queryTypeName);
        if (!queryType || !queryType.fields) {
          return {
            isError: true,
            content: [{ type: "text", text: `Query type '${queryTypeName}' not found in schema.` }],
          };
        }
        const summary = queryType.fields.map((f) => ({
          name: f.name,
          description: f.description,
          returnType: renderTypeRef(f.type),
          args:
            f.args?.map((a) => ({
              name: a.name,
              type: renderTypeRef(a.type),
              defaultValue: a.defaultValue,
              description: a.description,
            })) ?? [],
          isDeprecated: f.isDeprecated ?? false,
          deprecationReason: f.deprecationReason ?? null,
        }));
        return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );

  server.tool(
    "describe_type",
    "Describe a specific GraphQL type — its fields (with args and return types), input fields, enum values, and interfaces. Use this to drill into a type returned by list_query_fields.",
    {
      name: z.string().describe("The GraphQL type name, exactly as it appears in the schema (case-sensitive)."),
    },
    async ({ name }) => {
      try {
        const data = (await client.introspect()) as IntrospectionData;
        const t = data.__schema.types.find((x) => x.name === name);
        if (!t) {
          return {
            isError: true,
            content: [{ type: "text", text: `Type '${name}' not found in schema.` }],
          };
        }
        const out = {
          kind: t.kind,
          name: t.name,
          description: t.description,
          interfaces: t.interfaces?.map((i) => renderTypeRef(i)) ?? [],
          possibleTypes: t.possibleTypes?.map((p) => renderTypeRef(p)) ?? [],
          fields:
            t.fields?.map((f) => ({
              name: f.name,
              description: f.description,
              returnType: renderTypeRef(f.type),
              args:
                f.args?.map((a) => ({
                  name: a.name,
                  type: renderTypeRef(a.type),
                  defaultValue: a.defaultValue,
                  description: a.description,
                })) ?? [],
              isDeprecated: f.isDeprecated ?? false,
              deprecationReason: f.deprecationReason ?? null,
            })) ?? null,
          inputFields:
            t.inputFields?.map((f) => ({
              name: f.name,
              description: f.description,
              type: renderTypeRef(f.type),
              defaultValue: f.defaultValue,
            })) ?? null,
          enumValues: t.enumValues ?? null,
        };
        return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
      } catch (e: unknown) {
        return { isError: true, content: [{ type: "text", text: String(e) }] };
      }
    }
  );
}
