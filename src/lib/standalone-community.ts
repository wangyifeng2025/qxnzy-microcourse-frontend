// ============================================================
// 独立社区话题 API 封装 /api/community/topics
// ============================================================

export type UserRole = "student" | "teacher" | "admin";

const API_BASE =
  typeof window === "undefined"
    ? process.env.BACKEND_URL ?? "http://127.0.0.1:8080"
    : "";

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export interface CommunityTopicResponse {
  id: string;
  author_id: string;
  author_username: string;
  author_real_name: string | null;
  author_avatar_url: string | null;
  author_role: UserRole;
  title: string;
  content: string;
  is_pinned: boolean;
  reply_count: number;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface StandaloneTopicCursor {
  is_pinned: boolean;
  created_at: string;
  id: string;
}

export interface StandaloneTopicsPage {
  page_size: number;
  has_more: boolean;
  next_cursor: StandaloneTopicCursor | null;
  items: CommunityTopicResponse[];
}

export interface CommunityTopicReplyResponse {
  id: string;
  topic_id: string;
  author_id: string;
  author_username: string;
  author_real_name: string | null;
  author_avatar_url: string | null;
  author_role: UserRole;
  content: string;
  reply_to_reply_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StandaloneRepliesPage {
  page_size: number;
  has_more: boolean;
  next_cursor_created_at: string | null;
  next_cursor_id: string | null;
  items: CommunityTopicReplyResponse[];
}

export interface CommunityTopicMember {
  user_id: string;
  username: string;
  real_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  joined_at: string;
}

export interface CreateStandaloneTopicRequest {
  title: string;
  content: string;
  mention_user_ids: string[];
}

export interface CreateStandaloneReplyRequest {
  content: string;
  reply_to_reply_id: string | null;
  mention_user_ids: string[];
}

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

function authH(token: string): Headers {
  const h = new Headers();
  h.set("Authorization", `Bearer ${token}`);
  return h;
}

function jsonH(token: string): Headers {
  const h = authH(token);
  h.set("Content-Type", "application/json");
  return h;
}

async function parseErr(res: Response): Promise<string> {
  try {
    const b = await res.json() as { message?: string; detail?: string; error?: string };
    return (b.message ?? b.detail ?? b.error ?? "").trim();
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// 话题
// ---------------------------------------------------------------------------

export async function fetchStandaloneTopics(
  token: string,
  options?: { pageSize?: number; cursor?: StandaloneTopicCursor },
): Promise<StandaloneTopicsPage> {
  const p = new URLSearchParams({ page_size: String(options?.pageSize ?? 20) });
  if (options?.cursor) {
    p.set("cursor_is_pinned", String(options.cursor.is_pinned));
    p.set("cursor_created_at", options.cursor.created_at);
    p.set("cursor_id", options.cursor.id);
  }
  const res = await fetch(`${API_BASE}/api/community/topics?${p}`, {
    headers: authH(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error((await parseErr(res)) || `获取话题列表失败 (${res.status})`);
  return res.json() as Promise<StandaloneTopicsPage>;
}

export async function fetchStandaloneTopic(
  topicId: string,
  token: string,
): Promise<CommunityTopicResponse> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}`, {
    headers: authH(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error((await parseErr(res)) || `获取话题详情失败 (${res.status})`);
  return res.json() as Promise<CommunityTopicResponse>;
}

export async function createStandaloneTopic(
  token: string,
  body: CreateStandaloneTopicRequest,
): Promise<CommunityTopicResponse> {
  const res = await fetch(`${API_BASE}/api/community/topics`, {
    method: "POST",
    headers: jsonH(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await parseErr(res)) || `开设话题失败 (${res.status})`);
  return res.json() as Promise<CommunityTopicResponse>;
}

export async function deleteStandaloneTopic(topicId: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}`, {
    method: "DELETE",
    headers: authH(token),
  });
  if (!res.ok) throw new Error((await parseErr(res)) || `删除话题失败 (${res.status})`);
}

// ---------------------------------------------------------------------------
// 加入 / 退出
// ---------------------------------------------------------------------------

export async function joinStandaloneTopic(topicId: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}/join`, {
    method: "POST",
    headers: authH(token),
  });
  if (!res.ok) throw new Error((await parseErr(res)) || `加入话题失败 (${res.status})`);
}

export async function leaveStandaloneTopic(topicId: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}/join`, {
    method: "DELETE",
    headers: authH(token),
  });
  if (!res.ok) throw new Error((await parseErr(res)) || `退出话题失败 (${res.status})`);
}

// ---------------------------------------------------------------------------
// 成员列表
// ---------------------------------------------------------------------------

export async function fetchStandaloneTopicMembers(
  topicId: string,
  token: string,
): Promise<CommunityTopicMember[]> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}/members`, {
    headers: authH(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error((await parseErr(res)) || `获取成员列表失败 (${res.status})`);
  return res.json() as Promise<CommunityTopicMember[]>;
}

/**
 * 判断当前用户是否在该话题的成员表中。
 * 后端仅成员/管理员可拉成员列表；退出后请求会 403，应视为「未加入」。
 * 其它错误返回 null，避免误清本地「已加入」状态。
 */
export async function resolveStandaloneTopicMembership(
  topicId: string,
  token: string,
  userId: string,
): Promise<boolean | null> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}/members`, {
    headers: authH(token),
    cache: "no-store",
  });
  if (res.ok) {
    const members = (await res.json()) as CommunityTopicMember[];
    return members.some((m) => m.user_id === userId);
  }
  if (res.status === 403) return false;
  return null;
}

// ---------------------------------------------------------------------------
// 回复
// ---------------------------------------------------------------------------

export async function fetchStandaloneReplies(
  topicId: string,
  token: string,
  options?: { pageSize?: number; cursorCreatedAt?: string; cursorId?: string },
): Promise<StandaloneRepliesPage> {
  const p = new URLSearchParams({ page_size: String(options?.pageSize ?? 50) });
  if (options?.cursorCreatedAt) p.set("cursor_created_at", options.cursorCreatedAt);
  if (options?.cursorId) p.set("cursor_id", options.cursorId);
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}/replies?${p}`, {
    headers: authH(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error((await parseErr(res)) || `获取回复列表失败 (${res.status})`);
  return res.json() as Promise<StandaloneRepliesPage>;
}

export async function createStandaloneReply(
  topicId: string,
  token: string,
  body: CreateStandaloneReplyRequest,
): Promise<CommunityTopicReplyResponse> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}/replies`, {
    method: "POST",
    headers: jsonH(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await parseErr(res)) || `发布回复失败 (${res.status})`);
  return res.json() as Promise<CommunityTopicReplyResponse>;
}

export async function deleteStandaloneReply(
  topicId: string,
  replyId: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/community/topics/${topicId}/replies/${replyId}`, {
    method: "DELETE",
    headers: authH(token),
  });
  if (!res.ok) throw new Error((await parseErr(res)) || `删除回复失败 (${res.status})`);
}
