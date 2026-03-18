"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  GraduationCap,
  Play,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import CourseCard from "@/components/course-card";
import TopNav from "@/components/top-nav";
import { getCoverGradient, STATUS_LABEL, type Course } from "@/lib/courses";
import { cn } from "@/lib/utils";

/* ── Constants ──────────────────────────────────────────── */

const TABS = [
  { id: "discover", label: "发现" },
  { id: "all", label: "全部课程" },
  { id: "published", label: "已发布" },
  { id: "inprogress", label: "进行中" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const COURSE_TYPES = [
  { id: "short", label: "短视频课", sub: "1-2 小时" },
  { id: "course", label: "系列课程", sub: "3-10 小时" },
  { id: "cert", label: "专题认证", sub: "10+ 小时" },
];

const DIFFICULTIES = ["入门", "初级", "中级", "高级"];

const TOPICS = [
  { label: "编程开发", count: 41 },
  { label: "数据科学", count: 28 },
  { label: "AI / 机器学习", count: 23 },
  { label: "前端工程", count: 19 },
  { label: "后端架构", count: 15 },
  { label: "产品设计", count: 11 },
  { label: "算法与数据结构", count: 9 },
  { label: "云计算", count: 8 },
  { label: "移动开发", count: 7 },
  { label: "网络安全", count: 5 },
];

/* ── Main Component ─────────────────────────────────────── */

interface HomeContentProps {
  courses: Course[];
  error: string | null;
}

export default function HomeContent({ courses, error }: HomeContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("discover");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedDiffs, setSelectedDiffs] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);

  const publishedCourses = courses.filter((c) => c.status === "Published");
  const heroCandidates = publishedCourses.length > 0 ? publishedCourses : courses;

  // Cycle hero every 5 s
  useEffect(() => {
    if (heroCandidates.length <= 1) return;
    const t = setInterval(
      () => setHeroIndex((i) => (i + 1) % heroCandidates.length),
      5000
    );
    return () => clearInterval(t);
  }, [heroCandidates.length]);

  const heroSource = heroCandidates[heroIndex] ?? null;

  const filteredCourses = useMemo(() => {
    let list = [...courses];
    if (activeTab === "published") list = list.filter((c) => c.status === "Published");
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [courses, activeTab, searchQuery]);

  const topRated = filteredCourses.slice(0, 4);
  const justAdded = [...filteredCourses].reverse().slice(0, 4);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Top Navbar ───────────────────────────────────── */}
      <TopNav />

      {/* ── Hero ─────────────────────────────────────────── */}
      {heroSource && (
        <HeroSection
          course={heroSource}
          total={heroCandidates.length}
          current={heroIndex}
          onDotClick={setHeroIndex}
        />
      )}

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white sticky top-[57px] z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-3.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              )}
            >
              {tab.label}
              {tab.id === "inprogress" && (
                <span className="ml-1.5 text-[11px] font-bold bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
                  0
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8 items-start">
        {/* Filter Panel */}
        <aside className="w-56 shrink-0 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索课程..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white"
            />
          </div>

          {/* Course Type */}
          <FilterGroup
            title="课程类型"
            hint
            tooltip="按照课程长度分类"
          >
            <div className="space-y-2.5">
              {COURSE_TYPES.map(({ id, label, sub }) => (
                <label key={id} className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                    checked={selectedTypes.includes(id)}
                    onChange={() =>
                      setSelectedTypes((p) =>
                        p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
                      )
                    }
                  />
                  <div>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 leading-none">
                      {label}
                    </span>
                    <span className="block text-xs text-gray-400">{sub}</span>
                  </div>
                </label>
              ))}
            </div>
          </FilterGroup>

          {/* Difficulty */}
          <FilterGroup title="难度">
            <div className="space-y-2.5">
              {DIFFICULTIES.map((d) => (
                <label key={d} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                    checked={selectedDiffs.includes(d)}
                    onChange={() =>
                      setSelectedDiffs((p) =>
                        p.includes(d) ? p.filter((x) => x !== d) : [...p, d]
                      )
                    }
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {d}
                  </span>
                </label>
              ))}
            </div>
          </FilterGroup>

          {/* Popular Topics */}
          <FilterGroup title="热门方向">
            <div className="space-y-2">
              {TOPICS.map(({ label, count }) => (
                <label
                  key={label}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                      checked={selectedTopics.includes(label)}
                      onChange={() =>
                        setSelectedTopics((p) =>
                          p.includes(label)
                            ? p.filter((x) => x !== label)
                            : [...p, label]
                        )
                      }
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{count}</span>
                </label>
              ))}
            </div>
          </FilterGroup>
        </aside>

        {/* Main Grid */}
        <div className="flex-1 min-w-0 space-y-12">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 rounded-xl px-5 py-4 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Empty */}
          {!error && filteredCourses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <BookOpen size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-700 font-semibold mb-1">暂无匹配课程</p>
              <p className="text-sm text-gray-400">尝试修改搜索词或调整筛选条件</p>
            </div>
          )}

          {/* Top Rated */}
          {topRated.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900">好评优先</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {topRated.map((course, i) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    instructor={course.teacher_name ?? undefined}
                    rating={4.8 - i * 0.1}
                    views={`${(15 - i) * 200}`}
                    isHot={i === 0}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Just Added */}
          {justAdded.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900">最新上线</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {justAdded.map((course, i) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    instructor={course.teacher_name ?? undefined}
                    isNew={i < 2}
                  />
                ))}
              </div>
            </section>
          )}

          {/* All Courses */}
          {filteredCourses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900">
                  全部课程
                  <span className="ml-2 text-base font-normal text-gray-400">
                    {filteredCourses.length} 门
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    instructor={course.teacher_name ?? undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}


/* ── Hero Section ───────────────────────────────────────── */

function HeroSection({
  course,
  total,
  current,
  onDotClick,
}: {
  course: Course;
  total: number;
  current: number;
  onDotClick: (i: number) => void;
}) {
  const gradient = getCoverGradient(course.id);
  const hasCover =
    !!course.cover_image_url && !course.cover_image_url.includes("example.com");
  const statusInfo = STATUS_LABEL[course.status] ?? STATUS_LABEL.Draft;

  return (
    <section className="bg-gray-50 border-b border-gray-200 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          最热门
        </h2>
        <div className="flex gap-5 items-stretch">
          {/* Large Featured Card */}
          <div className="flex flex-1 rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white min-h-[260px]">
            {/* Left: Thumbnail */}
            <div className="relative w-[52%] overflow-hidden">
              {hasCover ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${course.cover_image_url})` }}
                />
              ) : (
                <div
                  className={cn(
                    "absolute inset-0 bg-linear-to-br flex items-center justify-center",
                    gradient
                  )}
                >
                  <BookOpen size={56} className="text-white/25" />
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-r from-transparent to-white/10" />
            </div>

            {/* Right: Course Info */}
            <div className="flex-1 flex flex-col justify-between p-7">
              <div className="space-y-3">
                {/* Platform + teacher */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-linear-to-br from-blue-600 to-sky-400 flex items-center justify-center">
                    <GraduationCap size={11} className="text-white" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {course.teacher_name ?? "趣学内卷"}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 leading-snug line-clamp-2">
                  {course.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                  {course.description || "高质量精品微课，提升你的核心竞争力"}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1 rounded-full border",
                      statusInfo.color,
                      "border-current/20"
                    )}
                  >
                    {statusInfo.label}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    入门
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4">
                <Link
                  href={`/courses/${course.id}`}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-200"
                >
                  <Play size={13} fill="currentColor" />
                  立即学习
                </Link>
                <Link
                  href={`/courses/${course.id}`}
                  className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
                >
                  了解详情
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Smaller cards (next courses) */}
          <div className="hidden lg:flex flex-col gap-3 w-72 shrink-0">
            <p className="text-xs text-gray-400 font-medium mb-1">更多精选</p>
            {/* Placeholder mini cards */}
            <MiniCourseCard label="探索编程开发" sub="50+ 门课程" gradient="from-blue-400 to-blue-600" />
            <MiniCourseCard label="数据科学入门" sub="30+ 门课程" gradient="from-emerald-400 to-teal-500" />
            <MiniCourseCard label="AI 与机器学习" sub="20+ 门课程" gradient="from-violet-400 to-indigo-500" />
          </div>
        </div>

        {/* Carousel Dots */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-2 mt-5">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={() => onDotClick(i)}
                className={cn(
                  "rounded-full transition-all",
                  i === current
                    ? "w-5 h-2 bg-blue-600"
                    : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MiniCourseCard({
  label,
  sub,
  gradient,
}: {
  label: string;
  sub: string;
  gradient: string;
}) {
  return (
    <div
      className={cn(
        "flex-1 rounded-xl overflow-hidden relative cursor-pointer group",
        "bg-linear-to-br",
        gradient
      )}
    >
      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
      <div className="relative p-4 flex flex-col justify-end h-full min-h-[72px]">
        <p className="text-sm font-bold text-white leading-snug">{label}</p>
        <p className="text-xs text-white/70 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

/* ── Filter Group ───────────────────────────────────────── */

function FilterGroup({
  title,
  hint,
  tooltip,
  children,
}: {
  title: string;
  hint?: boolean;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        {hint && (
          <span
            title={tooltip}
            className="w-4 h-4 rounded-full border border-gray-300 text-gray-400 text-[10px] font-bold flex items-center justify-center cursor-help"
          >
            ?
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
