/**
 * 选课 API：GET/POST/DELETE /api/courses/:course_id/enroll
 * 需 Authorization: Bearer（任意已登录用户）
 */

import type { Course } from "@/lib/courses";

export interface EnrollmentRecord {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

export interface EnrollmentStatusResponse {
  enrolled: boolean;
  enrollment: EnrollmentRecord | null;
}

/** GET /api/courses/enrolled 响应结构，与 CoursesResponse 同构 */
export interface MyEnrollmentsResponse {
  page_size: number;
  has_more: boolean;
  next_cursor_created_at: string | null;
  next_cursor_id: string | null;
  items: Course[];
}

const API_BASE =
  typeof window === "undefined"
    ? process.env.BACKEND_URL ?? "http://127.0.0.1:8080"
    : "";

async function parseErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  if (!text.trim()) return `HTTP ${res.status}`;
  try {
    const j = JSON.parse(text) as {
      message?: string;
      detail?: string;
      error?: string;
    };
    return (
      j.message ?? j.detail ?? j.error ?? text
    ).trim();
  } catch {
    return text.trim();
  }
}

/**
 * GET /api/courses/:course_id/enroll — 当前用户是否已选该课
 */
export async function fetchEnrollmentStatus(
  token: string,
  courseId: string,
): Promise<EnrollmentStatusResponse> {
  const res = await fetch(
    `${API_BASE}/api/courses/${encodeURIComponent(courseId)}/enroll`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new Error(
      msg ? `查询选课状态失败: ${res.status} — ${msg}` : `查询选课状态失败: ${res.status}`,
    );
  }
  return res.json() as Promise<EnrollmentStatusResponse>;
}

/**
 * POST /api/courses/:course_id/enroll — 选课（已发布课程，幂等）
 */
export async function enrollCourse(
  token: string,
  courseId: string,
): Promise<EnrollmentRecord> {
  const res = await fetch(
    `${API_BASE}/api/courses/${encodeURIComponent(courseId)}/enroll`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new Error(
      msg ? `选课失败: ${res.status} — ${msg}` : `选课失败: ${res.status}`,
    );
  }
  const data = (await res.json()) as EnrollmentRecord;
  return data;
}

/**
 * GET /api/courses/enrolled?page_size=20— 当前用户全部已选课程（含课程详情），需 Bearer。
 */
export async function fetchMyEnrollments(
  token: string,
): Promise<MyEnrollmentsResponse> {
  const res = await fetch(`${API_BASE}/api/courses/enrolled?page_size=20`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new Error(
      msg ? `获取我的课程失败: ${res.status} — ${msg}` : `获取我的课程失败: ${res.status}`,
    );
  }
  return res.json() as Promise<MyEnrollmentsResponse>;
}

/**
 * DELETE /api/courses/:course_id/enroll — 取消选课
 */
export async function unenrollCourse(
  token: string,
  courseId: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/courses/${encodeURIComponent(courseId)}/enroll`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const msg = await parseErrorMessage(res);
    throw new Error(
      msg ? `取消选课失败: ${res.status} — ${msg}` : `取消选课失败: ${res.status}`,
    );
  }
}
