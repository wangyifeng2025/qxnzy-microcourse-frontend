// 发现页 API：GET /api/discover/*，无需登录（与 rest-test/discover.http 一致）

const API_BASE =
  typeof window === "undefined"
    ? process.env.BACKEND_URL ?? "http://127.0.0.1:8080"
    : "";

async function parseErr(res: Response): Promise<string> {
  try {
    const b = (await res.json()) as { message?: string; detail?: string; error?: string };
    return (b.message ?? b.detail ?? b.error ?? "").trim();
  } catch {
    return "";
  }
}

export interface DiscoverPopularCourse {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  major_id: string | null;
  major_name?: string | null;
  teacher_id: string;
  teacher_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  vote_count: number;
  enrollment_count: number;
}

export interface DiscoverActiveTeacher {
  user_id: string;
  username: string;
  real_name: string | null;
  avatar_url: string | null;
  published_course_count: number;
  total_student_count: number;
  recent_activity_count: number;
}

export interface DiscoverLatestTopic {
  id: string;
  author_id: string;
  author_username: string;
  author_real_name: string | null;
  author_avatar_url: string | null;
  author_role: string;
  title: string;
  content_preview: string;
  reply_count: number;
  created_at: string;
  source: "course" | "community";
  source_id: string | null;
  source_title: string | null;
}

export async function fetchDiscoverPopularCourses(
  limit = 10,
): Promise<DiscoverPopularCourse[]> {
  const p = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${API_BASE}/api/discover/popular-courses?${p}`, {
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error((await parseErr(res)) || `discover popular-courses (${res.status})`);
  return res.json() as Promise<DiscoverPopularCourse[]>;
}

export async function fetchDiscoverActiveTeachers(limit = 10): Promise<DiscoverActiveTeacher[]> {
  const p = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${API_BASE}/api/discover/active-teachers?${p}`, {
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error((await parseErr(res)) || `discover active-teachers (${res.status})`);
  return res.json() as Promise<DiscoverActiveTeacher[]>;
}

export async function fetchDiscoverLatestTopics(limit = 10): Promise<DiscoverLatestTopic[]> {
  const p = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${API_BASE}/api/discover/latest-topics?${p}`, {
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error((await parseErr(res)) || `discover latest-topics (${res.status})`);
  return res.json() as Promise<DiscoverLatestTopic[]>;
}

export function discoverTopicHref(topic: DiscoverLatestTopic): string {
  const src = String(topic.source).toLowerCase();
  if (src === "course" && topic.source_id) {
    return `/courses/${topic.source_id}#course-community`;
  }
  return `/community/${topic.id}`;
}
