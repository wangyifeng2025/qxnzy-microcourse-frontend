"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { getToken } from "@/lib/auth";
import {
  getAttemptDetail,
  submitAttempt,
  type AttemptDetailPayload,
  type AttemptQuestionResult,
} from "@/lib/exams";
import { questionTypeLabel } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function parseOptions(raw: unknown): { key: string; text: string }[] {
  if (!raw || !Array.isArray(raw)) return [];
  const out: { key: string; text: string }[] = [];
  for (const x of raw) {
    if (x && typeof x === "object" && "key" in x && "text" in x) {
      out.push({
        key: String((x as { key: unknown }).key),
        text: String((x as { text: unknown }).text),
      });
    }
  }
  return out;
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: AttemptQuestionResult;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const opts = parseOptions(q.options);

  if (q.question_type === "single_choice") {
    const sel = typeof value === "string" ? value : "";
    return (
      <div className="mt-3 space-y-2">
        {opts.map((o) => (
          <label
            key={o.key}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
              sel === o.key
                ? "border-blue-500/50 bg-blue-500/10"
                : "border-white/10 hover:bg-white/5",
            )}
          >
            <input
              type="radio"
              name={q.question_id}
              className="size-4"
              checked={sel === o.key}
              onChange={() => onChange(o.key)}
            />
            <span>
              <span className="font-semibold text-blue-300">{o.key}.</span>{" "}
              {o.text}
            </span>
          </label>
        ))}
      </div>
    );
  }

  if (q.question_type === "multiple_choice") {
    const arr = Array.isArray(value)
      ? value.map((x) => String(x))
      : typeof value === "string"
        ? [value]
        : [];
    const set = new Set(arr);
    const toggle = (k: string) => {
      const next = new Set(set);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      onChange([...next].sort());
    };
    return (
      <div className="mt-3 space-y-2">
        {opts.map((o) => (
          <label
            key={o.key}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
              set.has(o.key)
                ? "border-blue-500/50 bg-blue-500/10"
                : "border-white/10 hover:bg-white/5",
            )}
          >
            <input
              type="checkbox"
              className="size-4 rounded border-white/20"
              checked={set.has(o.key)}
              onChange={() => toggle(o.key)}
            />
            <span>
              <span className="font-semibold text-blue-300">{o.key}.</span>{" "}
              {o.text}
            </span>
          </label>
        ))}
      </div>
    );
  }

  if (q.question_type === "true_false") {
    const b = typeof value === "boolean" ? value : null;
    return (
      <div className="mt-3 flex flex-wrap gap-3">
        {(
          [
            [true, "正确"],
            [false, "错误"],
          ] as const
        ).map(([val, label]) => (
          <label
            key={String(val)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm",
              b === val
                ? "border-blue-500/50 bg-blue-500/10"
                : "border-white/10 hover:bg-white/5",
            )}
          >
            <input
              type="radio"
              name={q.question_id}
              className="size-4"
              checked={b === val}
              onChange={() => onChange(val)}
            />
            {label}
          </label>
        ))}
      </div>
    );
  }

  const text = typeof value === "string" ? value : "";
  return (
    <textarea
      value={text}
      onChange={(e) => onChange(e.target.value)}
      rows={5}
      className="mt-3 w-full rounded-lg border border-white/15 bg-[#0d0f14] px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
      placeholder="请输入作答内容"
    />
  );
}

export default function StudentExamTake({
  courseId,
  examId,
  attemptId,
}: {
  courseId: string;
  examId: string;
  attemptId: string;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<AttemptDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitBusy, setSubmitBusy] = useState(false);
  const [startedAt] = useState(() => Date.now());

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
          if (d.submitted_at) {
            router.replace(
              `/courses/${courseId}/learn/exams/${examId}/attempt/${attemptId}`,
            );
            return;
          }
          setDetail(d);
          const init: Record<string, unknown> = {};
          for (const q of d.questions) {
            if (q.question_type === "multiple_choice") init[q.question_id] = [];
            else if (q.question_type === "true_false")
              init[q.question_id] = null;
            else if (q.question_type === "essay") init[q.question_id] = "";
            else init[q.question_id] = "";
          }
          setAnswers(init);
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
  }, [courseId, examId, attemptId, router]);

  const handleSubmit = async () => {
    if (!confirm("确定提交？提交后不可修改。")) return;
    const t = getToken();
    if (!t) return;
    setSubmitBusy(true);
    setError(null);
    try {
      const timeSpent = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000),
      );
      await submitAttempt(courseId, examId, attemptId, t, {
        answers,
        time_spent: timeSpent,
      });
      router.push(
        `/courses/${courseId}/learn/exams/${examId}/attempt/${attemptId}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitBusy(false);
    }
  };

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

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">
        {loading && (
          <Loader2 className="mx-auto size-8 animate-spin text-blue-400" />
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && detail && (
          <>
            <h1 className="text-xl font-bold">答题中</h1>
            <p className="mt-1 text-sm text-slate-500">
              共 {detail.questions.length} 题，请逐题作答后提交。
            </p>

            <ol className="mt-8 space-y-10">
              {detail.questions.map((q, idx) => (
                <li
                  key={q.question_id}
                  className="rounded-2xl border border-white/10 bg-[#111318] p-5"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-bold text-blue-400">
                      {idx + 1}.
                    </span>
                    <span className="text-xs text-slate-500">
                      {questionTypeLabel(q.question_type)} · 本题 {q.effective_score}{" "}
                      分
                    </span>
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed text-slate-100">
                    {q.content}
                  </p>
                  <QuestionInput
                    q={q}
                    value={answers[q.question_id]}
                    onChange={(v) =>
                      setAnswers((a) => ({ ...a, [q.question_id]: v }))
                    }
                  />
                </li>
              ))}
            </ol>

            <div className="sticky bottom-0 mt-10 border-t border-white/10 bg-[#0d0f14]/95 py-4 backdrop-blur">
              <Button
                type="button"
                disabled={submitBusy}
                className="w-full gap-2 bg-blue-600 py-6 text-base font-semibold text-white hover:bg-blue-500 sm:w-auto"
                onClick={() => void handleSubmit()}
              >
                {submitBusy ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Send className="size-5" />
                )}
                提交答卷
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
