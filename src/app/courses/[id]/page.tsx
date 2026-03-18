import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  User,
  BookOpen,
  Play,
  Clock,
  Tag,
  Share2,
  Heart,
  GraduationCap,
} from "lucide-react";
import TopNav from "@/components/top-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  fetchCourse,
  fetchChapters,
  fetchVideos,
  getCoverGradient,
  STATUS_LABEL,
  formatDate,
  type Chapter,
  type Video,
} from "@/lib/courses";
import ChapterList from "@/components/chapter-list";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params;

  let course;
  try {
    course = await fetchCourse(id);
  } catch (err) {
    if (err instanceof Error && err.message === "COURSE_NOT_FOUND") {
      notFound();
    }
    return <ErrorPage />;
  }

  const gradient = getCoverGradient(course.id);
  const hasCover =
    !!course.cover_image_url && !course.cover_image_url.includes("example.com");
  const statusInfo = STATUS_LABEL[course.status] ?? STATUS_LABEL.Draft;
  const teacherName = course.teacher_name || "未知讲师";
  const teacherInitial = teacherName.charAt(0);

  let chapters: Chapter[] = [];
  try {
    chapters = await fetchChapters(id);
  } catch {
    /* non-critical */
  }

  const videosPerChapter = await Promise.all(
    chapters.map((ch) => fetchVideos(ch.id).catch((): Video[] => []))
  );
  const chaptersWithVideos = chapters.map((ch, i) => ({
    ...ch,
    videos: videosPerChapter[i],
  }));

  const totalVideos = chaptersWithVideos.reduce((s, c) => s + c.videos.length, 0);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Top Navbar ────────────────────────────────────── */}
      <TopNav />

      {/* ── Breadcrumb ────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={14} />
            返回
          </Link>
          <Separator orientation="vertical" className="h-3.5 mx-1" />
          <Link href="/" className="text-gray-400 hover:text-blue-600 transition-colors">
            首页
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-medium line-clamp-1 max-w-sm">
            {course.title}
          </span>
        </div>
      </div>

      {/* ── Hero Banner ───────────────────────────────────── */}
      <div className="relative h-72 overflow-hidden">
        {hasCover ? (
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url(${course.cover_image_url})` }}
          />
        ) : (
          <div
            className={cn(
              "absolute inset-0 bg-linear-to-br flex items-center justify-center",
              gradient
            )}
          >
            <BookOpen size={80} className="text-white/15" />
          </div>
        )}
        {/* Overlays */}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-black/10" />

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto w-full px-6 pb-8">
            <div className="flex items-end justify-between gap-6">
              {/* Left: title + meta */}
              <div className="space-y-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs font-semibold border-0 backdrop-blur-sm",
                      statusInfo.color
                    )}
                  >
                    {statusInfo.label}
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold text-white leading-snug drop-shadow-md">
                  {course.title}
                </h1>
                <div className="flex items-center gap-3">
                  {/* Teacher */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {teacherInitial}
                    </div>
                    <span className="text-sm text-white/90 font-medium">{teacherName}</span>
                  </div>
                  <span className="text-white/40">·</span>
                  <span className="text-sm text-white/70">
                    {chapters.length} 章 · {totalVideos} 节
                  </span>
                  <span className="text-white/40">·</span>
                  <span className="text-sm text-white/70">
                    {formatDate(course.updated_at)} 更新
                  </span>
                </div>
              </div>

              {/* Right: Platform badge */}
              <div className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5 shrink-0">
                <div className="w-6 h-6 rounded-lg bg-linear-to-br from-blue-500 to-sky-400 flex items-center justify-center">
                  <GraduationCap size={13} className="text-white" />
                </div>
                <span className="text-sm text-white font-semibold">趣学内卷微课</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8 items-start">

          {/* ── Left: Main Panels ─────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Description */}
            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
              <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen size={16} className="text-blue-600" />
                课程介绍
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {course.description || "暂无课程介绍"}
              </p>
            </section>

            {/* Course Meta */}
            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
              <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Tag size={16} className="text-blue-600" />
                课程信息
              </h2>
              <div className="grid grid-cols-2 gap-5">
                <MetaItem
                  icon={<User size={14} className="text-blue-500" />}
                  label="主讲讲师"
                  value={
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-linear-to-br from-blue-400 to-sky-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {teacherInitial}
                      </div>
                      <span>{teacherName}</span>
                    </div>
                  }
                />
                <MetaItem
                  icon={<Tag size={14} className="text-blue-500" />}
                  label="课程状态"
                  value={
                    <Badge
                      variant="secondary"
                      className={cn("text-xs border-0 font-semibold", statusInfo.color)}
                    >
                      {statusInfo.label}
                    </Badge>
                  }
                />
                <MetaItem
                  icon={<Calendar size={14} className="text-blue-500" />}
                  label="创建时间"
                  value={formatDate(course.created_at)}
                />
                <MetaItem
                  icon={<Clock size={14} className="text-blue-500" />}
                  label="最近更新"
                  value={formatDate(course.updated_at)}
                />
              </div>
            </section>

            {/* Chapters & Videos */}
            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
              <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Play size={16} className="text-blue-600" />
                课程章节
              </h2>
              <ChapterList chapters={chaptersWithVideos} />
            </section>
          </div>

          {/* ── Right: Sticky Panel ───────────────────────── */}
          <aside className="w-72 shrink-0 space-y-4 sticky top-[73px]">
            {/* Cover Thumbnail */}
            <div className="rounded-2xl overflow-hidden aspect-video shadow-md border border-gray-100">
              {hasCover ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${course.cover_image_url})` }}
                />
              ) : (
                <div
                  className={cn(
                    "w-full h-full bg-linear-to-br flex items-center justify-center",
                    gradient
                  )}
                >
                  <BookOpen size={32} className="text-white/50" />
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <Link href={`/courses/${course.id}/learn`}>
              <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm shadow-blue-100 gap-2 text-[15px]">
                <Play size={15} fill="currentColor" />
                立即开始学习
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-9 text-sm gap-1.5 border-gray-200 hover:border-blue-300 hover:text-blue-600 rounded-xl"
              >
                <Heart size={14} />
                收藏
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-9 text-sm gap-1.5 border-gray-200 hover:border-blue-300 hover:text-blue-600 rounded-xl"
              >
                <Share2 size={14} />
                分享
              </Button>
            </div>

            {/* Quick Info Card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-xs">
              {/* Teacher */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-400 to-sky-500 flex items-center justify-center text-white font-bold shrink-0">
                  {teacherInitial}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">主讲讲师</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{teacherName}</p>
                </div>
              </div>
              <Separator />
              {/* Stats */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-500">
                  <BookOpen size={13} className="text-gray-400 shrink-0" />
                  <span className="text-xs">
                    {chaptersWithVideos.length} 章 · {totalVideos} 节
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar size={13} className="text-gray-400 shrink-0" />
                  <span className="text-xs">{formatDate(course.created_at)} 上线</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock size={13} className="text-gray-400 shrink-0" />
                  <span className="text-xs">更新于 {formatDate(course.updated_at)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ── Error Page ─────────────────────────────────────────── */

function ErrorPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TopNav />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">加载课程失败，请稍后重试</p>
          <Link href="/">
            <Button variant="outline" className="rounded-xl">返回首页</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── MetaItem ───────────────────────────────────────────── */

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
        <div className="text-sm text-gray-700 font-medium">{value}</div>
      </div>
    </div>
  );
}
