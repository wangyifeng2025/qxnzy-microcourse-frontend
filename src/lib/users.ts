export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  real_name: string;
  avatar_url: string | null;
}

/** GET /api/users 列表项（管理端分页） */
export interface UserListItem {
  id: string;
  username: string;
  email: string;
  role: string;
  real_name: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsersListResponse {
  page_size: number;
  has_more: boolean;
  next_cursor_created_at: string | null;
  next_cursor_id: string | null;
  items: UserListItem[];
}

export type FetchUsersListOptions = {
  token: string;
  pageSize?: number;
  cursor?: { created_at: string; id: string } | null;
};

/** POST /api/users — 管理员创建用户 */
export type CreateUserPayload = {
  username: string;
  email: string;
  password: string;
  /** 与后端一致：Admin | Teacher | Student */
  role: "Admin" | "Teacher" | "Student";
  real_name: string;
};

export type CreateUserAsAdminOptions = {
  token: string;
  payload: CreateUserPayload;
};

/** PATCH /api/users/:id — 管理员更新用户 */
export type UpdateUserPayload = {
  email: string;
  role: "Admin" | "Teacher" | "Student";
  real_name: string;
  is_active: boolean;
  /** 留空表示不修改密码 */
  password?: string;
};

export type UpdateUserAsAdminOptions = {
  token: string;
  userId: string;
  payload: UpdateUserPayload;
};

export type DeleteUserAsAdminOptions = {
  token: string;
  userId: string;
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
 * GET /api/users — 管理端用户列表，需 Bearer。
 * 客户端走 Next rewrites，同域 `/api/users`；服务端直连后端。
 */
export async function fetchUsersList(
  options: FetchUsersListOptions,
): Promise<UsersListResponse> {
  const pageSize = options.pageSize ?? 20;
  const params = new URLSearchParams({ page_size: String(pageSize) });
  if (options.cursor) {
    params.set("cursor_created_at", options.cursor.created_at);
    params.set("cursor_id", options.cursor.id);
  }
  const res = await fetch(`${API_BASE}/api/users?${params}`, {
    headers: { Authorization: `Bearer ${options.token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new Error(
      detail
        ? `获取用户列表失败: ${res.status} — ${detail}`
        : `获取用户列表失败: ${res.status}`,
    );
  }
  return res.json() as Promise<UsersListResponse>;
}

/**
 * POST /api/users — 创建用户（管理员），需 Bearer。
 */
export async function createUserAsAdmin(
  options: CreateUserAsAdminOptions,
): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/users`, {
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
        ? `创建用户失败: ${res.status} — ${detail}`
        : `创建用户失败: ${res.status}`,
    );
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return null;
  }
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * PATCH /api/users/:id — 更新用户（管理员），需 Bearer。
 */
export async function updateUserAsAdmin(
  options: UpdateUserAsAdminOptions,
): Promise<unknown> {
  const { token, userId, payload } = options;
  const body: Record<string, unknown> = {
    email: payload.email,
    role: payload.role,
    real_name: payload.real_name,
    is_active: payload.is_active,
  };
  if (payload.password?.trim()) {
    body.password = payload.password.trim();
  }
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new Error(
      detail
        ? `更新用户失败: ${res.status} — ${detail}`
        : `更新用户失败: ${res.status}`,
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
 * DELETE /api/users/:id — 删除用户（管理员），需 Bearer。
 */
export async function deleteUserAsAdmin(
  options: DeleteUserAsAdminOptions,
): Promise<void> {
  const { token, userId } = options;
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new Error(
      detail
        ? `删除用户失败: ${res.status} — ${detail}`
        : `删除用户失败: ${res.status}`,
    );
  }
}

export async function fetchUser(id: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    next: { revalidate: 300 }, // cache user info for 5min
  });
  if (res.status === 404) throw new Error("USER_NOT_FOUND");
  if (!res.ok) throw new Error(`获取用户信息失败: ${res.status}`);
  return res.json() as Promise<UserProfile>;
}
