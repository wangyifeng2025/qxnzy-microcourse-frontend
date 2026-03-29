/** GET /api/majors 列表项 */
export interface MajorListItem {
  id: string;
  name: string;
  code: string;
  description: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  /** 该专业下课程数量 */
  course_count?: number;
  /** 学习人数（选课/在读等，以后端为准） */
  enrolled_learner_count?: number;
  /** 视频总播放量 */
  total_video_views?: number;
}

export interface MajorsListResponse {
  page_size: number;
  has_more: boolean;
  next_cursor_created_at: string | null;
  next_cursor_id: string | null;
  items: MajorListItem[];
}

export type FetchMajorsListOptions = {
  token: string;
  pageSize?: number;
  cursor?: { created_at: string; id: string } | null;
};

/** POST /api/majors */
export type CreateMajorPayload = {
  name: string;
  code: string;
  description: string;
  sort_order: number;
};

export type CreateMajorOptions = {
  token: string;
  payload: CreateMajorPayload;
};

/** PUT /api/majors/:id */
export type UpdateMajorPayload = {
  name: string;
  description: string;
  sort_order: number;
};

export type UpdateMajorOptions = {
  token: string;
  majorId: string;
  payload: UpdateMajorPayload;
};

export type DeleteMajorOptions = {
  token: string;
  majorId: string;
};

const API_BASE =
  typeof window === "undefined" ? "http://127.0.0.1:8080" : "";

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const errBody = (await res.json()) as {
      message?: string;
      detail?: string;
      error?: string;
    };
    return (
      errBody.message ?? errBody.detail ?? errBody.error ?? ""
    ).trim();
  } catch {
    return "";
  }
}

/**
 * GET /api/majors — 游标分页，需 Bearer。
 */
export async function fetchMajorsList(
  options: FetchMajorsListOptions,
): Promise<MajorsListResponse> {
  const pageSize = options.pageSize ?? 20;
  const params = new URLSearchParams({ page_size: String(pageSize) });
  if (options.cursor) {
    params.set("cursor_created_at", options.cursor.created_at);
    params.set("cursor_id", options.cursor.id);
  }
  const res = await fetch(`${API_BASE}/api/majors?${params}`, {
    headers: { Authorization: `Bearer ${options.token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new Error(
      detail
        ? `获取专业列表失败: ${res.status} — ${detail}`
        : `获取专业列表失败: ${res.status}`,
    );
  }
  const raw = (await res.json()) as Partial<MajorsListResponse> & {
    items?: MajorListItem[];
  };
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    page_size: raw.page_size ?? items.length,
    has_more: raw.has_more ?? false,
    next_cursor_created_at: raw.next_cursor_created_at ?? null,
    next_cursor_id: raw.next_cursor_id ?? null,
    items,
  };
}

/**
 * POST /api/majors — 创建专业。
 */
export async function createMajor(options: CreateMajorOptions): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/majors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.token}`,
    },
    body: JSON.stringify(options.payload),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new Error(
      detail
        ? `创建专业失败: ${res.status} — ${detail}`
        : `创建专业失败: ${res.status}`,
    );
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * PUT /api/majors/:id — 更新专业（不含 code，与接口示例一致）。
 */
export async function updateMajor(options: UpdateMajorOptions): Promise<unknown> {
  const { token, majorId, payload } = options;
  const res = await fetch(
    `${API_BASE}/api/majors/${encodeURIComponent(majorId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new Error(
      detail
        ? `更新专业失败: ${res.status} — ${detail}`
        : `更新专业失败: ${res.status}`,
    );
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * DELETE /api/majors/:id — 删除专业。
 */
export async function deleteMajor(options: DeleteMajorOptions): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/majors/${encodeURIComponent(options.majorId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${options.token}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new Error(
      detail
        ? `删除专业失败: ${res.status} — ${detail}`
        : `删除专业失败: ${res.status}`,
    );
  }
}
