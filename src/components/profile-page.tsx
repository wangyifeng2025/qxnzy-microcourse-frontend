"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  History,
  Award,
  Settings,
  Flame,
  Users,
  ArrowRight,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import TopNav from "@/components/top-nav";
import {
  getToken,
  getUser,
  userHasAnyRole,
  type UserInfo,
} from "@/lib/auth";
import { fetchMyEnrollments } from "@/lib/course-enrollment";
import {
  getCoverGradient,
  type Course,
} from "@/lib/courses";
import {
  fetchDiscoverPopularCourses,
  type DiscoverPopularCourse,
} from "@/lib/discover";
import { formatStudentBadgeCount } from "@/lib/format-enrollment";
import { cn } from "@/lib/utils";

const tertiary = "#872200";

function roleLabel(role: string | undefined): string {
  if (userHasAnyRole(role, "admin")) return "管理员";
  if (userHasAnyRole(role, "teacher")) return "认证讲师";
  return "学员";
}

function dashboardHref(role: string | undefined): string {
  if (userHasAnyRole(role, "admin")) return "/admin";
  if (userHasAnyRole(role, "teacher")) return "/teacher";
  return "/my-learning";
}

function pseudoProgressPercent(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i)) % 100;
  return 12 + (n % 78);
}

function streakHeights(): number[] {
  return [48, 64, 80, 96, 112];
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(() =>
    typeof window !== "undefined" ? getUser() : null,
  );
  const [courses, setCourses] = useState<Course[]>([]);
  const [recommendations, setRecommendations] = useState<DiscoverPopularCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (token: string) => {
    const [enrolled, popular] = await Promise.all([
      fetchMyEnrollments(token),
      fetchDiscoverPopularCourses(12).catch((): DiscoverPopularCourse[] => []),
    ]);
    const items = enrolled.items ?? [];
    setCourses(items);
    const enrolledIds = new Set(items.map((c) => c.id));
    setRecommendations(popular.filter((p) => !enrolledIds.has(p.id)).slice(0, 4));
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token || !getUser()) {
      router.replace("/login?next=/profile");
      return;
    }
    setUser(getUser());
    load(token)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "加载失败，请稍后重试",
        ),
      )
      .finally(() => setLoading(false));
  }, [router, load]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth_user")
        setUser(e.newValue ? (JSON.parse(e.newValue) as UserInfo) : null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const displayName = user?.real_name?.trim() || user?.username || "用户";
  const subtitle = roleLabel(user?.role);
  const enrolledSlice = useMemo(() => courses.slice(0, 4), [courses]);
  const streak = streakHeights();

  return (
    <div className="min-h-screen bg-[#f9f9fc] text-[#1a1c1e]">
      <TopNav active={null} layoutSpacer />

      <main className="mx-auto max-w-[1440px] px-4 pb-12 pt-6 md:px-8 md:pt-8 lg:px-16">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#424654]">
            <Loader2 className="size-8 animate-spin text-[#0040a1]" />
            <p className="text-sm">加载个人中心…</p>
          </div>
        )}

        {!loading && error && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
            <AlertCircle className="size-10 text-red-400" />
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full border border-red-200 px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
            >
              重新加载
            </button>
          </div>
        )}

        {!loading && !error && user && (
          <div className="grid grid-cols-12 gap-6 lg:gap-8">
            {/* 左侧 */}
            <aside className="col-span-12 space-y-6 md:col-span-3">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 size-24 overflow-hidden rounded-full ring-4 ring-[#dae2ff]">
                    {user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex size-full items-center justify-center text-2xl font-bold text-white"
                        style={{
                          background:
                            "linear-gradient(135deg, #0040a1 0%, #0056d2 100%)",
                        }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h2 className="font-extrabold tracking-tight text-[#1a1c1e]">
                    {displayName}
                  </h2>
                  <p className="mt-1 text-sm text-[#424654]">{subtitle}</p>
                </div>

                <nav className="mt-8 space-y-2">
                  <Link
                    href={dashboardHref(user.role)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg bg-white p-3 text-[#0040a1] shadow-sm transition-all hover:translate-x-0.5"
                  >
                    <LayoutDashboard className="size-[22px] shrink-0" strokeWidth={2} />
                    <span className="text-sm font-bold">我的控制台</span>
                  </Link>
                  <Link
                    href="/my-learning"
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-3 font-medium text-[#424654] transition-all hover:bg-[#f3f3f6] hover:translate-x-0.5"
                  >
                    <History className="size-[22px] shrink-0" strokeWidth={1.75} />
                    <span className="text-sm">学习历史</span>
                  </Link>
                  <a
                    href="#achievements"
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-3 font-medium text-[#424654] transition-all hover:bg-[#f3f3f6] hover:translate-x-0.5"
                  >
                    <Award className="size-[22px] shrink-0" strokeWidth={1.75} />
                    <span className="text-sm">成就荣誉</span>
                  </a>
                  <Link
                    href="/change-password"
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-3 font-medium text-[#424654] transition-all hover:bg-[#f3f3f6] hover:translate-x-0.5"
                  >
                    <Settings className="size-[22px] shrink-0" strokeWidth={1.75} />
                    <span className="text-sm">账户设置</span>
                  </Link>
                </nav>
              </div>

              <div className="rounded-xl bg-[#f3f3f6] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1a1c1e]">学习连续打卡</h3>
                  <Flame className="size-5 shrink-0" style={{ color: tertiary }} fill="currentColor" />
                </div>
                <div className="flex items-end justify-between gap-1">
                  {streak.map((h, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          "w-6 rounded-t-md sm:w-8",
                          i === streak.length - 1
                            ? "bg-[#0056d2]"
                            : "bg-[#0040a1]",
                        )}
                        style={{ height: h }}
                      />
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase",
                          i === streak.length - 1
                            ? "text-[#0040a1]"
                            : "text-[#737785]",
                        )}
                      >
                        {["一", "二", "三", "四", "今"][i]}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-[#424654]">
                  完整学习进度统计与打卡勋章即将上线；请先在「我的学习」中保持每日开课习惯。
                </p>
              </div>
            </aside>

            {/* 右侧 */}
            <section className="col-span-12 space-y-12 md:col-span-9">
              <div>
                <header className="mb-6 flex flex-wrap items-end justify-between gap-2">
                  <h2 className="text-2xl font-extrabold tracking-tight text-[#1a1c1e] md:text-3xl">
                    正在学习
                  </h2>
                  <Link
                    href="/courses"
                    className="text-sm font-bold text-[#0040a1] underline decoration-2 underline-offset-4 hover:opacity-90"
                  >
                    查看全部课程
                  </Link>
                </header>

                {enrolledSlice.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#c3c6d6] bg-white px-6 py-12 text-center">
                    <BookOpen className="mx-auto mb-3 size-10 text-[#0040a1]/30" />
                    <p className="text-sm font-semibold text-[#1a1c1e]">
                      暂无进行中的课程
                    </p>
                    <p className="mt-1 text-sm text-[#424654]">
                      去课程广场选课后即可在此继续学习
                    </p>
                    <Link
                      href="/"
                      className="mt-5 inline-flex rounded-full bg-[#0040a1] px-6 py-2 text-xs font-bold text-white hover:opacity-95"
                    >
                      浏览课程
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {enrolledSlice.map((course, idx) => {
                      const pct = pseudoProgressPercent(course.id);
                      const gradient =
                        idx % 2 === 0
                          ? "linear-gradient(to right, #0040a1, #0056d2)"
                          : "linear-gradient(to right, #0040a1, #872200)";
                      const hasCover =
                        !!course.cover_image_url &&
                        !course.cover_image_url.includes("example.com");
                      const grad = getCoverGradient(course.id);
                      return (
                        <div
                          key={course.id}
                          className="group flex flex-col items-center gap-6 rounded-xl bg-white p-6 shadow-sm transition-colors hover:bg-[#fafbff] md:flex-row"
                        >
                          <div className="h-28 w-full shrink-0 overflow-hidden rounded-lg md:w-48">
                            {hasCover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={course.cover_image_url!}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <div
                                className={cn(
                                  "flex size-full items-center justify-center bg-linear-to-br",
                                  grad,
                                )}
                              >
                                <BookOpen className="size-10 text-white/75" />
                              </div>
                            )}
                          </div>
                          <div className="w-full min-w-0 grow">
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h4 className="text-lg font-bold text-[#1a1c1e] transition-colors group-hover:text-[#0040a1]">
                                  {course.title}
                                </h4>
                                <p className="mt-0.5 text-xs text-[#424654]">
                                  讲师 · {course.teacher_name?.trim() || "—"}
                                </p>
                              </div>
                              <span className="shrink-0 text-sm font-bold text-[#0040a1]">
                                {pct}%
                              </span>
                            </div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-[#e8e8ea]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  background: gradient,
                                }}
                              />
                            </div>
                            <Link
                              href={`/courses/${course.id}/learn`}
                              className="mt-4 inline-flex rounded-full bg-[#0040a1] px-6 py-2 text-xs font-bold text-white shadow-sm transition hover:shadow-md active:scale-[0.98]"
                            >
                              继续学习
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div id="achievements" className="scroll-mt-28">
                <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-[#1a1c1e] md:text-3xl">
                  成就与证书
                </h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                  <div className="flex flex-col items-center rounded-xl bg-[#f3f3f6] p-5 text-center">
                    <div
                      className="mb-3 flex size-14 items-center justify-center rounded-full transition-transform group-hover:scale-110"
                      style={{ background: "#ffdbd1" }}
                    >
                      <Award className="size-7" style={{ color: "#862200" }} />
                    </div>
                    <p className="text-xs font-bold leading-tight text-[#1a1c1e]">
                      选课先锋
                    </p>
                    <p className="mt-1 text-[10px] text-[#424654]">
                      {courses.length > 0
                        ? `已选 ${courses.length} 门课程`
                        : "去选第一课吧"}
                    </p>
                  </div>
                  <div className="flex flex-col items-center rounded-xl bg-[#f3f3f6] p-5 text-center">
                    <div
                      className="mb-3 flex size-14 items-center justify-center rounded-full bg-[#dae2ff]"
                    >
                      <Flame className="size-7 text-[#0040a1]" />
                    </div>
                    <p className="text-xs font-bold leading-tight text-[#1a1c1e]">
                      保持好奇
                    </p>
                    <p className="mt-1 text-[10px] text-[#424654]">
                      完整勋章体系统一规划中
                    </p>
                  </div>
                  <div className="flex flex-col items-center rounded-xl bg-[#f3f3f6] p-5 text-center">
                    <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-[#e2e2e5]">
                      <BookOpen className="size-7 text-[#737785]" />
                    </div>
                    <p className="text-xs font-bold leading-tight text-[#1a1c1e]">
                      学分证书
                    </p>
                    <p className="mt-1 text-[10px] text-[#424654]">
                      即将与课程结业联动
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c3c6d6] p-5 text-center opacity-70">
                    <span className="mb-2 text-2xl text-[#737785]">+</span>
                    <p className="text-[10px] font-bold text-[#424654]">
                      解锁更多成就
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <header className="mb-6 flex items-center gap-3">
                  <h2 className="text-xl font-bold tracking-tight text-[#1a1c1e] md:text-2xl">
                    为您推荐
                  </h2>
                  <div className="h-px min-w-0 flex-1 bg-[#c3c6d6]/40" />
                </header>
                {recommendations.length === 0 ? (
                  <p className="text-sm text-[#424654]">
                    暂无可推荐课程，请稍后再试或前往{" "}
                    <Link href="/courses" className="font-bold text-[#0040a1] hover:underline">
                      课程目录
                    </Link>
                    。
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {recommendations.map((c) => {
                      const hasCover =
                        !!c.cover_image_url &&
                        !c.cover_image_url.includes("example.com");
                      return (
                        <div
                          key={c.id}
                          className="overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md"
                        >
                          <div className="relative h-40 bg-[#e8e8ea]">
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
                                  getCoverGradient(c.id),
                                )}
                              >
                                <BookOpen className="size-12 text-white/70" />
                              </div>
                            )}
                            <span
                              className="absolute left-4 top-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                              style={{ background: tertiary }}
                            >
                              热门推荐
                            </span>
                          </div>
                          <div className="p-6">
                            <h4 className="mb-2 font-bold text-[#1a1c1e]">
                              {c.title}
                            </h4>
                            <p className="line-clamp-2 text-sm text-[#424654]">
                              {c.description?.trim() ||
                                "高质量精品微课，欢迎加入学习。"}
                            </p>
                            <div className="mt-6 flex items-center justify-between">
                              <span className="flex items-center gap-1 text-xs font-bold text-[#0040a1]">
                                <Users className="size-3.5 shrink-0" />
                                {formatStudentBadgeCount(c.enrollment_count)}
                              </span>
                              <Link
                                href={`/courses/${c.id}`}
                                className="rounded-full p-2 text-[#0040a1] transition-colors hover:bg-[#dae2ff]"
                                aria-label={`查看 ${c.title}`}
                              >
                                <ArrowRight className="size-5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="mt-12 w-full border-t border-[#e2e2e5] bg-[#f3f3f6]/80 py-10">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-16">
          <div className="text-center md:text-left">
            <div className="font-bold text-[#0040a1]">微光智造 · 微课</div>
            <p className="mt-1 text-xs text-[#424654]">
              © {new Date().getFullYear()} 为工程师与终身学习者而设计。
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-xs text-[#424654]">
            <span className="cursor-default opacity-70">隐私政策</span>
            <span className="cursor-default opacity-70">服务条款</span>
            <Link href="/" className="hover:text-[#0040a1]">
              返回首页
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
