export interface CreateTaskOptions {
  name: string;
  description?: string;
  markdown_description?: string;
  parent?: string;
  points?: number;
  status?: string;
  priority?: number;
  assignees?: number[];
  due_date?: number;
}

export interface UpdateTaskOptions {
  name?: string;
  description?: string;
  markdown_description?: string;
  points?: number | null;
  status?: string;
  priority?: number;
  assignees?: { add?: number[]; rem?: number[] };
  due_date?: number | null;
  parent?: string;
}

export interface GetTasksOptions {
  page?: number;
  subtasks?: boolean;
  include_closed?: boolean;
  statuses?: string[];
  assignees?: string[];
}

export interface SearchTasksOptions {
  page?: number;
  space_ids?: string[];
  list_ids?: string[];
  statuses?: string[];
  assignees?: string[];
  tags?: string[];
}

export class ClickUpClient {
  private v2Base = "https://api.clickup.com/api/v2";
  private v3Base = "https://api.clickup.com/api/v3";
  private headers: Record<string, string>;

  constructor(apiToken: string) {
    this.headers = {
      Authorization: apiToken,
      "Content-Type": "application/json",
    };
  }

  private async get<T>(url: string): Promise<T> {
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `ClickUp API error ${response.status}: ${response.statusText} — ${body}`
      );
    }
    return response.json() as Promise<T>;
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `ClickUp API error ${response.status}: ${response.statusText} — ${text}`
      );
    }
    return response.json() as Promise<T>;
  }

  private async put<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "PUT",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `ClickUp API error ${response.status}: ${response.statusText} — ${text}`
      );
    }
    return response.json() as Promise<T>;
  }

  // ── Workspaces (v2 "teams") ──────────────────────────────

  async getWorkspaces(): Promise<unknown> {
    return this.get(`${this.v2Base}/team`);
  }

  // ── Spaces ───────────────────────────────────────────────

  async getSpaces(teamId: string): Promise<unknown> {
    return this.get(`${this.v2Base}/team/${teamId}/space`);
  }

  async getSpace(spaceId: string): Promise<unknown> {
    return this.get(`${this.v2Base}/space/${spaceId}`);
  }

  // ── Folders ──────────────────────────────────────────────

  async getFolders(spaceId: string): Promise<unknown> {
    return this.get(`${this.v2Base}/space/${spaceId}/folder`);
  }

  // ── Lists ────────────────────────────────────────────────

  async getLists(folderId: string): Promise<unknown> {
    return this.get(`${this.v2Base}/folder/${folderId}/list`);
  }

  async getFolderlessLists(spaceId: string): Promise<unknown> {
    return this.get(`${this.v2Base}/space/${spaceId}/list`);
  }

  // ── Tasks ────────────────────────────────────────────────

  async getTasks(listId: string, opts: GetTasksOptions = {}): Promise<unknown> {
    const params = new URLSearchParams();
    if (opts.page !== undefined) params.set("page", String(opts.page));
    if (opts.subtasks) params.set("subtasks", "true");
    if (opts.include_closed) params.set("include_closed", "true");
    if (opts.statuses) {
      for (const s of opts.statuses) params.append("statuses[]", s);
    }
    if (opts.assignees) {
      for (const a of opts.assignees) params.append("assignees[]", a);
    }
    const qs = params.toString();
    return this.get(`${this.v2Base}/list/${listId}/task${qs ? `?${qs}` : ""}`);
  }

  async searchTasks(
    teamId: string,
    opts: SearchTasksOptions = {}
  ): Promise<unknown> {
    const params = new URLSearchParams();
    if (opts.page !== undefined) params.set("page", String(opts.page));
    if (opts.space_ids) {
      for (const id of opts.space_ids) params.append("space_ids[]", id);
    }
    if (opts.list_ids) {
      for (const id of opts.list_ids) params.append("list_ids[]", id);
    }
    if (opts.statuses) {
      for (const s of opts.statuses) params.append("statuses[]", s);
    }
    if (opts.assignees) {
      for (const a of opts.assignees) params.append("assignees[]", a);
    }
    if (opts.tags) {
      for (const t of opts.tags) params.append("tags[]", t);
    }
    const qs = params.toString();
    return this.get(`${this.v2Base}/team/${teamId}/task${qs ? `?${qs}` : ""}`);
  }

  async createTask(listId: string, opts: CreateTaskOptions): Promise<unknown> {
    return this.post(`${this.v2Base}/list/${listId}/task`, opts);
  }

  async updateTask(taskId: string, opts: UpdateTaskOptions, teamId?: string): Promise<unknown> {
    const params = new URLSearchParams();
    if (teamId) {
      params.set("custom_task_ids", "true");
      params.set("team_id", teamId);
    }
    const qs = params.toString();
    return this.put(`${this.v2Base}/task/${taskId}${qs ? `?${qs}` : ""}`, opts);
  }

  async getTask(taskId: string, teamId?: string): Promise<unknown> {
    const params = new URLSearchParams({
      include_subtasks: "true",
      include_markdown_description: "true",
    });
    if (teamId) {
      params.set("custom_task_ids", "true");
      params.set("team_id", teamId);
    }
    return this.get(`${this.v2Base}/task/${taskId}?${params.toString()}`);
  }

  // ── Comments ─────────────────────────────────────────────

  async getTaskComments(taskId: string, teamId?: string): Promise<unknown> {
    const params = new URLSearchParams();
    if (teamId) {
      params.set("custom_task_ids", "true");
      params.set("team_id", teamId);
    }
    const qs = params.toString();
    return this.get(`${this.v2Base}/task/${taskId}/comment${qs ? `?${qs}` : ""}`);
  }

  // ── Docs (v3) ────────────────────────────────────────────

  async getDocs(workspaceId: string, cursor?: string): Promise<unknown> {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.get(
      `${this.v3Base}/workspaces/${workspaceId}/docs${params}`
    );
  }

  async getDoc(workspaceId: string, docId: string): Promise<unknown> {
    return this.get(
      `${this.v3Base}/workspaces/${workspaceId}/docs/${docId}`
    );
  }

  async getDocPages(workspaceId: string, docId: string): Promise<unknown> {
    return this.get(
      `${this.v3Base}/workspaces/${workspaceId}/docs/${docId}/page_listing`
    );
  }

  async getPageContent(
    workspaceId: string,
    docId: string,
    pageId: string
  ): Promise<unknown> {
    return this.get(
      `${this.v3Base}/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}?content_format=text/md`
    );
  }
}
