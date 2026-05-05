"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowRight,
  Zap,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import TopNav from "@/components/top-nav";
import { getCoverGradient, type Course } from "@/lib/courses";
import {
  discoverTopicHref,
  type DiscoverPopularCourse,
  type DiscoverActiveTeacher,
  type DiscoverLatestTopic,
} from "@/lib/discover";
import { formatStudentBadgeCount, formatStudyingCount } from "@/lib/format-enrollment";
import { cn } from "@/lib/utils";

/* stitch 风格色板近似值 */
const surface = "bg-[#f9f9fc]";
const surfaceLow = "bg-[#eeeef0]";
const surfaceLowest = "bg-white";
const onSurface = "text-[#1a1c1e]";
const onSurfaceVariant = "text-[#424654]";
const primary = "#0040a1";
const tertiary = "#872200";

/** 课程卡片左上角标签：优先接口返回的专业名 */
function courseBadgeLabel(majorName: string | null | undefined): string {
  const t = majorName?.trim();
  if (t) return t;
  return "微专业";
}

interface HomeContentProps {
  courses: Course[];
  error: string | null;
  /** 来自 URL `?q=`，与其它页顶栏搜索回车跳转对齐 */
  initialSearchQuery?: string;
  popularCourses: DiscoverPopularCourse[];
  activeTeachers: DiscoverActiveTeacher[];
  latestTopics: DiscoverLatestTopic[];
  enrollmentByCourseId: Record<string, number>;
}

function HomeCommunitySidebar({
  latestTopics,
  activeTeachers,
}: {
  latestTopics: DiscoverLatestTopic[];
  activeTeachers: DiscoverActiveTeacher[];
}) {
  return (
    <div className={cn("sticky top-24 p-8 rounded-xl", surfaceLow)}>
      <h3 className="text-xl font-extrabold mb-4 text-[#1a1c1e]">学习社区</h3>
      <p className="text-sm text-[#424654] mb-6 leading-relaxed">
        查看最新话题，与讲师和同学交流答疑。
      </p>

      {latestTopics.length === 0 ? (
        <p className="mb-8 text-sm text-[#424654]/90">暂无最新话题，快去社区发起讨论吧。</p>
      ) : (
        <div className="mb-8 space-y-3">
          {latestTopics.map((t) => (
            <Link
              key={`${t.source}-${t.id}`}
              href={discoverTopicHref(t)}
              className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm transition hover:shadow-md"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0040a1]/10 text-[#0040a1]">
                <MessageCircle size={18} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#1a1c1e]">{t.title}</p>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-[#424654]">
                  {t.reply_count} 条回复
                  {t.source === "course" && t.source_title
                    ? ` · ${t.source_title}`
                    : " · 独立社区"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/community"
        className="flex w-full items-center justify-center gap-2 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:scale-[0.98]"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, #0056d2 100%)`,
        }}
      >
        进入学习社区
        <ArrowRight size={16} />
      </Link>

      {activeTeachers.length > 0 ? (
        <div className="mt-10 border-t border-[#c3c6d6]/30 pt-8">
          <h4 className="mb-4 text-[10px] font-black uppercase tracking-[0.15em] text-[#424654]/50">
            活跃讲师
          </h4>
          <div className="flex -space-x-2">
            {activeTeachers.slice(0, 5).map((ins) => {
              const name = ins.real_name?.trim() || ins.username;
              const initial = name.charAt(0).toUpperCase() || "?";
              return (
                <div
                  key={ins.user_id}
                  className="relative size-8 shrink-0 overflow-hidden rounded-full border-2 border-[#eeeef0] bg-[linear-gradient(135deg,#3b82f6_0%,#38bdf8_100%)] text-[10px] font-bold text-white"
                  title={name}
                >
                  {ins.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ins.avatar_url} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center">{initial}</span>
                  )}
                </div>
              );
            })}
            {activeTeachers.length > 5 ? (
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-[#eeeef0] text-[10px] font-bold text-white"
                style={{ backgroundColor: "#0056d2" }}
              >
                +{activeTeachers.length - 5}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function HomeContent({
  courses,
  error,
  initialSearchQuery = "",
  popularCourses,
  activeTeachers,
  latestTopics,
  enrollmentByCourseId,
}: HomeContentProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const popularRef = useRef<HTMLDivElement>(null);

  const publishedCourses = useMemo(
    () => courses.filter((c) => c.status === "Published"),
    [courses],
  );
  const listSource = publishedCourses.length > 0 ? publishedCourses : courses;

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return listSource;
    const q = searchQuery.toLowerCase();
    return listSource.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false),
    );
  }, [listSource, searchQuery]);

  const scrollPopular = (dir: -1 | 1) => {
    const el = popularRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 420, behavior: "smooth" });
  };

  return (
    <div className={cn("min-h-screen", surface, onSurface)}>
      <TopNav
        active="home"
        embeddedSearch={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "搜索课程大纲、关键词…",
        }}
      />

      <main className="pb-0 pt-6 md:pt-8">
        {/* 热门课程：横向滚动 */}
        <section className="px-4 md:px-8 lg:px-16 max-w-screen-2xl mx-auto">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#1a1c1e]">
              热门课程
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => scrollPopular(-1)}
                className="p-2 rounded-full bg-[#f3f3f6] hover:bg-[#e8e8ea] transition-colors"
                aria-label="上一组"
              >
                <ChevronLeft size={20} className="text-[#424654]" />
              </button>
              <button
                type="button"
                onClick={() => scrollPopular(1)}
                className="p-2 rounded-full bg-[#f3f3f6] hover:bg-[#e8e8ea] transition-colors"
                aria-label="下一组"
              >
                <ChevronRight size={20} className="text-[#424654]" />
              </button>
            </div>
          </div>

          {popularCourses.length === 0 ? (
            <p className={cn("text-sm pb-8", onSurfaceVariant)}>
              暂无热门课程数据，请稍后再试。
            </p>
          ) : (
            <div
              ref={popularRef}
              className="flex gap-6 overflow-x-auto hide-scrollbar pb-8 -mx-4 px-4"
            >
              {popularCourses.map((course) => (
                <PopularCourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>

        {/* 主区：课程网格 + 社区侧栏 */}
        <section className="px-4 md:px-8 lg:px-16 mt-8 md:mt-8 max-w-screen-2xl mx-auto flex flex-col xl:flex-row gap-12 items-start">
          <div className="flex-1 min-w-0 w-full">
            <div className="mb-10 md:mb-12">
              <h2 className="text-3xl md:text-3xl font-extrabold tracking-tight mb-2 text-[#1a1c1e]">
                可选课程
              </h2>
              <p className={cn("text-sm md:text-base", onSurfaceVariant)}>
                面向现代学习者精选的精品微课，随时随地提升竞争力。
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 rounded-xl px-5 py-4 text-sm mb-8">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {!error && filteredCourses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#eeeef0] flex items-center justify-center mb-4">
                  <BookOpen size={28} className="text-[#424654]/50" />
                </div>
                <p className="font-semibold text-[#1a1c1e] mb-1">
                  暂无匹配课程
                </p>
                <p className="text-sm text-[#424654]">
                  试试更换搜索词，或浏览上方热门推荐
                </p>
              </div>
            )}

            {filteredCourses.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredCourses.map((course) => (
                  <CurriculumCard
                    key={course.id}
                    course={course}
                    enrollmentCount={enrollmentByCourseId[course.id] ?? 0}
                  />
                ))}
              </div>
            )}

            {filteredCourses.length > 0 && (
              <div className="mt-16 flex justify-center">
                <button
                  type="button"
                  className="bg-[#e8e8ea] hover:bg-[#e2e2e5] text-[#1a1c1e] px-10 py-4 rounded-full font-bold text-sm transition-colors"
                  onClick={() => {
                    document
                      .getElementById("home-more-courses-hint")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  探索更多课程
                </button>
              </div>
            )}

            <p
              id="home-more-courses-hint"
              className="mt-8 text-center text-xs text-[#424654]/70"
            >
              更多课程持续上架中，敬请期待。
            </p>
          </div>

          <aside className="hidden xl:block w-80 shrink-0">
            <HomeCommunitySidebar
              latestTopics={latestTopics}
              activeTeachers={activeTeachers}
            />
          </aside>
        </section>
      </main>

      <footer className="bg-slate-50 flex flex-col md:flex-row justify-between items-center px-4 md:px-16 w-full mt-20 py-12 border-t border-slate-100">
        <div className="flex flex-col mb-8 md:mb-0 text-center md:text-left">
          <span className="text-sm font-black text-slate-900 mb-2">
            微光智造 · 微课
          </span>
          <p className="font-sans text-xs uppercase tracking-widest text-slate-500">
            © {new Date().getFullYear()} 微光智造. 保留所有权利。
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 md:gap-12 font-sans text-xs uppercase tracking-widest text-slate-500">
          <Link href="#" className="hover:text-slate-900 transition-colors">
            关于我们
          </Link>
          <Link href="#" className="hover:text-slate-900 transition-colors">
            服务条款
          </Link>
          <Link href="#" className="hover:text-slate-900 transition-colors">
            隐私政策
          </Link>
          <Link href="#" className="hover:text-slate-900 transition-colors">
            帮助中心
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ── 热门横滑卡片 ── */

function PopularCourseCard({ course }: { course: DiscoverPopularCourse }) {
  const cat = courseBadgeLabel(course.major_name);

  return (
    <div
      className={cn(
        "min-w-[min(400px,85vw)] rounded-xl p-6 transition-all hover:-translate-y-1 shadow-sm",
        surfaceLowest,
      )}
    >
      <div
        className="h-1 rounded-full mb-4"
        style={{
          background: `linear-gradient(to right, ${primary}, ${tertiary})`,
        }}
      />
      <div className="flex justify-between items-start mb-4">
        <span
          className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full"
          style={{ color: primary, background: "#dae2ff" }}
        >
          {cat}
        </span>
        <span
          className="text-xs font-bold flex items-center gap-1"
          style={{ color: tertiary }}
        >
          <Users size={14} className="shrink-0" />
          {formatStudentBadgeCount(course.enrollment_count)}
        </span>
      </div>
      <h3 className="text-xl font-bold mb-2 line-clamp-2">{course.title}</h3>
      <p className={cn("text-sm line-clamp-2 mb-6", onSurfaceVariant)}>
        {course.description?.trim() || "高质量精品微课，系统讲解核心知识点。"}
      </p>
      {course.teacher_name ? (
        <p className="mb-4 text-xs text-[#737785]">讲师 · {course.teacher_name}</p>
      ) : null}
      <div className="flex items-center justify-between">
        <span className="font-bold" style={{ color: primary }}>
          免费
        </span>
        <Link
          href={`/courses/${course.id}`}
          className="font-bold text-sm flex items-center gap-1 group"
          style={{ color: primary }}
        >
          开始学习
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-1"
          />
        </Link>
      </div>
    </div>
  );
}

/* ── 网格课程卡片（灰阶封面 + hover） ── */

function CurriculumCard({
  course,
  enrollmentCount,
}: {
  course: Course;
  enrollmentCount: number;
}) {
  const gradient = getCoverGradient(course.id);
  const hasCover =
    !!course.cover_image_url && !course.cover_image_url.includes("example.com");
  const cat = courseBadgeLabel(course.major_name);

  return (
    <Link
      href={`/courses/${course.id}`}
      className={cn(
        "group rounded-xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-[#0040a1]/5",
        surfaceLow,
        "hover:bg-white",
      )}
    >
      <div className="relative h-48 bg-[#ddd]">
        {hasCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_image_url!}
            alt=""
            className="w-full h-full object-cover group-hover:grayscale-0 transition-all duration-500"
          />
        ) : (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-linear-to-br",
              gradient,
            )}
          >
            <BookOpen size={48} className="text-white/30" />
          </div>
        )}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm">
          <span
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: primary }}
          >
            免费
          </span>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#424654]/60">
            {cat}
          </span>
        </div>
        <h4 className="text-lg font-bold mb-3 leading-tight line-clamp-2 group-hover:text-[#0040a1] transition-colors">
          {course.title}
        </h4>
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-1">
            <Zap size={16} className="text-[#872200]" fill="currentColor" />
            <span className="text-xs font-bold text-[#424654]">
              {formatStudyingCount(enrollmentCount)}
            </span>
          </div>
          <ExternalLink
            size={18}
            className="text-[#424654] group-hover:text-[#0040a1] transition-colors"
          />
        </div>
      </div>
    </Link>
  );
}
