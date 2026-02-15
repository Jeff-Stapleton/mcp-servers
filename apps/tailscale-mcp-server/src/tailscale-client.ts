const BASE_URL = 'https://api.tailscale.com/api/v2';

export interface TailscaleConfig {
  apiKey: string;
  tailnet: string;
}

export interface Device {
  id: string;
  name: string;
  hostname: string;
  addresses: string[];
  authorized: boolean;
  tags?: string[];
  user: string;
  os: string;
  clientVersion: string;
  created: string;
  lastSeen: string;
  keyExpiryDisabled: boolean;
  expires: string;
  machineKey: string;
  nodeKey: string;
  blocksIncomingConnections: boolean;
  enabledRoutes: string[];
  advertisedRoutes: string[];
  clientConnectivity?: {
    endpoints: string[];
    derp: string;
    mappingVariesByDestIP: boolean;
    latency: Record<string, { latencyMs: number }>;
    clientSupports: {
      hairPinning: boolean;
      ipv6: boolean;
      pcp: boolean;
      pmp: boolean;
      udp: boolean;
      upnp: boolean;
    };
  };
}

export interface DeviceList {
  devices: Device[];
}

export interface DNSNameservers {
  dns: string[];
}

export interface DNSPreferences {
  magicDNS: boolean;
}

export interface DNSSearchPaths {
  searchPaths: string[];
}

export interface ACLPolicy {
  acls?: Array<{
    action: string;
    src: string[];
    dst: string[];
  }>;
  groups?: Record<string, string[]>;
  hosts?: Record<string, string>;
  tagOwners?: Record<string, string[]>;
  autoApprovers?: {
    routes?: Record<string, string[]>;
    exitNode?: string[];
  };
  ssh?: Array<{
    action: string;
    src: string[];
    dst: string[];
    users: string[];
  }>;
  nodeAttrs?: Array<{
    target: string[];
    attr: string[];
  }>;
  tests?: Array<{
    src: string;
    accept?: string[];
    deny?: string[];
  }>;
}

export interface ACLValidateResponse {
  message: string;
  parseErrors?: Array<{
    user: string;
    errors: string[];
  }>;
}

export interface AuthKey {
  id: string;
  key?: string;
  description: string;
  created: string;
  expires: string;
  revoked: string;
  invalid: boolean;
  capabilities: {
    devices: {
      create: {
        reusable: boolean;
        ephemeral: boolean;
        preauthorized: boolean;
        tags?: string[];
      };
    };
  };
}

export interface AuthKeyList {
  keys: AuthKey[];
}

export interface CreateAuthKeyRequest {
  capabilities: {
    devices: {
      create: {
        reusable: boolean;
        ephemeral: boolean;
        preauthorized: boolean;
        tags?: string[];
      };
    };
  };
  expirySeconds?: number;
  description?: string;
}

export class TailscaleClient {
  private apiKey: string;
  private tailnet: string;

  constructor(config: TailscaleConfig) {
    this.apiKey = config.apiKey;
    this.tailnet = config.tailnet;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
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
        `Tailscale API error (${response.status}): ${errorText}`
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  // Device methods
  async listDevices(): Promise<DeviceList> {
    return this.request<DeviceList>(
      'GET',
      `/tailnet/${this.tailnet}/devices`
    );
  }

  async getDevice(deviceId: string): Promise<Device> {
    return this.request<Device>('GET', `/device/${deviceId}`);
  }

  async authorizeDevice(
    deviceId: string,
    authorized: boolean
  ): Promise<void> {
    await this.request<void>('POST', `/device/${deviceId}/authorized`, {
      authorized,
    });
  }

  async deleteDevice(deviceId: string): Promise<void> {
    await this.request<void>('DELETE', `/device/${deviceId}`);
  }

  async setDeviceTags(deviceId: string, tags: string[]): Promise<void> {
    await this.request<void>('POST', `/device/${deviceId}/tags`, { tags });
  }

  // DNS methods
  async getNameservers(): Promise<DNSNameservers> {
    return this.request<DNSNameservers>(
      'GET',
      `/tailnet/${this.tailnet}/dns/nameservers`
    );
  }

  async setNameservers(dns: string[]): Promise<DNSNameservers> {
    return this.request<DNSNameservers>(
      'POST',
      `/tailnet/${this.tailnet}/dns/nameservers`,
      { dns }
    );
  }

  async getDNSPreferences(): Promise<DNSPreferences> {
    return this.request<DNSPreferences>(
      'GET',
      `/tailnet/${this.tailnet}/dns/preferences`
    );
  }

  async setDNSPreferences(magicDNS: boolean): Promise<DNSPreferences> {
    return this.request<DNSPreferences>(
      'POST',
      `/tailnet/${this.tailnet}/dns/preferences`,
      { magicDNS }
    );
  }

  async getSearchPaths(): Promise<DNSSearchPaths> {
    return this.request<DNSSearchPaths>(
      'GET',
      `/tailnet/${this.tailnet}/dns/searchpaths`
    );
  }

  async setSearchPaths(searchPaths: string[]): Promise<DNSSearchPaths> {
    return this.request<DNSSearchPaths>(
      'POST',
      `/tailnet/${this.tailnet}/dns/searchpaths`,
      { searchPaths }
    );
  }

  // ACL methods
  async getACL(): Promise<ACLPolicy> {
    return this.request<ACLPolicy>('GET', `/tailnet/${this.tailnet}/acl`);
  }

  async setACL(policy: ACLPolicy): Promise<ACLPolicy> {
    return this.request<ACLPolicy>(
      'POST',
      `/tailnet/${this.tailnet}/acl`,
      policy
    );
  }

  async validateACL(policy: ACLPolicy): Promise<ACLValidateResponse> {
    return this.request<ACLValidateResponse>(
      'POST',
      `/tailnet/${this.tailnet}/acl/validate`,
      policy
    );
  }

  // Auth key methods
  async listAuthKeys(): Promise<AuthKeyList> {
    return this.request<AuthKeyList>(
      'GET',
      `/tailnet/${this.tailnet}/keys`
    );
  }

  async createAuthKey(request: CreateAuthKeyRequest): Promise<AuthKey> {
    return this.request<AuthKey>(
      'POST',
      `/tailnet/${this.tailnet}/keys`,
      request
    );
  }

  async getAuthKey(keyId: string): Promise<AuthKey> {
    return this.request<AuthKey>(
      'GET',
      `/tailnet/${this.tailnet}/keys/${keyId}`
    );
  }

  async deleteAuthKey(keyId: string): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/tailnet/${this.tailnet}/keys/${keyId}`
    );
  }
}

export function createClient(): TailscaleClient {
  const apiKey = process.env.TAILSCALE_API_KEY;
  const tailnet = process.env.TAILSCALE_TAILNET || '-';

  if (!apiKey) {
    throw new Error('TAILSCALE_API_KEY environment variable is required');
  }

  return new TailscaleClient({ apiKey, tailnet });
}
