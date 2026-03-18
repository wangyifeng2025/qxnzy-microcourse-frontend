"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Play, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, type Chapter, type Video } from "@/lib/courses";
import VideoPlayer from "@/components/video-player";

interface ChapterWithVideos extends Chapter {
  videos: Video[];
}

export default function CourseLearning({
  courseTitle,
  chapters,
}: {
  courseTitle: string;
  chapters: ChapterWithVideos[];
}) {
  const firstReady = useMemo(() => {
    for (const ch of chapters) {
      const v = ch.videos.find((x) => x.status === "Ready");
      if (v) return v;
    }
    return null;
  }, [chapters]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeVideo, setActiveVideo] = useState<Video | null>(firstReady);

  return (
    <div className="h-full max-w-[1400px] mx-auto px-6 py-4">
      <div className="h-full grid grid-cols-12 gap-6 items-stretch">
        {/* Left: Chapters */}
        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-bold text-gray-900 truncate">
              {courseTitle}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {chapters.length} 章 ·{" "}
              {chapters.reduce((s, c) => s + c.videos.length, 0)} 节
            </p>
          </div>

          {/* 仅左侧内部滚动，页面不滚动 */}
          <div className="flex-1 min-h-0 overflow-auto">
            <ol className="p-3 space-y-3">
              {chapters.map((chapter) => {
                const isCollapsed = collapsed[chapter.id] ?? false;
                const chapterMinutes = Math.ceil(
                  chapter.videos.reduce((s, v) => s + v.duration, 0) / 60,
                );

                return (
                  <li
                    key={chapter.id}
                    className="rounded-xl border border-gray-100 overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setCollapsed((prev) => ({
                          ...prev,
                          [chapter.id]: !isCollapsed,
                        }))
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-blue-50/60 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                        {chapter.sort_order}
                      </div>
                      <span className="flex-1 text-sm font-semibold text-gray-800 leading-snug">
                        {chapter.title}
                      </span>
                      {chapter.videos.length > 0 && (
                        <span className="text-xs text-gray-400 shrink-0 mr-1">
                          {chapter.videos.length} 节
                          {chapterMinutes > 0 && ` | ${chapterMinutes} 分钟`}
                        </span>
                      )}
                      {isCollapsed ? (
                        <ChevronDown
                          size={15}
                          className="text-gray-400 shrink-0"
                        />
                      ) : (
                        <ChevronUp
                          size={15}
                          className="text-gray-400 shrink-0"
                        />
                      )}
                    </button>

                    {!isCollapsed && (
                      <ul className="divide-y divide-gray-50">
                        {chapter.videos.length === 0 ? (
                          <li className="px-4 py-3 text-xs text-gray-400 text-center">
                            暂无视频
                          </li>
                        ) : (
                          chapter.videos.map((video) => {
                            const isReady = video.status === "Ready";
                            const isActive = activeVideo?.id === video.id;
                            return (
                              <li
                                key={video.id}
                                onClick={() => isReady && setActiveVideo(video)}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-2.5 transition-colors group",
                                  isReady
                                    ? "cursor-pointer hover:bg-blue-50/60"
                                    : "opacity-60 cursor-not-allowed",
                                  isActive && "bg-blue-50",
                                )}
                              >
                                <div
                                  className={cn(
                                    "w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-all",
                                    isReady
                                      ? "border-gray-200 group-hover:border-blue-500 group-hover:bg-blue-500"
                                      : "border-gray-200",
                                    isActive && "border-blue-500 bg-blue-500",
                                  )}
                                >
                                  <Play
                                    size={10}
                                    fill="currentColor"
                                    className={cn(
                                      "transition-colors ml-0.5",
                                      isReady
                                        ? "text-gray-400 group-hover:text-white"
                                        : "text-gray-300",
                                      isActive && "text-white",
                                    )}
                                  />
                                </div>

                                <span
                                  className={cn(
                                    "flex-1 text-sm leading-snug transition-colors",
                                    isReady
                                      ? "text-gray-700 group-hover:text-blue-700"
                                      : "text-gray-400",
                                    isActive && "text-blue-800 font-semibold",
                                  )}
                                >
                                  {video.title}
                                </span>

                                <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                                  <Clock size={11} />
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

        {/* Right: Player */}
        <main className="col-span-12 lg:col-span-8 xl:col-span-9 min-h-0">
          <div className="h-full bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {activeVideo?.title ?? "请选择左侧视频开始学习"}
                </p>
                {activeVideo?.description && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {activeVideo.description}
                  </p>
                )}
              </div>
              {activeVideo && (
                <span className="text-xs text-gray-400 shrink-0">
                  {formatDuration(activeVideo.duration)}
                </span>
              )}
            </div>

            <div className="flex-1 min-h-0">
              {activeVideo ? (
                <VideoPlayer video={activeVideo} className="h-full" />
              ) : (
                <div className="h-full bg-black flex items-center justify-center text-sm text-gray-300">
                  从左侧选择一个“已就绪”的视频开始播放
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
