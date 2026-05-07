"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  PlayCircle,
  History,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import {
  getExamDetail,
  getMyAttempts,
  startAttempt,
  type ExamDetailPayload,
  type QuizAttempt,
} from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function StudentExamHub({
  courseId,
  examId,
}: {
  courseId: string;
  examId: string;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<ExamDetailPayload | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startBusy, setStartBusy] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const t = getToken();
        if (!t) {
          setError("请先登录并选课后再查看测试");
          return;
        }
        const [ex, att] = await Promise.all([
          getExamDetail(courseId, examId, t),
          getMyAttempts(courseId, examId, t),
        ]);
        if (!c) {
          setDetail(ex);
          setAttempts(att);
        }
      } catch (e) {
        if (!c) {
          setError(e instanceof Error ? e.message : "加载失败");
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [courseId, examId]);

  const inProgress = attempts.find((a) => a.submitted_at == null);
  const submitted = attempts.filter((a) => a.submitted_at != null);
  const atLimit =
    detail != null &&
    detail.max_attempts != null &&
    submitted.length >= detail.max_attempts &&
    !inProgress;

  const handleStart = async () => {
    const t = getToken();
    if (!t) return;
    setStartBusy(true);
    setError(null);
    try {
      const res = await startAttempt(courseId, examId, t);
      router.push(
        `/courses/${courseId}/learn/exams/${examId}/take/${res.attempt_id}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法开始答题");
    } finally {
      setStartBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#0d0f14] text-white">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#111318] px-4 py-3 md:px-6">
        <Link
          href={`/courses/${courseId}/learn`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-400 hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft size={15} aria-hidden />
          返回学习
        </Link>
        <span className="text-white/20">|</span>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold md:text-base">
          {detail?.title ?? "试卷"}
        </h1>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:px-6">
        {loading && (
          <p className="flex items-center gap-2 text-slate-400">
            <Loader2 className="size-5 animate-spin" />
            加载中…
          </p>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && detail && (
          <div className="space-y-8">
            <section className="rounded-2xl border border-white/10 bg-[#111318] p-6">
              <h2 className="text-lg font-bold text-white">{detail.title}</h2>
              {detail.description && (
                <p className="mt-2 text-sm text-slate-400">{detail.description}</p>
              )}
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500 sm:grid-cols-4">
                <div>
                  <dt>题目数</dt>
                  <dd className="font-semibold text-slate-300">
                    {detail.questions.length}
                  </dd>
                </div>
                <div>
                  <dt>满分</dt>
                  <dd className="font-semibold text-slate-300">
                    {detail.total_score}
                  </dd>
                </div>
                <div>
                  <dt>及格</dt>
                  <dd className="font-semibold text-slate-300">
                    {detail.pass_score}
                  </dd>
                </div>
                <div>
                  <dt>限时</dt>
                  <dd className="font-semibold text-slate-300">
                    {detail.time_limit != null
                      ? `${detail.time_limit} 分钟`
                      : "不限"}
                  </dd>
                </div>
              </dl>
              {detail.max_attempts != null && (
                <p className="mt-3 text-xs text-slate-500">
                  最多作答 {detail.max_attempts} 次（已提交 {submitted.length}{" "}
                  次）
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {inProgress ? (
                  <Button
                    asChild
                    className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
                  >
                    <Link
                      href={`/courses/${courseId}/learn/exams/${examId}/take/${inProgress.id}`}
                    >
                      <PlayCircle className="size-4" />
                      继续答题
                    </Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={startBusy || atLimit}
                    className="gap-2 bg-blue-600 text-white hover:bg-blue-500"
                    onClick={() => void handleStart()}
                    title={
                      atLimit
                        ? `已达最多 ${detail.max_attempts} 次作答`
                        : undefined
                    }
                  >
                    {startBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <PlayCircle className="size-4" />
                    )}
                    开始答题
                  </Button>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                <History className="size-4" />
                我的记录
              </h3>
              {submitted.length === 0 ? (
                <p className="text-sm text-slate-500">暂无已提交记录。</p>
              ) : (
                <ul className="space-y-2">
                  {submitted.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/courses/${courseId}/learn/exams/${examId}/attempt/${a.id}`}
                        className={cn(
                          "flex items-center justify-between rounded-xl border border-white/10 bg-[#111318] px-4 py-3 text-sm transition-colors hover:border-blue-500/30 hover:bg-white/5",
                        )}
                      >
                        <span className="text-slate-400">
                          {a.submitted_at
                            ? new Date(a.submitted_at).toLocaleString("zh-CN")
                            : ""}
                        </span>
                        <span className="font-medium text-slate-200">
                          得分 {a.score ?? "—"}
                          {!a.is_graded && (
                            <span className="ml-2 text-amber-400">待批改</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
