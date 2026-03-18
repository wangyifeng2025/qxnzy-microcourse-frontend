"use client";

import { useState } from "react";
import { Play, ChevronUp, ChevronDown, Clock } from "lucide-react";
import { type Chapter, type Video, formatDuration } from "@/lib/courses";
import VideoPlayerModal from "@/components/video-player-modal";
import { cn } from "@/lib/utils";

interface ChapterWithVideos extends Chapter {
  videos: Video[];
}

interface ChapterListProps {
  chapters: ChapterWithVideos[];
}

export default function ChapterList({ chapters }: ChapterListProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  if (chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
          <Play size={22} className="text-blue-400" />
        </div>
        <p className="text-sm text-gray-500">暂无章节</p>
      </div>
    );
  }

  const totalVideos = chapters.reduce((sum, c) => sum + c.videos.length, 0);
  const totalSeconds = chapters.reduce(
    (sum, c) => sum + c.videos.reduce((s, v) => s + v.duration, 0),
    0
  );
  const totalMinutes = Math.ceil(totalSeconds / 60);

  return (
    <>
      {/* Chapter list */}
      <div>
        {/* Summary bar */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 px-1">
          <span>{chapters.length} 章</span>
          <span>·</span>
          <span>{totalVideos} 节</span>
          <span>·</span>
          <span>{totalMinutes} 分钟</span>
        </div>

        <ol className="space-y-3">
          {chapters.map((chapter) => {
            const isCollapsed = collapsed[chapter.id] ?? false;
            const chapterMinutes = Math.ceil(
              chapter.videos.reduce((s, v) => s + v.duration, 0) / 60
            );

            return (
              <li key={chapter.id} className="rounded-xl border border-gray-100 overflow-hidden">
                {/* Chapter header */}
                <button
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [chapter.id]: !isCollapsed }))
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
                    <ChevronDown size={15} className="text-gray-400 shrink-0" />
                  ) : (
                    <ChevronUp size={15} className="text-gray-400 shrink-0" />
                  )}
                </button>

                {/* Video list */}
                {!isCollapsed && (
                  <ul className="divide-y divide-gray-50">
                    {chapter.videos.length === 0 ? (
                      <li className="px-4 py-3 text-xs text-gray-400 text-center">
                        暂无视频
                      </li>
                    ) : (
                      chapter.videos.map((video) => {
                        const isReady = video.status === "Ready";
                        return (
                          <li
                            key={video.id}
                            onClick={() => isReady && setActiveVideo(video)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 transition-colors group",
                              isReady
                                ? "hover:bg-blue-50/60 cursor-pointer"
                                : "opacity-60 cursor-not-allowed"
                            )}
                          >
                            {/* Play button */}
                            <div
                              className={cn(
                                "w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-all",
                                isReady
                                  ? "border-gray-200 group-hover:border-blue-500 group-hover:bg-blue-500"
                                  : "border-gray-200"
                              )}
                            >
                              <Play
                                size={10}
                                fill="currentColor"
                                className={cn(
                                  "transition-colors ml-0.5",
                                  isReady
                                    ? "text-gray-400 group-hover:text-white"
                                    : "text-gray-300"
                                )}
                              />
                            </div>

                            {/* Title */}
                            <span
                              className={cn(
                                "flex-1 text-sm leading-snug transition-colors",
                                isReady
                                  ? "text-gray-700 group-hover:text-blue-700"
                                  : "text-gray-400"
                              )}
                            >
                              <span className="text-gray-400 text-xs mr-1">视频：</span>
                              {video.title}
                            </span>

                            {/* Right meta */}
                            <div className="flex items-center gap-2 shrink-0">
                              {!isReady && (
                                <span className="text-[10px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                                  处理中
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock size={11} />
                                {formatDuration(video.duration)}
                              </span>
                            </div>
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

      {/* Video Player Modal */}
      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </>
  );
}
