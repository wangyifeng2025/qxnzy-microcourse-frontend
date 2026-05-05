"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Search,
  Users,
} from "lucide-react";
import TopNav from "@/components/top-nav";
import {
  getCoverGradient,
  type Course,
} from "@/lib/courses";
import { formatStudyingCount } from "@/lib/format-enrollment";
import { cn } from "@/lib/utils";

const primary = "#0040a1";
const tertiary = "#872200";
const surface = "bg-[#f9f9fc]";
const onSurface = "text-[#1a1c1e]";
const onSurfaceVariant = "text-[#424654]";

export type MajorGroup = {
  id: string;
  label: string;
  courses: Course[];
};

function groupCoursesByMajor(courses: Course[]): MajorGroup[] {
  const map = new Map<string, Course[]>();
  for (const c of courses) {
    const label = c.major_name?.trim() || "微专业";
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(c);
  }
  const entries = [...map.entries()];
  entries.sort((a, b) => {
    if (a[0] === "微专业") return 1;
    if (b[0] === "微专业") return -1;
    return a[0].localeCompare(b[0], "zh-CN");
  });
  return entries.map(([label, list], idx) => ({
    id: `catalog-section-${idx}`,
    label,
    courses: list,
  }));
}

function pseudoProgressWidth(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i)) % 100;
  return `${28 + (n % 65)}%`;
}

function CatalogCourseCard({
  course,
  enrollmentCount,
}: {
  course: Course;
  enrollmentCount: number;
}) {
  const gradient = getCoverGradient(course.id);
  const hasCover =
    !!course.cover_image_url && !course.cover_image_url.includes("example.com");
  const barW = pseudoProgressWidth(course.id);

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-500",
        "hover:shadow-2xl hover:shadow-[#0040a1]/8",
      )}
    >
      <div className="relative h-56 w-full overflow-hidden bg-[#e8e8ea]">
        {hasCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_image_url!}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-linear-to-br",
              gradient,
            )}
          >
            <BookOpen size={48} className="text-white/70" />
          </div>
        )}
        <div className="absolute left-4 top-4">
          <span
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
            style={{ background: primary }}
          >
            免费
          </span>
        </div>
      </div>
      <div className="flex grow flex-col p-6 md:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Users size={18} className="shrink-0" style={{ color: tertiary }} />
          <span
            className="text-xs font-bold uppercase tracking-tighter"
            style={{ color: tertiary }}
          >
            {formatStudyingCount(enrollmentCount)}
          </span>
        </div>
        <h3
          className={cn(
            "mb-2 text-xl font-bold leading-tight md:text-2xl",
            onSurface,
          )}
        >
          {course.title}
        </h3>
        <p className={cn("mb-6 line-clamp-2 text-sm md:mb-8", onSurfaceVariant)}>
          {course.description?.trim() ||
            "高质量精品微课，系统讲解核心知识点。"}
        </p>
        <div className="mt-auto flex items-center justify-between gap-4">
          <Link
            href={`/courses/${course.id}`}
            className="group/link flex items-center gap-2 text-sm font-bold transition-all hover:gap-3"
            style={{ color: primary }}
          >
            查看课程
            <ArrowRight
              size={16}
              className="transition-transform group-hover/link:translate-x-0.5"
            />
          </Link>
          <div className="h-1 w-24 shrink-0 overflow-hidden rounded-full bg-[#e8e8ea]">
            <div
              className="h-full rounded-full"
              style={{
                width: barW,
                background: "linear-gradient(135deg, #0040a1 0%, #0056d2 100%)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export type CourseCatalogContentProps = {
  courses: Course[];
  enrollmentByCourseId: Record<string, number>;
  error: string | null;
  initialSearchQuery?: string;
};

export default function CourseCatalogContent({
  courses,
  enrollmentByCourseId,
  error,
  initialSearchQuery = "",
}: CourseCatalogContentProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false) ||
        (c.major_name?.toLowerCase().includes(q) ?? false) ||
        (c.teacher_name?.toLowerCase().includes(q) ?? false),
    );
  }, [courses, searchQuery]);

  const groups = useMemo(
    () => groupCoursesByMajor(filteredCourses),
    [filteredCourses],
  );

  useEffect(() => {
    if (groups.length === 0) {
      setActiveSectionId(null);
      return;
    }
    setActiveSectionId((prev) =>
      prev && groups.some((g) => g.id === prev) ? prev : groups[0].id,
    );
  }, [groups]);

  useEffect(() => {
    if (groups.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id)
          setActiveSectionId(visible[0].target.id);
      },
      { rootMargin: "-18% 0px -50% 0px", threshold: [0, 0.08, 0.2, 0.45, 0.9] },
    );
    for (const g of groups) {
      const el = document.getElementById(g.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [groups]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSectionId(id);
  };

  return (
    <div className={cn("min-h-screen", surface, onSurface)}>
      <TopNav
        active="courses"
        embeddedSearch={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: "搜索课程、专业、讲师…",
          routerBasePath: "/courses",
        }}
      />

      <main className="mx-auto max-w-[1920px] px-4 py-8 md:px-8 md:py-10 lg:px-16 lg:py-12">
        <nav
          className={cn(
            "mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest md:mb-8",
            onSurfaceVariant,
          )}
        >
          <Link href="/" className="transition-colors hover:text-[#0040a1]">
            首页
          </Link>
          <ChevronRight size={14} className="shrink-0 opacity-60" aria-hidden />
          <span className={onSurface}>课程</span>
        </nav>

        <section className="mb-12 md:mb-16 lg:mb-20">
          <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            课程目录
          </h1>
          <p className={cn("max-w-2xl text-base leading-relaxed md:text-lg", onSurfaceVariant)}>
            按专业浏览已发布的微课程体系。每个专业下的课程均可免费学习，覆盖不同方向的核心能力训练。
          </p>
        </section>

        {error && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {!error && courses.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#e2e2e5] bg-white py-20 text-center">
            <BookOpen size={40} className="mb-4 text-[#424654]/40" />
            <p className="font-semibold text-[#1a1c1e]">暂无已发布课程</p>
            <p className="mt-1 text-sm text-[#424654]">请稍后再来浏览。</p>
          </div>
        )}

        {!error && courses.length > 0 && filteredCourses.length === 0 && (
          <div className="rounded-2xl border border-[#e2e2e5] bg-white px-6 py-12 text-center">
            <Search size={32} className="mx-auto mb-3 text-[#424654]/35" />
            <p className="font-semibold text-[#1a1c1e]">没有匹配「{searchQuery}」的课程</p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-4 text-sm font-bold text-[#0040a1] hover:underline"
            >
              清除搜索
            </button>
          </div>
        )}

        {!error && groups.length > 0 ? (
          <div className="flex flex-col gap-12 lg:flex-row lg:gap-16 xl:gap-20">
            <aside className="w-full shrink-0 lg:w-64">
              <div className="lg:sticky lg:top-28">
                <h3
                  className={cn(
                    "mb-4 text-xs font-bold uppercase tracking-widest md:mb-6",
                    onSurfaceVariant,
                  )}
                >
                  按专业筛选
                </h3>
                <ul className="space-y-1">
                  {groups.map((g) => {
                    const isActive = activeSectionId === g.id;
                    return (
                      <li key={g.id}>
                        <button
                          type="button"
                          onClick={() => scrollToSection(g.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-xl py-3 pl-4 pr-3 text-left text-sm font-bold transition-all",
                            isActive
                              ? "border-r-4 border-[#0040a1] bg-[#e8e8ea] text-[#0040a1]"
                              : cn(
                                  onSurfaceVariant,
                                  "hover:bg-[#f3f3f6]",
                                ),
                          )}
                        >
                          <span className="min-w-0 truncate">{g.label}</span>
                          <span
                            className={cn(
                              "shrink-0 tabular-nums text-xs font-bold",
                              isActive ? "text-[#0040a1]/80" : "text-[#737785]",
                            )}
                          >
                            {g.courses.length}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>

            <div className="min-w-0 flex-1 space-y-16 md:space-y-20 lg:space-y-24">
              {groups.map((g) => (
                <section
                  key={g.id}
                  id={g.id}
                  className="scroll-mt-28"
                >
                  <div className="mb-6 flex flex-col gap-1 border-b border-[#c3c6d6]/25 pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <h2 className="text-2xl font-bold md:text-3xl">{g.label}</h2>
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase tracking-widest",
                        onSurfaceVariant,
                      )}
                    >
                      {g.courses.length} 门课程
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                    {g.courses.map((c) => (
                      <CatalogCourseCard
                        key={c.id}
                        course={c}
                        enrollmentCount={enrollmentByCourseId[c.id] ?? 0}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : null}
      </main>

      <footer className="mt-16 border-t border-[#e2e2e5] bg-[#f3f3f6]/80 py-10">
        <div className="mx-auto flex max-w-[1920px] flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-8 lg:px-16">
          <div className="text-center md:text-left">
            <span className="text-lg font-black text-[#1a1c1e]">微光智造 · 微课</span>
            <p className="mt-1 text-xs uppercase tracking-widest text-[#424654]">
              © {new Date().getFullYear()} 微光智造. 保留所有权利。
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-xs uppercase tracking-widest text-[#424654]">
            <span className="cursor-default opacity-70">关于我们</span>
            <span className="cursor-default opacity-70">服务条款</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
