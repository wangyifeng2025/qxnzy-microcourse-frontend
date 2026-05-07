"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Plus,
  ScrollText,
  Trash2,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import {
  createExam,
  deleteExam,
  listCourseExams,
  type CourseExam,
} from "@/lib/exams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const primary = "#0040a1";

export default function TeacherCourseExams({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [exams, setExams] = useState<CourseExam[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  useEffect(() => {
    setToken(getToken());
  }, []);

  const reload = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setError("请先登录");
      setExams([]);
      return;
    }
    const list = await listCourseExams(courseId, t);
    setExams(list);
  }, [courseId]);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const t = getToken();
        if (!t) {
          setError("请先登录后再管理试卷");
          setExams([]);
          return;
        }
        const list = await listCourseExams(courseId, t);
        if (!c) setExams(list);
      } catch (e) {
        if (!c) {
          setError(e instanceof Error ? e.message : "加载失败");
          setExams([]);
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [courseId]);

  const handleCreate = async () => {
    const t = token ?? getToken();
    if (!t) return;
    const title = newTitle.trim();
    if (!title) {
      setError("请填写试卷标题");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const exam = await createExam(courseId, t, {
        title,
        description: null,
        time_limit: null,
        total_score: 100,
        pass_score: 60,
        max_attempts: null,
        chapter_id: null,
      });
      setNewTitle("");
      router.push(`/teacher/courses/${courseId}/exams/${exam.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (examId: string) => {
    if (!confirm("确定删除该试卷？组卷与答题记录将一并清除。")) return;
    const t = token ?? getToken();
    if (!t) return;
    setDeleteBusyId(examId);
    setError(null);
    try {
      await deleteExam(courseId, examId, t);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeleteBusyId(null);
    }
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#f9f9fc]">
      <div className="mx-auto max-w-screen-2xl px-4 pb-16 pt-6 md:px-8 md:pt-8 lg:px-16">
        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/teacher"
            className="inline-flex items-center gap-1.5 font-medium text-[#424654] transition-colors hover:text-[#0040a1]"
          >
            <ArrowLeft size={16} aria-hidden />
            返回课程管理
          </Link>
          <span className="text-[#c3c6d6]">|</span>
          <Link
            href={`/teacher/courses/${courseId}/questions`}
            className="font-medium text-[#0040a1] hover:underline"
          >
            题库
          </Link>
        </div>

        <header className="mb-10 flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-[#0040a1]">
            <ScrollText className="size-5" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wider">
              试卷
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1a1c1e] md:text-4xl">
            出卷与发布
          </h1>
          <p className="max-w-2xl text-base text-[#424654]">
            创建试卷后从题库组题并发布，学员在学习页「课程测试」中作答。
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card className="mb-10 border-[#c3c6d6]/20 shadow-sm">
          <CardHeader className="border-b border-[#eeeef0]">
            <CardTitle>新建试卷</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label>标题</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="例如：第一章随堂测"
              />
            </div>
            <Button
              type="button"
              disabled={creating || !token}
              className="gap-2 font-bold text-white sm:shrink-0"
              style={{
                background: `linear-gradient(135deg, ${primary} 0%, #0056d2 100%)`,
              }}
              onClick={() => void handleCreate()}
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              创建并组题
            </Button>
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-4 text-lg font-bold text-[#1a1c1e]">试卷列表</h2>
          {loading && (
            <p className="flex items-center gap-2 text-sm text-[#424654]">
              <Loader2 className="size-4 animate-spin" />
              加载中…
            </p>
          )}
          {!loading && exams && exams.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#c3c6d6] bg-white/60 px-6 py-12 text-center text-sm text-[#424654]">
              暂无试卷，请在上方创建。
            </p>
          )}
          <ul className="space-y-3">
            {(exams ?? []).map((exam) => (
              <li
                key={exam.id}
                className="flex flex-col gap-3 rounded-xl border border-[#c3c6d6]/15 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/teacher/courses/${courseId}/exams/${exam.id}`}
                    className="text-lg font-bold text-[#1a1c1e] hover:text-[#0040a1]"
                  >
                    {exam.title}
                  </Link>
                  <p className="mt-1 flex flex-wrap gap-2 text-xs text-[#424654]">
                    <span
                      className={
                        exam.is_published
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800"
                          : "rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700"
                      }
                    >
                      {exam.is_published ? "已发布" : "草稿"}
                    </span>
                    <span>满分 {exam.total_score}</span>
                    <span>及格 {exam.pass_score}</span>
                    {exam.time_limit != null && (
                      <span>限时 {exam.time_limit} 分钟</span>
                    )}
                    {exam.max_attempts != null && (
                      <span>最多 {exam.max_attempts} 次</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/teacher/courses/${courseId}/exams/${exam.id}`}
                    >
                      编辑 / 组题
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    disabled={deleteBusyId === exam.id}
                    onClick={() => void handleDelete(exam.id)}
                  >
                    {deleteBusyId === exam.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    删除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
