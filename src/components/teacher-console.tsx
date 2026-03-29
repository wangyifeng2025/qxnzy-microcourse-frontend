"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Users,
  BookOpen,
  Pencil,
  Trash2,
  ImagePlus,
  Rocket,
  Loader2,
  Search,
  Eye,
  LineChart,
  Star,
  ArrowLeft,
} from "lucide-react";
import { getToken, getUser, type UserInfo } from "@/lib/auth";
import {
  fetchManageCourses,
  getCoverGradient,
  type Course,
} from "@/lib/courses";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const surface = "bg-[#f9f9fc]";
const primary = "#0040a1";
const tertiary = "#872200";

/** 表头与课程行共用列模板（仅 md+ 生效），保证四列对齐 */
const courseTableCols =
  "md:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_minmax(13.5rem,auto)] md:gap-x-6";
const courseTableGridRow = cn(
  "grid grid-cols-1 gap-y-4 md:grid md:gap-y-0",
  courseTableCols,
  "md:items-center",
);

function categoryTag(id: string): string {
  const pool = ["精品微课", "通识", "专业进阶", "实战"];
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return pool[n % pool.length];
}

export default function TeacherConsole() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        if (!token) {
          setError("请先登录后查看课程管理");
          setCourses([]);
          return;
        }
        const res = await fetchManageCourses({ token }, 100);
        if (cancelled) return;
        setCourses(res.items ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "加载失败");
        setCourses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";

  const myCourses = useMemo(() => {
    if (!courses) return [];
    if (isAdmin) return courses;
    const teacherId = user?.id;
    if (!teacherId) return courses;
    return courses.filter((c) => c.teacher_id === teacherId);
  }, [courses, user?.id, isAdmin]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return myCourses;
    return myCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false),
    );
  }, [myCourses, searchQuery]);

  const publishedCount = myCourses.filter(
    (c) => String(c.status).toLowerCase() === "published",
  ).length;
  const draftCount = myCourses.filter(
    (c) => String(c.status).toLowerCase() === "draft",
  ).length;

  const isCoursePublished = (status: string) =>
    String(status).toLowerCase() === "published";

  const publishCourse = async (courseId: string) => {
    const token = getToken();
    if (!token) {
      setError("请先登录");
      return;
    }
    if (
      !confirm("确定将课程发布为「已发布」吗？发布后学员可在前台看到该课程。")
    ) {
      return;
    }
    setError(null);
    setPublishingId(courseId);
    try {
      const payload = { status: "Published" as const };
      const endpoint = `/api/courses/${courseId}`;
      const patchRes = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (patchRes.status === 405) {
        const putRes = await fetch(endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        let body: { message?: string } = {};
        try {
          body = (await putRes.json()) as { message?: string };
        } catch {
          body = {};
        }
        if (!putRes.ok) {
          throw new Error(body?.message ?? `发布失败 (${putRes.status})`);
        }
      } else {
        let body: { message?: string } = {};
        try {
          body = (await patchRes.json()) as { message?: string };
        } catch {
          body = {};
        }
        if (!patchRes.ok) {
          throw new Error(body?.message ?? `发布失败 (${patchRes.status})`);
        }
      }

      setCourses((prev) =>
        (prev ?? []).map((c) =>
          c.id === courseId ? { ...c, status: "Published" } : c,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "发布失败");
    } finally {
      setPublishingId(null);
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm("确认删除该课程吗？删除后不可恢复。")) return;
    const token = getToken();
    if (!token) {
      setError("请先登录");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      let body: { message?: string } | null = null;
      try {
        body = (await res.json()) as { message?: string };
      } catch {
        body = null;
      }
      if (!res.ok) {
        throw new Error(body?.message ?? `删除课程失败 (${res.status})`);
      }
      setCourses((prev) => (prev ?? []).filter((c) => c.id !== courseId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除课程失败");
    } finally {
      setLoading(false);
    }
  };

  const statusBadgeClass = (status: string) => {
    const s = String(status).toLowerCase();
    if (s === "published") return "bg-emerald-100 text-emerald-800";
    if (s === "archived") return "bg-amber-100 text-amber-800";
    return "bg-slate-200 text-slate-700";
  };

  const statusLabel = (status: string) => {
    const s = String(status).toLowerCase();
    if (s === "published") return "已发布";
    if (s === "archived") return "已归档";
    if (s === "draft") return "草稿";
    return status;
  };

  return (
    <div
      className={cn("flex h-full min-h-0 w-full", surface, "text-[#1a1c1e]")}
    >
      <main className="min-h-0 flex-1 overflow-y-auto">
        {/* 与首页一致：居中最大宽度 + 水平内边距 */}
        <div className="mx-auto max-w-screen-2xl px-4 pb-12 pt-6 md:px-8 md:pt-8 lg:px-16">
          {/* 面包屑 / 返回 — 对齐详情页「返回首页」风格 */}
          <div className="mb-8 flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-medium text-[#424654] transition-colors hover:text-[#0040a1]"
            >
              <ArrowLeft size={16} aria-hidden />
              返回首页
            </Link>
            <span className="text-[#c3c6d6]">|</span>
            <span className="font-medium text-[#1a1c1e]">讲师工作台</span>
            {user && (
              <>
                <span className="text-[#c3c6d6]">·</span>
                <span className="truncate text-[#424654]">
                  {user.real_name || user.username}
                </span>
              </>
            )}
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 标题区：与首页区块标题层级一致 */}
          <header className="mb-10 flex flex-col gap-6 md:mb-12 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold tracking-tight text-[#1a1c1e] md:text-4xl">
                课程管理
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#424654]">
                审阅、编辑并整理你的课程内容，与首页展示保持一致的精品微课体验。
              </p>
            </div>

            {/* 搜索 + 创建：首页顶栏为圆角搜索，此处对齐圆角 + 主色渐变按钮 */}
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:min-w-[min(100%,28rem)] lg:max-w-xl">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-[#424654]"
                  aria-hidden
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索课程名称、简介…"
                  className="w-full rounded-full border-0 bg-[#e8e8ea] py-2.5 pl-10 pr-4 text-sm text-[#1a1c1e] placeholder:text-[#424654]/70 transition-shadow focus:outline-none focus:ring-2 focus:ring-[#0040a1]"
                />
              </div>
              <Link
                href="/teacher/courses/new"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${primary} 0%, #0056d2 100%)`,
                  boxShadow: "0 8px 20px -6px rgba(0, 64, 161, 0.35)",
                }}
              >
                <Plus size={18} strokeWidth={2.5} />
                创建课程
              </Link>
            </div>
          </header>

          <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            <BentoCard
              icon={<Users className="size-6 text-[#0040a1]" />}
              label="课程总数"
              value={myCourses.length}
              sub={
                <span className="rounded-full bg-[#ffdbd1] px-2 py-0.5 text-xs font-bold text-[#872200]">
                  当前列表
                </span>
              }
            />
            <BentoCard
              icon={<LineChart className="size-6 text-[#0040a1]" />}
              label="已发布"
              value={publishedCount}
              accentBar
            />
            <BentoCard
              icon={<Star className="size-6 text-[#0040a1]" />}
              label="草稿"
              value={draftCount}
            />
          </section>

          <section className="space-y-4">
            <p className="text-sm font-semibold text-[#1a1c1e] md:hidden">
              课程列表
            </p>

            <div
              className={cn(
                "hidden rounded-t-xl bg-[#f3f3f6] px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#424654] md:grid md:px-6",
                courseTableCols,
                "md:items-end",
              )}
            >
              <div className="min-w-0">课程信息</div>
              <div className="text-center">状态</div>
              <div className="text-center">学员数</div>
              <div className="text-right">操作</div>
            </div>

            {loading && (
              <p className="px-2 text-sm text-[#424654]">加载中…</p>
            )}

            {!loading &&
              filteredCourses.map((c) => {
                const g = getCoverGradient(c.id);
                const hasCover =
                  !!c.cover_image_url &&
                  !c.cover_image_url.includes("example.com");
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "group rounded-xl border border-[#c3c6d6]/10 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/40 md:p-6",
                      courseTableGridRow,
                    )}
                  >
                    {/* 列 1：封面 + 文案 */}
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-[#e8e8ea]">
                        {hasCover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.cover_image_url!}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div
                            className={cn(
                              "flex size-full items-center justify-center bg-linear-to-br",
                              g,
                            )}
                          >
                            <BookOpen className="size-8 text-white/40" />
                          </div>
                        )}
                        <div
                          className="absolute left-0 top-0 h-1 w-full rounded-t-lg"
                          style={{
                            background: `linear-gradient(to right, ${primary}, ${tertiary})`,
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#0040a1]">
                          {categoryTag(c.id)}
                        </span>
                        <h3 className="text-lg font-bold tracking-tight text-[#1a1c1e] transition-colors group-hover:text-[#0040a1]">
                          {c.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-[#424654]">
                          {c.description?.trim() || "暂无简介"}
                        </p>
                      </div>
                    </div>

                    {/* 列 2：状态 — 与表头「状态」列同宽 */}
                    <div className="flex items-center justify-between border-t border-[#eeeef0] pt-3 md:justify-self-center md:border-0 md:pt-0">
                      <span className="text-xs text-[#424654] md:hidden">
                        状态
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tighter",
                          statusBadgeClass(c.status),
                        )}
                      >
                        {statusLabel(c.status)}
                      </span>
                    </div>

                    {/* 列 3：学员数 */}
                    <div className="flex items-center justify-between border-t border-[#eeeef0] pt-3 md:justify-self-center md:border-0 md:pt-0">
                      <span className="text-xs text-[#424654] md:hidden">
                        学员数
                      </span>
                      <div className="text-right md:text-center">
                        <span className="text-lg font-bold leading-none text-[#1a1c1e]">
                          —
                        </span>
                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[#424654]">
                          待统计
                        </p>
                      </div>
                    </div>

                    {/* 列 4：操作 */}
                    <div className="flex flex-wrap items-center justify-end gap-1 border-t border-[#eeeef0] pt-3 md:justify-self-end md:border-0 md:pt-0">
                      <span className="mr-auto text-xs text-[#424654] md:hidden">
                        操作
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:bg-[#0040a1]/5 hover:text-[#0040a1]"
                        asChild
                      >
                        <Link href={`/courses/${c.id}`} aria-label="预览">
                          <Eye size={18} />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:bg-[#0040a1]/5 hover:text-[#0040a1]"
                        asChild
                      >
                        <Link
                          href={`/teacher/courses/${c.id}`}
                          aria-label="编辑章节与视频"
                        >
                          <Pencil size={18} />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hidden text-slate-400 hover:bg-[#0040a1]/5 hover:text-[#0040a1] md:inline-flex"
                        asChild
                      >
                        <Link
                          href={`/teacher/courses/${c.id}/info`}
                          aria-label="编辑课程信息"
                        >
                          <ImagePlus size={18} />
                        </Link>
                      </Button>
                      {!isCoursePublished(c.status) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-green-700 hover:bg-green-50"
                          disabled={!!publishingId || loading}
                          onClick={() => void publishCourse(c.id)}
                        >
                          {publishingId === c.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Rocket size={14} />
                          )}
                          <span className="hidden sm:inline">发布</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => void deleteCourse(c.id)}
                        aria-label="删除"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>

                    {/* 小屏补充入口（仅手机显示；桌面与表头四列无关故不占列） */}
                    <div className="col-span-full flex flex-wrap gap-2 border-t border-[#f3f3f6] pt-3 md:hidden">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/teacher/courses/${c.id}/info`}>
                          <ImagePlus size={14} />
                          课程信息
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/courses/${c.id}/learn`}>学习页</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}

            {!loading && filteredCourses.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#c3c6d6] bg-white/60 px-6 py-12 text-center text-sm text-[#424654]">
                {myCourses.length === 0
                  ? "暂无课程，点击上方「创建课程」开始；手机端可使用右下角「+」"
                  : "没有匹配的课程，试试调整搜索词"}
              </div>
            )}

            {myCourses.length > 6 && (
              <div className="mt-10 flex justify-center">
                <p className="group flex items-center gap-3 text-sm font-medium uppercase tracking-widest text-[#424654]">
                  <span className="h-px w-8 bg-[#c3c6d6] transition-colors group-hover:bg-[#0040a1]" />
                  共 {myCourses.length} 门课程
                  <span className="h-px w-8 bg-[#c3c6d6] transition-colors group-hover:bg-[#0040a1]" />
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* 移动端 FAB — 与首页主按钮同色 */}
      <Link
        href="/teacher/courses/new"
        className="fixed bottom-8 right-6 flex size-14 items-center justify-center rounded-full text-white shadow-2xl transition-transform hover:scale-105 md:hidden"
        style={{ backgroundColor: primary }}
        aria-label="创建课程"
      >
        <Plus size={26} strokeWidth={2.5} />
      </Link>
    </div>
  );
}

function BentoCard({
  icon,
  label,
  value,
  sub,
  accentBar,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accentBar?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#c3c6d6]/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-md md:p-8">
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-lg bg-[#0040a1]/10 p-2 text-[#0040a1]">
          {icon}
        </div>
        {sub}
        {accentBar && !sub && (
          <div
            className="mt-4 h-1 w-16 rounded-full"
            style={{
              background: `linear-gradient(to right, ${primary}, ${tertiary})`,
            }}
          />
        )}
      </div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#424654]">
        {label}
      </p>
      <p className="text-3xl font-extrabold tracking-tight text-[#1a1c1e]">
        {value}
      </p>
    </div>
  );
}
