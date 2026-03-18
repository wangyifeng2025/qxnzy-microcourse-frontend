export interface Course {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  major_id: string;
  teacher_id: string;
  teacher_name: string | null;
  status: "Draft" | "Published" | "Archived" | string;
  created_at: string;
  updated_at: string;
}

export interface CoursesResponse {
  page_size: number;
  has_more: boolean;
  next_cursor_created_at: string | null;
  next_cursor_id: string | null;
  items: Course[];
}

// Server-side: direct backend; client-side: Next.js rewrite proxy
const API_BASE =
  typeof window === "undefined" ? "http://127.0.0.1:8080" : "";

export async function fetchCourses(
  pageSize = 20,
  cursor?: { created_at: string; id: string }
): Promise<CoursesResponse> {
  const params = new URLSearchParams({ page_size: String(pageSize) });
  if (cursor) {
    params.set("cursor_created_at", cursor.created_at);
    params.set("cursor_id", cursor.id);
  }
  const res = await fetch(`${API_BASE}/api/courses?${params}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`获取课程列表失败: ${res.status}`);
  return res.json() as Promise<CoursesResponse>;
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function fetchChapters(courseId: string): Promise<Chapter[]> {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/chapters`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`获取章节列表失败: ${res.status}`);
  return res.json() as Promise<Chapter[]>;
}

export interface Video {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  duration: number;
  original_url: string | null;
  cover_url: string | null;
  status: "Pending" | "Processing" | "Ready" | "Failed" | string;
  sort_order: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export async function fetchVideos(chapterId: string): Promise<Video[]> {
  const res = await fetch(`${API_BASE}/api/chapters/${chapterId}/videos`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`获取视频列表失败: ${res.status}`);
  return res.json() as Promise<Video[]>;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export async function fetchCourse(id: string): Promise<Course> {
  const res = await fetch(`${API_BASE}/api/courses/${id}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404) throw new Error("COURSE_NOT_FOUND");
  if (!res.ok) throw new Error(`获取课程详情失败: ${res.status}`);
  return res.json() as Promise<Course>;
}

// Map course status to Chinese label
export const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  Published: { label: "已发布", color: "bg-green-50 text-green-600" },
  Draft: { label: "草稿", color: "bg-gray-100 text-gray-500" },
  Archived: { label: "已归档", color: "bg-amber-50 text-amber-600" },
};

// Deterministic fallback cover gradient based on course id
const COVER_GRADIENTS = [
  "from-blue-400 to-sky-500",
  "from-violet-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-orange-400 to-amber-500",
  "from-rose-400 to-pink-500",
  "from-cyan-400 to-blue-500",
];

export function getCoverGradient(id: string): string {
  const index = id.charCodeAt(0) % COVER_GRADIENTS.length;
  return COVER_GRADIENTS[index];
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
