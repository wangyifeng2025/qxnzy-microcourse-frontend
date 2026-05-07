"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Rocket,
  Trash2,
  Undo2,
  ClipboardCheck,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import {
  addQuestionToExamApi,
  getAttemptDetail,
  getExamDetail,
  gradeAttempt,
  listAllAttempts,
  removeQuestionFromExamApi,
  toggleExamPublish,
  updateExam,
  type AttemptDetailPayload,
  type ExamDetailPayload,
  type QuestionInExamRow,
  type QuizAttempt,
} from "@/lib/exams";
import { fetchCourseQuestions, questionTypeLabel, type Question } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const primary = "#0040a1";

export default function TeacherExamEditor({
  courseId,
  examId,
}: {
  courseId: string;
  examId: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExamDetailPayload | null>(null);
  const [bank, setBank] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null);
  const [pickQuestionId, setPickQuestionId] = useState<string>("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [totalScore, setTotalScore] = useState("");
  const [passScore, setPassScore] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");

  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [gradeTargetId, setGradeTargetId] = useState<string | null>(null);
  const [gradeDetail, setGradeDetail] = useState<AttemptDetailPayload | null>(
    null,
  );
  const [gradeLoading, setGradeLoading] = useState(false);
  const [essayScores, setEssayScores] = useState<Record<string, string>>({});
  const [gradeSaving, setGradeSaving] = useState(false);

  useEffect(() => {
    setToken(getToken());
  }, []);

  const reloadDetail = useCallback(async () => {
    const t = getToken();
    if (!t) throw new Error("请先登录");
    const d = await getExamDetail(courseId, examId, t);
    setDetail(d);
    setTitle(d.title);
    setDescription(d.description ?? "");
    setTimeLimit(d.time_limit != null ? String(d.time_limit) : "");
    setTotalScore(String(d.total_score));
    setPassScore(String(d.pass_score));
    setMaxAttempts(
      d.max_attempts != null && d.max_attempts !== undefined
        ? String(d.max_attempts)
        : "",
    );
    return d;
  }, [courseId, examId]);

  const reloadAttempts = useCallback(async () => {
    const t = getToken();
    if (!t) return;
    setAttemptsLoading(true);
    try {
      const list = await listAllAttempts(courseId, examId, t);
      setAttempts(list);
    } catch {
      setAttempts([]);
    } finally {
      setAttemptsLoading(false);
    }
  }, [courseId, examId]);

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
        await reloadDetail();
        const q = await fetchCourseQuestions(courseId, t);
        if (!c) setBank(q);
        void reloadAttempts();
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
  }, [courseId, examId, reloadDetail, reloadAttempts]);

  const inExamIds = useMemo(
    () => new Set((detail?.questions ?? []).map((q) => q.question_id)),
    [detail?.questions],
  );

  const bankChoices = useMemo(
    () => bank.filter((q) => !inExamIds.has(q.id)),
    [bank, inExamIds],
  );

  const handleSaveMeta = async () => {
    const t = token ?? getToken();
    if (!t) return;
    setSavingMeta(true);
    setError(null);
    try {
      const tlRaw = timeLimit.trim();
      const tlParsed =
        tlRaw === "" ? null : Math.max(0, Number.parseInt(tlRaw, 10));
      const maRaw = maxAttempts.trim();
      const maParsed =
        maRaw === "" ? null : Math.max(1, Number.parseInt(maRaw, 10));

      await updateExam(courseId, examId, t, {
        title: title.trim() || undefined,
        description: description.trim() ? description.trim() : null,
        time_limit:
          tlRaw === "" ? null : Number.isNaN(tlParsed) ? undefined : tlParsed,
        total_score: Number(totalScore),
        pass_score: Number(passScore),
        max_attempts:
          maRaw === "" ? null : Number.isNaN(maParsed) ? undefined : maParsed,
      });
      await reloadDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingMeta(false);
    }
  };

  const handlePublishToggle = async () => {
    const t = token ?? getToken();
    if (!t) return;
    setPublishBusy(true);
    setError(null);
    try {
      await toggleExamPublish(courseId, examId, t);
      await reloadDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setPublishBusy(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!pickQuestionId) return;
    const t = token ?? getToken();
    if (!t) return;
    setAddBusy(true);
    setError(null);
    try {
      await addQuestionToExamApi(examId, t, {
        question_id: pickQuestionId,
        sort_order: (detail?.questions.length ?? 0) + 1,
      });
      setPickQuestionId("");
      await reloadDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加失败");
    } finally {
      setAddBusy(false);
    }
  };

  const handleRemoveEntry = async (row: QuestionInExamRow) => {
    if (!confirm("从试卷中移除此题？题库中的题目不会被删除。")) return;
    const t = token ?? getToken();
    if (!t) return;
    setRemoveBusyId(row.entry_id);
    setError(null);
    try {
      await removeQuestionFromExamApi(examId, row.entry_id, t);
      await reloadDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "移除失败");
    } finally {
      setRemoveBusyId(null);
    }
  };

  const openGrading = async (attemptId: string) => {
    const t = token ?? getToken();
    if (!t) return;
    setGradeTargetId(attemptId);
    setGradeLoading(true);
    setGradeDetail(null);
    setEssayScores({});
    setError(null);
    try {
      const d = await getAttemptDetail(courseId, examId, attemptId, t);
      setGradeDetail(d);
      const drafts: Record<string, string> = {};
      for (const q of d.questions) {
        if (q.question_type === "essay" && q.earned_score == null) {
          drafts[q.question_id] = "";
        }
      }
      setEssayScores(drafts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载答卷失败");
      setGradeTargetId(null);
    } finally {
      setGradeLoading(false);
    }
  };

  const submitGrading = async () => {
    const t = token ?? getToken();
    if (!t || !gradeTargetId) return;
    const payload: Record<string, number> = {};
    for (const [qid, raw] of Object.entries(essayScores)) {
      const n = Number(raw);
      if (raw.trim() !== "" && !Number.isNaN(n) && n >= 0) {
        payload[qid] = n;
      }
    }
    if (Object.keys(payload).length === 0) {
      setError("请至少填写一道问答题得分");
      return;
    }
    setGradeSaving(true);
    setError(null);
    try {
      await gradeAttempt(courseId, examId, gradeTargetId, t, payload);
      await reloadAttempts();
      setGradeTargetId(null);
      setGradeDetail(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "批改失败");
    } finally {
      setGradeSaving(false);
    }
  };

  const sortedQuestions = useMemo(
    () =>
      [...(detail?.questions ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [detail?.questions],
  );

  if (loading && !detail) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#f9f9fc] p-8">
        <Loader2 className="size-8 animate-spin text-[#0040a1]" />
      </main>
    );
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#f9f9fc]">
      <div className="mx-auto max-w-screen-2xl px-4 pb-20 pt-6 md:px-8 md:pt-8 lg:px-16">
        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/teacher/courses/${courseId}/exams`}
            className="inline-flex items-center gap-1.5 font-medium text-[#424654] hover:text-[#0040a1]"
          >
            <ArrowLeft size={16} aria-hidden />
            返回试卷列表
          </Link>
          <span className="text-[#c3c6d6]">|</span>
          <Link
            href={`/teacher/courses/${courseId}/questions`}
            className="font-medium text-[#0040a1] hover:underline"
          >
            题库
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#1a1c1e]">
              {detail?.title ?? "试卷"}
            </h1>
            <p className="mt-2 text-sm text-[#424654]">
              卷面合计（有效分值）：
              <span className="font-semibold text-[#1a1c1e]">
                {detail?.computed_total_score ?? "—"}
              </span>
              {detail && detail.computed_total_score !== detail.total_score && (
                <span className="ml-2 text-amber-700">
                  （与设置满分 {detail.total_score} 不一致，请检查）
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={publishBusy || !detail}
              onClick={() => void handlePublishToggle()}
              className="gap-2"
            >
              {publishBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : detail?.is_published ? (
                <Undo2 className="size-4" />
              ) : (
                <Rocket className="size-4" />
              )}
              {detail?.is_published ? "取消发布" : "发布试卷"}
            </Button>
          </div>
        </header>

        <Card className="mb-8 border-[#c3c6d6]/20 shadow-sm">
          <CardHeader>
            <CardTitle>试卷设置</CardTitle>
            <CardDescription>保存后与后端 PUT 试卷接口同步。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>标题</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>说明</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={cn(
                  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
                  "focus-visible:ring-2 focus-visible:ring-[#0040a1]/30",
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>限时（分钟，留空不限）</Label>
              <Input
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label>最大答题次数（留空不限）</Label>
              <Input
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label>满分（名义）</Label>
              <Input
                value={totalScore}
                onChange={(e) => setTotalScore(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <Label>及格分</Label>
              <Input
                value={passScore}
                onChange={(e) => setPassScore(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="md:col-span-2">
              <Button
                type="button"
                disabled={savingMeta}
                onClick={() => void handleSaveMeta()}
                className="font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                {savingMeta ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                保存设置
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-[#c3c6d6]/20 shadow-sm">
          <CardHeader>
            <CardTitle>组题（来自题库）</CardTitle>
            <CardDescription>
              通过{" "}
              <code className="rounded bg-[#f3f3f6] px-1 text-xs">
                POST /api/exams/&#123;id&#125;/questions
              </code>{" "}
              添加题目。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label>选择题库题目</Label>
                <Select
                  value={pickQuestionId || "__pick__"}
                  onValueChange={(v) =>
                    setPickQuestionId(v === "__pick__" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="选择要加入的题目" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__pick__">请选择…</SelectItem>
                    {bankChoices.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        <span className="font-medium">
                          {questionTypeLabel(q.question_type)}
                        </span>{" "}
                        — {q.content.slice(0, 48)}
                        {q.content.length > 48 ? "…" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                disabled={!pickQuestionId || addBusy}
                onClick={() => void handleAddQuestion()}
                className="gap-2"
              >
                {addBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                加入试卷
              </Button>
            </div>

            <ol className="space-y-3">
              {sortedQuestions.map((row, idx) => (
                <li
                  key={row.entry_id}
                  className="flex flex-col gap-2 rounded-xl border border-[#eeeef0] bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-[#0040a1]">
                      第 {idx + 1} 题 · {questionTypeLabel(row.question_type)} ·{" "}
                      {String(row.score ?? row.default_score)} 分
                    </span>
                    <p className="mt-1 text-sm text-[#1a1c1e]">{row.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-red-600"
                    disabled={removeBusyId === row.entry_id}
                    onClick={() => void handleRemoveEntry(row)}
                  >
                    {removeBusyId === row.entry_id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    移除
                  </Button>
                </li>
              ))}
            </ol>
            {sortedQuestions.length === 0 && (
              <p className="text-sm text-[#424654]">尚未添加题目。</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#c3c6d6]/20 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-5" />
              学生答卷与批改
            </CardTitle>
            <CardDescription>
              问答题需在提交后填写得分；客观题已自动评分。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attemptsLoading ? (
              <Loader2 className="size-6 animate-spin text-[#0040a1]" />
            ) : (
              <ul className="space-y-2">
                {attempts.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#eeeef0] bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-xs text-[#424654]">
                      {a.id.slice(0, 8)}…
                    </span>
                    <span>
                      {a.submitted_at
                        ? `得分 ${a.score ?? "—"} · ${
                            a.is_graded ? "已批完" : "待批改"
                          }`
                        : "进行中"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!a.submitted_at}
                      onClick={() => void openGrading(a.id)}
                    >
                      查看 / 批改
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {attempts.length === 0 && !attemptsLoading && (
              <p className="text-sm text-[#424654]">暂无答题记录。</p>
            )}

            {gradeLoading && (
              <p className="flex items-center gap-2 text-sm text-[#424654]">
                <Loader2 className="size-4 animate-spin" />
                加载答卷…
              </p>
            )}

            {gradeDetail && (
              <div className="rounded-xl border border-[#0040a1]/20 bg-[#f5f7fc] p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="font-semibold text-[#1a1c1e]">
                    批改：{gradeDetail.id.slice(0, 8)}…
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setGradeTargetId(null);
                    setGradeDetail(null);
                  }}>
                    关闭
                  </Button>
                </div>
                <ul className="mb-4 max-h-64 space-y-3 overflow-y-auto text-sm">
                  {gradeDetail.questions.map((q) => (
                    <li
                      key={q.question_id}
                      className="rounded-lg border border-white bg-white/80 p-2"
                    >
                      <p className="font-medium text-[#1a1c1e]">
                        {questionTypeLabel(q.question_type)}（本题满分{" "}
                        {q.effective_score}）
                      </p>
                      <p className="text-xs text-[#424654]">{q.content}</p>
                      <p className="mt-1 text-xs">
                        得分：<strong>{q.earned_score ?? "待批改"}</strong>
                      </p>
                    </li>
                  ))}
                </ul>
                {Object.keys(essayScores).length > 0 ? (
                  <div className="space-y-3 border-t border-[#c3c6d6]/30 pt-3">
                    <p className="text-sm font-medium text-[#1a1c1e]">
                      问答题得分
                    </p>
                    {Object.keys(essayScores).map((qid) => (
                      <div key={qid} className="flex items-center gap-2">
                        <Label className="w-40 shrink-0 truncate font-mono text-xs">
                          {qid.slice(0, 8)}…
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={essayScores[qid] ?? ""}
                          onChange={(e) =>
                            setEssayScores((s) => ({
                              ...s,
                              [qid]: e.target.value,
                            }))
                          }
                          className="max-w-[120px]"
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      disabled={gradeSaving}
                      onClick={() => void submitGrading()}
                      className="text-white"
                      style={{ backgroundColor: primary }}
                    >
                      {gradeSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      保存问答题得分
                    </Button>
                  </div>
                ) : (
                  gradeDetail.is_graded && (
                    <p className="text-sm text-emerald-700">
                      该卷已全部批改完毕。
                    </p>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
