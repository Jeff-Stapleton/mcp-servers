const BASE_URL = "https://api.digitalocean.com";

export class DOClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, BASE_URL);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DO API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  private async getRaw(path: string): Promise<string> {
    const url = new URL(path, BASE_URL);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DO API error ${res.status}: ${body}`);
    }
    return res.text();
  }

  private async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, BASE_URL);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DO API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  // Regions, Sizes, Images
  async listRegions() {
    return this.get("/v2/regions");
  }

  async listSizes() {
    return this.get("/v2/sizes");
  }

  async listImages(params?: { type?: string }) {
    const query: Record<string, string> = {};
    if (params?.type) query.type = params.type;
    return this.get("/v2/images", query);
  }

  // Droplets
  async createDroplet(body: Record<string, unknown>) {
    return this.post("/v2/droplets", body);
  }

  async getDroplet(id: number) {
    return this.get(`/v2/droplets/${id}`);
  }

  async listDroplets(params?: { tag_name?: string; page?: number; per_page?: number }) {
    const query: Record<string, string> = {};
    if (params?.tag_name) query.tag_name = params.tag_name;
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);
    return this.get("/v2/droplets", query);
  }

  // Apps
  async createApp(spec: Record<string, unknown>) {
    return this.post("/v2/apps", { spec });
  }

  async getApp(id: string) {
    return this.get(`/v2/apps/${id}`);
  }

  async listApps(params?: { page?: number; per_page?: number }) {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);
    return this.get("/v2/apps", query);
  }

  async listAppDeployments(appId: string, params?: { page?: number; per_page?: number }) {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);
    return this.get(`/v2/apps/${appId}/deployments`, query);
  }

  // Databases
  async createDatabase(body: Record<string, unknown>) {
    return this.post("/v2/databases", body);
  }

  async getDatabase(id: string) {
    return this.get(`/v2/databases/${id}`);
  }

  async listDatabases(params?: { page?: number; per_page?: number }) {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);
    return this.get("/v2/databases", query);
  }

  async listDatabaseOptions() {
    return this.get("/v2/databases/options");
  }

  // Kubernetes
  async createKubernetesCluster(body: Record<string, unknown>) {
    return this.post("/v2/kubernetes/clusters", body);
  }

  async getKubernetesCluster(id: string) {
    return this.get(`/v2/kubernetes/clusters/${id}`);
  }

  async listKubernetesClusters(params?: { page?: number; per_page?: number }) {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);
    return this.get("/v2/kubernetes/clusters", query);
  }

  async getKubeconfig(clusterId: string) {
    return this.getRaw(`/v2/kubernetes/clusters/${clusterId}/kubeconfig`);
  }

  async listKubernetesOptions() {
    return this.get("/v2/kubernetes/options");
  }

  async listKubernetesNodePools(clusterId: string) {
    return this.get(`/v2/kubernetes/clusters/${clusterId}/node_pools`);
  }
}
