// ============================================================
// 课程社区 API 封装
// ============================================================

const API_BASE = typeof window === "undefined"
  ? process.env.BACKEND_URL ?? "http://127.0.0.1:8080"
  : "";

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export type UserRole = "student" | "teacher" | "admin";

export interface CourseTopicResponse {
  id: string;
  course_id: string;
  author_id: string;
  author_username: string;
  author_real_name: string | null;
  author_avatar_url: string | null;
  author_role: UserRole;
  title: string;
  content: string;
  is_pinned: boolean;
  reply_count: number;
  created_at: string;
  updated_at: string;
}

export interface TopicCursor {
  is_pinned: boolean;
  created_at: string;
  id: string;
}

export interface TopicsPageResponse {
  page_size: number;
  has_more: boolean;
  next_cursor: TopicCursor | null;
  items: CourseTopicResponse[];
}

/** GET /api/courses/:id/topics/highlight — 公开，无需登录 */
export interface CourseTopicHighlight {
  id: string;
  title: string;
  content_preview: string;
  reply_count: number;
  author_display: string;
}

export interface CourseTopicReplyResponse {
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

export interface RepliesPageResponse {
  page_size: number;
  has_more: boolean;
  next_cursor_created_at: string | null;
  next_cursor_id: string | null;
  items: CourseTopicReplyResponse[];
}

export interface CourseMember {
  user_id: string;
  username: string;
  real_name: string | null;
  avatar_url: string | null;
  role: UserRole;
}

export interface CreateTopicRequest {
  title: string;
  content: string;
  mention_user_ids: string[];
}

export interface CreateReplyRequest {
  content: string;
  reply_to_reply_id: string | null;
  mention_user_ids: string[];
}

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

function authHeaders(token: string): Headers {
  const h = new Headers();
  h.set("Authorization", `Bearer ${token}`);
  return h;
}

function jsonHeaders(token: string): Headers {
  const h = authHeaders(token);
  h.set("Content-Type", "application/json");
  return h;
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json() as { message?: string; detail?: string; error?: string };
    return (body.message ?? body.detail ?? body.error ?? "").trim();
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// 话题
// ---------------------------------------------------------------------------

export async function fetchTopics(
  courseId: string,
  token: string,
  options?: { pageSize?: number; cursor?: TopicCursor },
): Promise<TopicsPageResponse> {
  const params = new URLSearchParams({ page_size: String(options?.pageSize ?? 20) });
  if (options?.cursor) {
    params.set("cursor_is_pinned", String(options.cursor.is_pinned));
    params.set("cursor_created_at", options.cursor.created_at);
    params.set("cursor_id", options.cursor.id);
  }
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/topics?${params}`,
    { headers: authHeaders(token), cache: "no-store" },
  );
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(detail || `获取话题列表失败 (${res.status})`);
  }
  return res.json() as Promise<TopicsPageResponse>;
}

/**
 * 课程详情侧栏「讨论精选」：仅已发布课程有数据；草稿/未发布返回 404，本函数转为 []。
 */
export async function fetchCourseTopicHighlights(
  courseId: string,
  options?: { limit?: number },
): Promise<CourseTopicHighlight[]> {
  const limit = options?.limit ?? 5;
  const params = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/topics/highlight?${params}`,
    { cache: "no-store" },
  );
  if (res.status === 404) return [];
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(detail || `获取讨论精选失败 (${res.status})`);
  }
  return res.json() as Promise<CourseTopicHighlight[]>;
}

export async function fetchTopic(
  courseId: string,
  topicId: string,
  token: string,
): Promise<CourseTopicResponse> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/topics/${topicId}`,
    { headers: authHeaders(token), cache: "no-store" },
  );
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(detail || `获取话题详情失败 (${res.status})`);
  }
  return res.json() as Promise<CourseTopicResponse>;
}

export async function createTopic(
  courseId: string,
  token: string,
  body: CreateTopicRequest,
): Promise<CourseTopicResponse> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/topics`,
    {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(detail || `发布话题失败 (${res.status})`);
  }
  return res.json() as Promise<CourseTopicResponse>;
}

export async function deleteTopic(
  courseId: string,
  topicId: string,
  token: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/topics/${topicId}`,
    { method: "DELETE", headers: authHeaders(token) },
  );
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(detail || `删除话题失败 (${res.status})`);
  }
}

// ---------------------------------------------------------------------------
// 回复
// ---------------------------------------------------------------------------

export async function fetchReplies(
  courseId: string,
  topicId: string,
  token: string,
  options?: { pageSize?: number; cursorCreatedAt?: string; cursorId?: string },
): Promise<RepliesPageResponse> {
  const params = new URLSearchParams({ page_size: String(options?.pageSize ?? 50) });
  if (options?.cursorCreatedAt) params.set("cursor_created_at", options.cursorCreatedAt);
  if (options?.cursorId) params.set("cursor_id", options.cursorId);
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/topics/${topicId}/replies?${params}`,
    { headers: authHeaders(token), cache: "no-store" },
  );
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(detail || `获取回复列表失败 (${res.status})`);
  }
  return res.json() as Promise<RepliesPageResponse>;
}

export async function createReply(
  courseId: string,
  topicId: string,
  token: string,
  body: CreateReplyRequest,
): Promise<CourseTopicReplyResponse> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/topics/${topicId}/replies`,
    {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(detail || `发布回复失败 (${res.status})`);
  }
  return res.json() as Promise<CourseTopicReplyResponse>;
}

export async function deleteReply(
  courseId: string,
  topicId: string,
  replyId: string,
  token: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/topics/${topicId}/replies/${replyId}`,
    { method: "DELETE", headers: authHeaders(token) },
  );
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(detail || `删除回复失败 (${res.status})`);
  }
}

// ---------------------------------------------------------------------------
// 可 @ 成员列表
// ---------------------------------------------------------------------------

export async function fetchCommunityMembers(
  courseId: string,
  token: string,
): Promise<CourseMember[]> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/community/members`,
    { headers: authHeaders(token), cache: "no-store" },
  );
  if (!res.ok) {
    const detail = await parseError(res);
    throw new Error(detail || `获取成员列表失败 (${res.status})`);
  }
  return res.json() as Promise<CourseMember[]>;
}
