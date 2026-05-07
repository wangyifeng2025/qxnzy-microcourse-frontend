"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getToken } from "@/lib/auth";
import { getAttemptDetail, type AttemptDetailPayload } from "@/lib/exams";
import { questionTypeLabel } from "@/lib/questions";

function formatAnswer(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "正确" : "错误";
  if (Array.isArray(v)) return v.join("、");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function StudentExamAttemptDetail({
  courseId,
  examId,
  attemptId,
}: {
  courseId: string;
  examId: string;
  attemptId: string;
}) {
  const [detail, setDetail] = useState<AttemptDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const t = getToken();
        if (!t) {
          setError("请先登录");
          return;
        }
        const d = await getAttemptDetail(courseId, examId, attemptId, t);
        if (!c) {
          if (!d.submitted_at) {
            setError("该答卷尚未提交");
          } else {
            setDetail(d);
          }
        }
      } catch (e) {
        if (!c) setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [courseId, examId, attemptId]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0d0f14] text-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#111318] px-4 py-3 md:px-6">
        <Link
          href={`/courses/${courseId}/learn/exams/${examId}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-400 hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft size={15} aria-hidden />
          试卷首页
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-6">
        {loading && (
          <Loader2 className="mx-auto size-8 animate-spin text-blue-400" />
        )}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && detail && (
          <>
            <div className="rounded-2xl border border-white/10 bg-[#111318] p-6">
              <h1 className="text-xl font-bold">答卷结果</h1>
              <p className="mt-2 text-3xl font-extrabold text-blue-300">
                {detail.score ?? "—"}{" "}
                <span className="text-lg font-semibold text-slate-500">分</span>
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {detail.is_graded ? (
                  <span className="text-emerald-400">阅卷完成</span>
                ) : (
                  <span className="text-amber-400">含待批改题目</span>
                )}
                {detail.submitted_at && (
                  <span className="ml-2">
                    提交于{" "}
                    {new Date(detail.submitted_at).toLocaleString("zh-CN")}
                  </span>
                )}
              </p>
            </div>

            <ol className="mt-8 space-y-6">
              {detail.questions.map((q, idx) => (
                <li
                  key={q.question_id}
                  className="rounded-2xl border border-white/10 bg-[#111318] p-5"
                >
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="font-bold text-blue-400">{idx + 1}.</span>
                    {questionTypeLabel(q.question_type)} · 满分 {q.effective_score}
                  </div>
                  <p className="mt-2 text-[15px] text-slate-100">{q.content}</p>
                  <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                    <p className="text-slate-400">
                      你的作答：{" "}
                      <span className="text-white">
                        {formatAnswer(q.student_answer)}
                      </span>
                    </p>
                    <p className="text-slate-400">
                      得分：{" "}
                      <span className="font-semibold text-white">
                        {q.earned_score ?? "待批改"}
                      </span>
                      {q.is_correct != null && (
                        <span
                          className={
                            q.is_correct ? "text-emerald-400" : "text-red-300"
                          }
                        >
                          {" "}
                          （{q.is_correct ? "正确" : "错误"}）
                        </span>
                      )}
                    </p>
                    {q.correct_answer != null && (
                      <p className="text-slate-400">
                        参考答案：{" "}
                        <span className="text-slate-200">
                          {formatAnswer(q.correct_answer)}
                        </span>
                      </p>
                    )}
                    {q.explanation && (
                      <p className="text-slate-500">解析：{q.explanation}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </main>
    </div>
  );
}
