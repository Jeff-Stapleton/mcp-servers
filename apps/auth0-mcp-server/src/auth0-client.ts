export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface Auth0Application {
  client_id: string;
  name: string;
  app_type: string;
  description?: string;
  client_secret?: string;
  callbacks?: string[];
  allowed_logout_urls?: string[];
  web_origins?: string[];
  grant_types?: string[];
  [key: string]: unknown;
}

interface ClientGrant {
  id: string;
  client_id: string;
  audience: string;
  scope: string[];
  [key: string]: unknown;
}

export class Auth0Client {
  private domain: string;
  private clientId: string;
  private clientSecret: string;
  private audience: string;
  private token: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor(config: Auth0Config) {
    this.domain = config.domain;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.audience = config.audience;
  }

  private async getManagementToken(): Promise<string> {
    if (
      this.token &&
      this.tokenExpiresAt &&
      Date.now() < this.tokenExpiresAt
    ) {
      return this.token;
    }

    const response = await fetch(`https://${this.domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: this.audience,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to acquire management token (${response.status}): ${errorText}`
      );
    }

    const data = (await response.json()) as TokenResponse;
    this.token = data.access_token;
    // Refresh 5 minutes before expiry
    const expiresIn = data.expires_in || 3600;
    this.tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;

    return this.token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string>
  ): Promise<T> {
    const token = await this.getManagementToken();
    let url = `https://${this.domain}/api/v2${path}`;

    if (query) {
      const params = new URLSearchParams(query);
      url += `?${params.toString()}`;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Auth0 API error (${response.status}): ${errorText}`
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  private async resolveClientId(identifier: string): Promise<string> {
    try {
      const app = await this.request<Auth0Application>(
        'GET',
        `/clients/${identifier}`
      );
      return app.client_id;
    } catch {
      // Not a client_id, search by name
      const apps = await this.request<Auth0Application[]>('GET', '/clients');
      const match = apps.find((app) => app.name === identifier);
      if (!match) {
        throw new Error(`Application not found: ${identifier}`);
      }
      return match.client_id;
    }
  }

  async listApplications(
    page: number = 0,
    perPage: number = 50
  ): Promise<Auth0Application[]> {
    return this.request<Auth0Application[]>('GET', '/clients', undefined, {
      page: String(page),
      per_page: String(perPage),
    });
  }

  async getApplication(identifier: string): Promise<Auth0Application> {
    try {
      return await this.request<Auth0Application>(
        'GET',
        `/clients/${identifier}`
      );
    } catch {
      // Not a client_id, search by name
      const apps = await this.request<Auth0Application[]>('GET', '/clients');
      const match = apps.find((app) => app.name === identifier);
      if (!match) {
        throw new Error(`Application not found: ${identifier}`);
      }
      return match;
    }
  }

  async createApplication(params: {
    name: string;
    app_type: string;
    description?: string;
    redirect_uris?: string[];
    logout_uris?: string[];
    web_origins?: string[];
  }): Promise<Auth0Application> {
    const typeMapping: Record<string, string> = {
      spa: 'spa',
      regular_web: 'regular_web',
      native: 'native',
      m2m: 'non_interactive',
    };

    const auth0AppType = typeMapping[params.app_type];
    if (!auth0AppType) {
      throw new Error(
        `Invalid app_type: ${params.app_type}. Must be one of: spa, regular_web, native, m2m`
      );
    }

    const body: Record<string, unknown> = {
      name: params.name,
      app_type: auth0AppType,
    };

    if (params.description) body.description = params.description;
    if (params.redirect_uris) body.callbacks = params.redirect_uris;
    if (params.logout_uris) body.allowed_logout_urls = params.logout_uris;
    if (params.web_origins) body.web_origins = params.web_origins;

    return this.request<Auth0Application>('POST', '/clients', body);
  }

  async updateRedirectUrls(params: {
    identifier: string;
    redirect_uris: string[];
    logout_uris?: string[];
    web_origins?: string[];
  }): Promise<Auth0Application> {
    const clientId = await this.resolveClientId(params.identifier);

    const body: Record<string, unknown> = {
      callbacks: params.redirect_uris,
    };

    if (params.logout_uris !== undefined)
      body.allowed_logout_urls = params.logout_uris;
    if (params.web_origins !== undefined)
      body.web_origins = params.web_origins;

    return this.request<Auth0Application>(
      'PATCH',
      `/clients/${clientId}`,
      body
    );
  }

  async assignApiPermissions(params: {
    identifier: string;
    api_identifier: string;
    scopes: string[];
  }): Promise<ClientGrant> {
    const clientId = await this.resolveClientId(params.identifier);

    // Check if grant already exists
    const grants = await this.request<ClientGrant[]>(
      'GET',
      '/client-grants',
      undefined,
      {
        client_id: clientId,
        audience: params.api_identifier,
      }
    );

    if (grants.length > 0) {
      // Update existing grant
      return this.request<ClientGrant>(
        'PATCH',
        `/client-grants/${grants[0].id}`,
        { scope: params.scopes }
      );
    }

    // Create new grant
    return this.request<ClientGrant>('POST', '/client-grants', {
      client_id: clientId,
      audience: params.api_identifier,
      scope: params.scopes,
    });
  }

  async rotateClientSecret(
    identifier: string
  ): Promise<Auth0Application> {
    const clientId = await this.resolveClientId(identifier);
    return this.request<Auth0Application>(
      'POST',
      `/clients/${clientId}/rotate-secret`
    );
  }

  async deleteApplication(identifier: string): Promise<void> {
    const clientId = await this.resolveClientId(identifier);
    await this.request<Record<string, never>>(
      'DELETE',
      `/clients/${clientId}`
    );
  }
}

export function createClient(): Auth0Client {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const clientSecret = process.env.AUTH0_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    throw new Error(
      'Missing required Auth0 credentials. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET environment variables.'
    );
  }

  const audience =
    process.env.AUTH0_MANAGEMENT_API_AUDIENCE ||
    `https://${domain}/api/v2/`;

  return new Auth0Client({ domain, clientId, clientSecret, audience });
}
