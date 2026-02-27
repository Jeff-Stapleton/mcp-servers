export class ObserveClient {
  private customerId: string;
  private apiToken: string;
  private baseUrl: string;

  constructor(customerId: string, apiToken: string, instance: string, domain = "observeinc") {
    this.customerId = customerId;
    this.apiToken = apiToken;
    this.baseUrl = `https://${instance}.${domain}.com`;
  }

  private get authHeader(): string {
    return `Bearer ${this.customerId} ${this.apiToken}`;
  }

  private async get<T = unknown>(
    path: string,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Observe API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  private async getRaw(
    path: string,
    params?: Record<string, string>
  ): Promise<{ status: number; body: string; headers: Headers }> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: this.authHeader,
        Accept: "application/x-ndjson",
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Observe API error ${res.status}: ${body}`);
    }
    return { status: res.status, body: await res.text(), headers: res.headers };
  }

  private async post<T = unknown>(
    path: string,
    body: unknown,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.status !== 200 && res.status !== 201) {
      const text = await res.text();
      throw new Error(`Observe API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  private async postRaw(
    path: string,
    body: unknown,
    params?: Record<string, string>
  ): Promise<{ status: number; body: string; headers: Headers }> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/x-ndjson",
      },
      body: JSON.stringify(body),
    });
    if (res.status !== 200 && res.status !== 201 && res.status !== 202 && res.status !== 206) {
      const text = await res.text();
      throw new Error(`Observe API error ${res.status}: ${text}`);
    }
    return { status: res.status, body: await res.text(), headers: res.headers };
  }

  private async patch<T = unknown>(path: string, body: unknown): Promise<T | null> {
    const url = new URL(path, this.baseUrl);
    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Observe API error ${res.status}: ${text}`);
    }
    if (res.status === 204) return null;
    return res.json() as Promise<T>;
  }

  private async del(path: string): Promise<void> {
    const url = new URL(path, this.baseUrl);
    const res = await fetch(url.toString(), {
      method: "DELETE",
      headers: {
        Authorization: this.authHeader,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Observe API error ${res.status}: ${body}`);
    }
  }

  // Datasets
  async listDatasets(params?: {
    workspaceId?: string;
    match?: string;
    name?: string;
    type?: string;
    interface?: string;
  }) {
    const query: Record<string, string> = {};
    if (params?.workspaceId) query.workspaceId = params.workspaceId;
    if (params?.match) query.match = params.match;
    if (params?.name) query.name = params.name;
    if (params?.type) query.type = params.type;
    if (params?.interface) query.interface = params.interface;
    return this.get("/v1/dataset", query);
  }

  async getDataset(id: string) {
    return this.get(`/v1/dataset/${id}`);
  }

  // Query / Export
  async exportQuery(
    queryBody: Record<string, unknown>,
    params?: {
      startTime?: string;
      endTime?: string;
      interval?: string;
      stage?: string;
      paginate?: boolean;
    }
  ) {
    const qp: Record<string, string> = {};
    if (params?.startTime) qp.startTime = params.startTime;
    if (params?.endTime) qp.endTime = params.endTime;
    if (params?.interval) qp.interval = params.interval;
    if (params?.stage) qp.stage = params.stage;
    if (params?.paginate) qp.paginate = "true";
    return this.postRaw("/v1/meta/export/query", queryBody, qp);
  }

  async exportQueryPage(params: {
    cursorId: string;
    offset?: string;
    numRows?: string;
  }) {
    const qp: Record<string, string> = { cursorId: params.cursorId };
    if (params.offset) qp.offset = params.offset;
    if (params.numRows) qp.numRows = params.numRows;
    return this.getRaw("/v1/meta/export/query/page", qp);
  }

  async exportWorksheet(
    worksheetId: string,
    params?: {
      startTime?: string;
      endTime?: string;
      interval?: string;
      stage?: string;
    }
  ) {
    const qp: Record<string, string> = {};
    if (params?.startTime) qp.startTime = params.startTime;
    if (params?.endTime) qp.endTime = params.endTime;
    if (params?.interval) qp.interval = params.interval;
    if (params?.stage) qp.stage = params.stage;
    return this.postRaw(`/v1/meta/export/worksheet/${worksheetId}`, {}, qp);
  }

  // Monitors
  async listMonitors(params?: { nameExact?: string; nameSubstring?: string }) {
    const query: Record<string, string> = {};
    if (params?.nameExact) query.nameExact = params.nameExact;
    if (params?.nameSubstring) query.nameSubstring = params.nameSubstring;
    return this.get("/v1/monitors", query);
  }

  async getMonitor(id: string) {
    return this.get(`/v1/monitors/${id}`);
  }

  async createMonitor(body: Record<string, unknown>) {
    return this.post("/v1/monitors", body);
  }

  async updateMonitor(id: string, body: Record<string, unknown>) {
    return this.patch(`/v1/monitors/${id}`, body);
  }

  async deleteMonitor(id: string) {
    return this.del(`/v1/monitors/${id}`);
  }

  // Mute Rules
  async listMuteRules(params?: { nameExact?: string; nameSubstring?: string }) {
    const query: Record<string, string> = {};
    if (params?.nameExact) query.nameExact = params.nameExact;
    if (params?.nameSubstring) query.nameSubstring = params.nameSubstring;
    return this.get("/v1/monitor-mute-rules", query);
  }

  async getMuteRule(id: string) {
    return this.get(`/v1/monitor-mute-rules/${id}`);
  }

  async createMuteRule(body: Record<string, unknown>) {
    return this.post("/v1/monitor-mute-rules", body);
  }

  async deleteMuteRule(id: string) {
    return this.del(`/v1/monitor-mute-rules/${id}`);
  }
}
