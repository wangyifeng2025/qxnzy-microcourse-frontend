/**
 * 课程题库 API（教师/管理员）：与后端 `questions.http` 一致。
 * 浏览器端走 `/api` Next 代理；服务端可设 BACKEND_URL。
 */

const API_BASE =
  typeof window === "undefined"
    ? process.env.BACKEND_URL ?? "http://127.0.0.1:8080"
    : "";

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "essay";

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: string;
  course_id: string;
  chapter_id: string | null;
  video_id: string | null;
  created_by?: string;
  question_type: QuestionType;
  content: string;
  options: QuestionOption[] | null;
  correct_answer: string | string[] | boolean | null;
  explanation: string | null;
  default_score: string | number;
  created_at: string;
  updated_at: string;
}

export type CreateQuestionBody = {
  chapter_id?: string | null;
  video_id?: string | null;
  question_type: QuestionType;
  content: string;
  options?: QuestionOption[] | null;
  correct_answer?: string | string[] | boolean | null;
  explanation?: string | null;
  default_score: number;
};

/** PUT 全量替换，字段与 POST 一致 */
export type UpdateQuestionBody = CreateQuestionBody;

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      message?: string;
      detail?: string;
      error?: string;
    };
    return (
      body.message ?? body.detail ?? body.error ?? ""
    ).trim();
  } catch {
    return "";
  }
}

export async function fetchCourseQuestions(
  courseId: string,
  token: string,
  query?: { chapter_id?: string; video_id?: string },
): Promise<Question[]> {
  const params = new URLSearchParams();
  if (query?.chapter_id) params.set("chapter_id", query.chapter_id);
  if (query?.video_id) params.set("video_id", query.video_id);
  const qs = params.toString();
  const url = `${API_BASE}/api/courses/${courseId}/questions${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(
      detail || `获取题库失败 (${res.status})`,
    );
  }
  return res.json() as Promise<Question[]>;
}

export async function createCourseQuestion(
  courseId: string,
  token: string,
  body: CreateQuestionBody,
): Promise<Question> {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/questions`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `创建题目失败 (${res.status})`);
  }
  return res.json() as Promise<Question>;
}

export async function updateCourseQuestion(
  courseId: string,
  questionId: string,
  token: string,
  body: UpdateQuestionBody,
): Promise<Question> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/questions/${questionId}`,
    {
      method: "PUT",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `更新题目失败 (${res.status})`);
  }
  return res.json() as Promise<Question>;
}

export async function deleteCourseQuestion(
  courseId: string,
  questionId: string,
  token: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/questions/${questionId}`,
    {
      method: "DELETE",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok && res.status !== 204) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `删除题目失败 (${res.status})`);
  }
}

export const QUESTION_TYPE_ORDER: QuestionType[] = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "essay",
];

export function questionTypeLabel(t: QuestionType): string {
  switch (t) {
    case "single_choice":
      return "单选题";
    case "multiple_choice":
      return "多选题";
    case "true_false":
      return "判断题";
    case "essay":
      return "问答题";
    default:
      return t;
  }
}

/** POST /import 响应，与后端 `ImportResult` 一致 */
export interface QuestionImportErrorRow {
  index: number;
  message: string;
}

export interface QuestionImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: QuestionImportErrorRow[];
}

function parseFilenameFromContentDisposition(
  headerVal: string | null,
): string | null {
  if (!headerVal) return null;
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(headerVal);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1].replace(/"/g, "").trim());
  } catch {
    return m[1].replace(/"/g, "").trim();
  }
}

/**
 * GET /api/courses/:course_id/questions/export
 * 返回 .xlsx，可选 chapter_id / video_id 与列表接口一致。
 */
export async function exportCourseQuestionsXlsx(
  courseId: string,
  token: string,
  query?: { chapter_id?: string; video_id?: string },
): Promise<{ blob: Blob; filename: string | null }> {
  const params = new URLSearchParams();
  if (query?.chapter_id) params.set("chapter_id", query.chapter_id);
  if (query?.video_id) params.set("video_id", query.video_id);
  const qs = params.toString();
  const url = `${API_BASE}/api/courses/${courseId}/questions/export${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `导出失败 (${res.status})`);
  }
  const filename = parseFilenameFromContentDisposition(
    res.headers.get("Content-Disposition"),
  );
  const blob = await res.blob();
  return { blob, filename };
}

/**
 * POST /api/courses/:course_id/questions/import
 * multipart 字段名必须为 `file`（.xlsx）。
 */
export async function importCourseQuestionsXlsx(
  courseId: string,
  token: string,
  file: File,
): Promise<QuestionImportResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/questions/import`,
    {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    },
  );
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `导入失败 (${res.status})`);
  }
  return res.json() as Promise<QuestionImportResult>;
}
