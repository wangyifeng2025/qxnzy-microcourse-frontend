/**
 * 课程试卷与答题 API（与后端 `questions.http` 第 4–7 节一致）
 */

import type { QuestionType } from "@/lib/questions";

const API_BASE =
  typeof window === "undefined"
    ? process.env.BACKEND_URL ?? "http://127.0.0.1:8080"
    : "";

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      message?: string;
      detail?: string;
      error?: string;
    };
    return (body.message ?? body.detail ?? body.error ?? "").trim();
  } catch {
    return "";
  }
}

export interface CourseExam {
  id: string;
  course_id: string;
  chapter_id: string | null;
  title: string;
  description: string | null;
  time_limit: number | null;
  total_score: string;
  pass_score: string;
  max_attempts: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionInExamRow {
  entry_id: string;
  quiz_id: string;
  question_id: string;
  score: string | null;
  sort_order: number;
  entry_created_at: string;
  question_type: QuestionType;
  content: string;
  options: unknown;
  correct_answer: unknown;
  explanation: string | null;
  default_score: string;
  chapter_id: string | null;
  video_id: string | null;
}

/** GET exam 详情（含 flatten 的试卷字段） */
export type ExamDetailPayload = CourseExam & {
  questions: QuestionInExamRow[];
  computed_total_score: string;
};

export type CreateExamBody = {
  course_id: string;
  chapter_id?: string | null;
  title: string;
  description?: string | null;
  time_limit?: number | null;
  total_score?: number | null;
  pass_score?: number | null;
  max_attempts?: number | null;
};

export type UpdateExamBody = {
  title?: string | null;
  description?: string | null;
  time_limit?: number | null;
  total_score?: number | null;
  pass_score?: number | null;
  max_attempts?: number | null;
};

export async function listCourseExams(
  courseId: string,
  token: string,
): Promise<CourseExam[]> {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/exams`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `获取试卷列表失败 (${res.status})`);
  }
  return res.json() as Promise<CourseExam[]>;
}

export async function getExamDetail(
  courseId: string,
  examId: string,
  token: string,
): Promise<ExamDetailPayload> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/exams/${examId}`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `获取试卷失败 (${res.status})`);
  }
  return res.json() as Promise<ExamDetailPayload>;
}

export async function createExam(
  courseId: string,
  token: string,
  body: Omit<CreateExamBody, "course_id">,
): Promise<CourseExam> {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/exams`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...body,
      course_id: courseId,
    } satisfies CreateExamBody),
  });
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `创建试卷失败 (${res.status})`);
  }
  return res.json() as Promise<CourseExam>;
}

export async function updateExam(
  courseId: string,
  examId: string,
  token: string,
  body: UpdateExamBody,
): Promise<CourseExam> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/exams/${examId}`,
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
    throw new Error(detail || `更新试卷失败 (${res.status})`);
  }
  return res.json() as Promise<CourseExam>;
}

export async function deleteExam(
  courseId: string,
  examId: string,
  token: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/exams/${examId}`,
    {
      method: "DELETE",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok && res.status !== 204) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `删除试卷失败 (${res.status})`);
  }
}

export async function toggleExamPublish(
  courseId: string,
  examId: string,
  token: string,
): Promise<{ exam_id: string; is_published: boolean; message: string }> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/exams/${examId}/publish`,
    {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `切换发布状态失败 (${res.status})`);
  }
  return res.json() as Promise<{
    exam_id: string;
    is_published: boolean;
    message: string;
  }>;
}

export async function listExamQuestionsApi(
  examId: string,
  token: string,
): Promise<QuestionInExamRow[]> {
  const res = await fetch(`${API_BASE}/api/exams/${examId}/questions`, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `获取组卷列表失败 (${res.status})`);
  }
  return res.json() as Promise<QuestionInExamRow[]>;
}

export async function addQuestionToExamApi(
  examId: string,
  token: string,
  body: { question_id: string; score?: number | null; sort_order?: number | null },
): Promise<QuestionInExamRow> {
  const res = await fetch(`${API_BASE}/api/exams/${examId}/questions`, {
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
    throw new Error(detail || `添加题目失败 (${res.status})`);
  }
  return res.json() as Promise<QuestionInExamRow>;
}

export async function removeQuestionFromExamApi(
  examId: string,
  entryId: string,
  token: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/exams/${examId}/questions/${entryId}`,
    {
      method: "DELETE",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok && res.status !== 204) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `移除题目失败 (${res.status})`);
  }
}

// --- 答题 ---

export interface ExamQuestionForStudent {
  question_id: string;
  question_type: QuestionType;
  content: string;
  options: unknown;
  score: string;
  sort_order: number;
}

export interface StartAttemptResponse {
  attempt_id: string;
  quiz_id: string;
  title: string;
  description: string | null;
  time_limit: number | null;
  total_score: string;
  pass_score: string;
  questions: ExamQuestionForStudent[];
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: string | null;
  answers: unknown;
  question_scores: unknown;
  is_graded: boolean;
  started_at: string;
  submitted_at: string | null;
  time_spent: number | null;
}

export interface AttemptQuestionResult {
  question_id: string;
  question_type: QuestionType;
  content: string;
  options: unknown;
  effective_score: string;
  student_answer: unknown;
  earned_score: string | null;
  is_correct: boolean | null;
  correct_answer: unknown;
  explanation: string | null;
}

export type AttemptDetailPayload = QuizAttempt & {
  questions: AttemptQuestionResult[];
};

export async function startAttempt(
  courseId: string,
  examId: string,
  token: string,
): Promise<StartAttemptResponse> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/exams/${examId}/attempts`,
    {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `开始答题失败 (${res.status})`);
  }
  return res.json() as Promise<StartAttemptResponse>;
}

export async function submitAttempt(
  courseId: string,
  examId: string,
  attemptId: string,
  token: string,
  body: { answers: Record<string, unknown>; time_spent?: number | null },
): Promise<QuizAttempt> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/exams/${examId}/attempts/${attemptId}/submit`,
    {
      method: "POST",
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
    throw new Error(detail || `提交失败 (${res.status})`);
  }
  return res.json() as Promise<QuizAttempt>;
}

export async function getMyAttempts(
  courseId: string,
  examId: string,
  token: string,
): Promise<QuizAttempt[]> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/exams/${examId}/attempts/my`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `获取答题记录失败 (${res.status})`);
  }
  return res.json() as Promise<QuizAttempt[]>;
}

export async function getAttemptDetail(
  courseId: string,
  examId: string,
  attemptId: string,
  token: string,
): Promise<AttemptDetailPayload> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/exams/${examId}/attempts/${attemptId}`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `获取答卷详情失败 (${res.status})`);
  }
  return res.json() as Promise<AttemptDetailPayload>;
}

export async function listAllAttempts(
  courseId: string,
  examId: string,
  token: string,
): Promise<QuizAttempt[]> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/exams/${examId}/attempts`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `获取全部答卷失败 (${res.status})`);
  }
  return res.json() as Promise<QuizAttempt[]>;
}

export async function gradeAttempt(
  courseId: string,
  examId: string,
  attemptId: string,
  token: string,
  essay_scores: Record<string, number>,
): Promise<QuizAttempt> {
  const res = await fetch(
    `${API_BASE}/api/courses/${courseId}/exams/${examId}/attempts/${attemptId}/grade`,
    {
      method: "PUT",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ essay_scores }),
    },
  );
  if (!res.ok) {
    const detail = await parseErrorMessage(res);
    throw new Error(detail || `批改失败 (${res.status})`);
  }
  return res.json() as Promise<QuizAttempt>;
}
