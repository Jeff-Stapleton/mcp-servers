export interface GraphQLError {
  message: string;
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}

export class OpsReadOnlyClient {
  private apiKey: string;
  private endpoint: string;
  private schemaCache: unknown | null = null;

  constructor(
    apiKey: string,
    endpoint = "https://api.flybreeze.com/operations/readonly/graphql-public"
  ) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async query<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
    operationName?: string
  ): Promise<GraphQLResponse<T>> {
    const body: Record<string, unknown> = { query };
    if (variables && Object.keys(variables).length > 0) body.variables = variables;
    if (operationName) body.operationName = operationName;

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after") ?? "unknown";
      throw new Error(`Ops API rate limited (429). Retry-After: ${retryAfter}`);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ops API HTTP ${res.status}: ${text}`);
    }

    return (await res.json()) as GraphQLResponse<T>;
  }

  async health(): Promise<GraphQLResponse<{ health: string }>> {
    return this.query<{ health: string }>("{ health }");
  }

  async introspect(force = false): Promise<unknown> {
    if (this.schemaCache && !force) return this.schemaCache;
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            kind
            name
            description
            fields(includeDeprecated: true) {
              name
              description
              args {
                name
                description
                type { ...TypeRef }
                defaultValue
              }
              type { ...TypeRef }
              isDeprecated
              deprecationReason
            }
            inputFields {
              name
              description
              type { ...TypeRef }
              defaultValue
            }
            interfaces { ...TypeRef }
            enumValues(includeDeprecated: true) {
              name
              description
              isDeprecated
              deprecationReason
            }
            possibleTypes { ...TypeRef }
          }
          directives {
            name
            description
            locations
            args {
              name
              description
              type { ...TypeRef }
              defaultValue
            }
          }
        }
      }
      fragment TypeRef on __Type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType { kind name ofType { kind name ofType { kind name } } }
              }
            }
          }
        }
      }
    `;
    const res = await this.query(introspectionQuery);
    if (res.errors && res.errors.length > 0) {
      throw new Error(`Introspection failed: ${JSON.stringify(res.errors)}`);
    }
    this.schemaCache = res.data;
    return this.schemaCache;
  }

  clearSchemaCache(): void {
    this.schemaCache = null;
  }
}
