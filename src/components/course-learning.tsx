"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Play,
  Clock,
  ArrowLeft,
  Loader2,
  ListVideo,
  MonitorPlay,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, type Chapter, type Video } from "@/lib/courses";
import { getToken } from "@/lib/auth";
import {
  fetchEnrollmentStatus,
  unenrollCourse,
} from "@/lib/course-enrollment";
import VideoPlayer from "@/components/video-player";

interface ChapterWithVideos extends Chapter {
  videos: Video[];
}

export default function CourseLearning({
  courseId,
  courseTitle,
  chapters,
}: {
  courseId: string;
  courseTitle: string;
  chapters: ChapterWithVideos[];
}) {
  const router = useRouter();
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [unenrollBusy, setUnenrollBusy] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setEnrolled(false);
      return;
    }
    fetchEnrollmentStatus(token, courseId)
      .then((r) => setEnrolled(!!r.enrolled))
      .catch(() => setEnrolled(false));
  }, [courseId]);

  const handleUnenroll = async () => {
    if (
      !window.confirm(
        "确定取消该课程的学习？将返回课程详情页，需重新选课才能继续学习。",
      )
    )
      return;
    const token = getToken();
    if (!token) return;
    setUnenrollBusy(true);
    try {
      await unenrollCourse(token, courseId);
      router.push(`/courses/${courseId}`);
    } catch {
      /* 可在此 toast */
    } finally {
      setUnenrollBusy(false);
    }
  };

  const firstReady = useMemo(() => {
    for (const ch of chapters) {
      const v = ch.videos.find((x) => x.status === "Ready");
      if (v) return v;
    }
    return null;
  }, [chapters]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeVideo, setActiveVideo] = useState<Video | null>(firstReady);

  const totalLessons = chapters.reduce((s, c) => s + c.videos.length, 0);
  const totalReadyLessons = chapters.reduce(
    (s, c) => s + c.videos.filter((v) => v.status === "Ready").length,
    0,
  );

  // Find which chapter the active video belongs to
  const activeChapterId = useMemo(() => {
    if (!activeVideo) return null;
    return (
      chapters.find((ch) => ch.videos.some((v) => v.id === activeVideo.id))
        ?.id ?? null
    );
  }, [activeVideo, chapters]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0d0f14] text-white">
      {/* ── 顶栏 ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#111318] px-4 py-3 md:px-6">
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft size={15} aria-hidden />
          返回
        </Link>

        <span className="shrink-0 text-white/20">|</span>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <MonitorPlay
            className="size-4 shrink-0 text-blue-400"
            aria-hidden
          />
          <h1 className="truncate text-sm font-semibold text-white/90 md:text-base">
            {courseTitle}
          </h1>
        </div>

        {enrolled ? (
          <button
            type="button"
            disabled={unenrollBusy}
            onClick={() => void handleUnenroll()}
            className="ml-auto shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            {unenrollBusy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              "取消学习"
            )}
          </button>
        ) : null}
      </div>

      {/* ── 主体 ── */}
      <div className="mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col gap-0 lg:flex-row">
        {/* 左侧：章节目录 */}
        <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-[#111318] lg:w-80 lg:min-h-0 lg:border-b-0 lg:border-r xl:w-88">
          {/* Sidebar 顶部信息 */}
          <div className="shrink-0 border-b border-white/8 px-4 py-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <ListVideo size={13} />
              课程大纲
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {chapters.length} 章节 · {totalReadyLessons}/{totalLessons} 节可播放
            </p>
          </div>

          {/* 章节列表 */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <ol className="space-y-px p-2">
              {chapters.map((chapter) => {
                const isCollapsed = collapsed[chapter.id] ?? false;
                const isActiveChapter = activeChapterId === chapter.id;
                const chapterMinutes = Math.ceil(
                  chapter.videos.reduce((s, v) => s + v.duration, 0) / 60,
                );

                return (
                  <li key={chapter.id} className="overflow-hidden rounded-xl">
                    {/* 章节头 */}
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsed((prev) => ({
                          ...prev,
                          [chapter.id]: !isCollapsed,
                        }))
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        isActiveChapter
                          ? "bg-blue-600/15 hover:bg-blue-600/20"
                          : "hover:bg-white/6",
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                          isActiveChapter
                            ? "bg-blue-500 text-white"
                            : "bg-white/10 text-slate-400",
                        )}
                      >
                        {chapter.sort_order}
                      </div>
                      <span
                        className={cn(
                          "flex-1 text-[13px] font-semibold leading-snug",
                          isActiveChapter ? "text-blue-300" : "text-slate-200",
                        )}
                      >
                        {chapter.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-600">
                        {chapter.videos.length > 0 &&
                          `${chapterMinutes > 0 ? `${chapterMinutes}′` : ""}`}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown size={14} className="shrink-0 text-slate-600" />
                      ) : (
                        <ChevronUp size={14} className="shrink-0 text-slate-600" />
                      )}
                    </button>

                    {/* 视频列表 */}
                    {!isCollapsed && (
                      <ul className="ml-2 space-y-px border-l border-white/6 pl-2 pb-2">
                        {chapter.videos.length === 0 ? (
                          <li className="px-3 py-2.5 text-center text-xs text-slate-600">
                            暂无视频
                          </li>
                        ) : (
                          chapter.videos.map((video) => {
                            const isReady = video.status === "Ready";
                            const isActive = activeVideo?.id === video.id;
                            return (
                              <li
                                key={video.id}
                                onClick={() =>
                                  isReady && setActiveVideo(video)
                                }
                                className={cn(
                                  "group flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
                                  isReady && "cursor-pointer hover:bg-white/6",
                                  isActive && "bg-blue-600/20",
                                )}
                              >
                                {/* Play icon / Now playing indicator */}
                                <div
                                  className={cn(
                                    "flex size-6 shrink-0 items-center justify-center rounded-full transition-all",
                                    isActive
                                      ? "bg-blue-500"
                                      : isReady
                                        ? "bg-white/8 group-hover:bg-blue-500/20"
                                        : "bg-white/4",
                                  )}
                                >
                                  {isActive ? (
                                    <NowPlayingBars />
                                  ) : (
                                    <Play
                                      size={9}
                                      fill="currentColor"
                                      className={cn(
                                        "ml-px transition-colors",
                                        isReady
                                          ? "text-slate-400 group-hover:text-blue-400"
                                          : "text-slate-700",
                                      )}
                                    />
                                  )}
                                </div>

                                <span
                                  className={cn(
                                    "flex-1 text-[13px] leading-snug transition-colors",
                                    isActive
                                      ? "font-medium text-blue-300"
                                      : isReady
                                        ? "text-slate-300 group-hover:text-white"
                                        : "text-slate-600",
                                  )}
                                >
                                  {video.title}
                                </span>

                                <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                                  <Clock size={10} />
                                  {formatDuration(video.duration)}
                                </span>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        {/* 右侧：播放区 */}
        <main className="flex min-h-0 flex-1 flex-col">
          {/* 播放器 */}
          <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
            {activeVideo ? (
              <VideoPlayer
                video={activeVideo}
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-white/8">
                  <Play
                    className="ml-1 size-7 text-slate-500"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="text-sm text-slate-500">
                  从左侧选择一个课时开始播放
                </p>
              </div>
            )}
          </div>

          {/* 视频信息条 */}
          <div className="shrink-0 border-t border-white/8 bg-[#111318] px-5 py-4">
            {activeVideo ? (
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-white leading-snug">
                    {activeVideo.title}
                  </h2>
                  {activeVideo.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                      {activeVideo.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 mt-0.5 flex items-center gap-1.5 rounded-lg bg-white/8 px-2.5 py-1.5 text-xs font-medium text-slate-400">
                  <Clock size={12} />
                  {formatDuration(activeVideo.duration)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                点击左侧课时即可开始播放
              </p>
            )}
          </div>

          {/* 底部：相邻视频导航 */}
          <AdjacentVideoNav
            chapters={chapters}
            activeVideo={activeVideo}
            onSelect={setActiveVideo}
          />
        </main>
      </div>
    </div>
  );
}

/** 正在播放动画条（三根条伸缩动画） */
function NowPlayingBars() {
  return (
    <span className="flex items-end gap-[2px] h-3">
      <span className="w-[2px] rounded-full bg-white animate-[nowplaying_0.9s_ease-in-out_infinite]" style={{ height: "50%" }} />
      <span className="w-[2px] rounded-full bg-white animate-[nowplaying_0.9s_ease-in-out_0.2s_infinite]" style={{ height: "100%" }} />
      <span className="w-[2px] rounded-full bg-white animate-[nowplaying_0.9s_ease-in-out_0.4s_infinite]" style={{ height: "70%" }} />
    </span>
  );
}

/** 底部上一节/下一节导航 */
function AdjacentVideoNav({
  chapters,
  activeVideo,
  onSelect,
}: {
  chapters: ChapterWithVideos[];
  activeVideo: Video | null;
  onSelect: (v: Video) => void;
}) {
  const flatVideos = useMemo(
    () => chapters.flatMap((ch) => ch.videos.filter((v) => v.status === "Ready")),
    [chapters],
  );

  if (flatVideos.length === 0) return null;

  const idx = activeVideo ? flatVideos.findIndex((v) => v.id === activeVideo.id) : -1;
  const prev = idx > 0 ? flatVideos[idx - 1] : null;
  const next = idx < flatVideos.length - 1 ? flatVideos[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-t border-white/8 bg-[#0d0f14] px-5 py-3">
      {prev ? (
        <button
          type="button"
          onClick={() => onSelect(prev)}
          className="flex min-w-0 items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5 text-left transition-colors hover:bg-white/10"
        >
          <ArrowLeft size={14} className="shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">上一节</p>
            <p className="truncate text-xs font-medium text-slate-300">{prev.title}</p>
          </div>
        </button>
      ) : (
        <div />
      )}
      {next ? (
        <button
          type="button"
          onClick={() => onSelect(next)}
          className="flex min-w-0 items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5 text-right transition-colors hover:bg-white/10"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">下一节</p>
            <p className="truncate text-xs font-medium text-slate-300">{next.title}</p>
          </div>
          <ArrowLeft size={14} className="shrink-0 rotate-180 text-slate-400" />
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}
