"use client";

import { useEffect, useRef, useState } from "react";
import { type Video } from "@/lib/courses";
import { getToken } from "@/lib/auth";

const RESOLUTIONS = [
  { label: "1080p", value: "1080p" },
  { label: "720p", value: "720p" },
  { label: "480p", value: "480p" },
  { label: "360p", value: "360p" },
];

export default function VideoPlayer({
  video,
  className,
}: {
  video: Video;
  className?: string;
}) {
  const playerRef = useRef<{
    src: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins?: any;
    pause?: () => void;
    destroy: (v?: boolean) => void;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const ac = new AbortController();

    (async () => {
      const token = getToken();
      if (!token) {
        setError("请先登录后再播放视频");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const fetchSignedUrl = async (resolution: string) => {
          const res = await fetch(`/api/videos/${video.id}/hls-url`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            signal: ac.signal,
            body: JSON.stringify({
              resolution,
              ttl_seconds: 600,
            }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body?.message ?? `获取播放地址失败 (${res.status})`);
          }

          const data = (await res.json()) as { playlist_url: string };
          if (!data.playlist_url) throw new Error("后端未返回 playlist_url");
          return data.playlist_url;
        };

        const urls = await Promise.all(
          RESOLUTIONS.map(async (r) => ({
            resolution: r.value,
            label: r.label,
            url: await fetchSignedUrl(r.value),
          }))
        );

        if (disposed || !containerRef.current) return;

        const [Player, HlsPlugin] = await Promise.all([
          import("xgplayer").then((m) => m.default),
          import("xgplayer-hls").then((m) => m.default),
        ]);

        if (disposed || !containerRef.current) return;

        if (playerRef.current) {
          try {
            playerRef.current.pause?.();
            playerRef.current.destroy(true);
          } catch {
            // ignore
          }
          playerRef.current = null;
        }

        const containerEl = containerRef.current;
        const containerWidth = containerEl.offsetWidth || 854;
        const containerHeight = containerEl.offsetHeight || 480;

        const player = new Player({
          el: containerEl,
          url:
            urls.find((u) => u.resolution === "720p")?.url ?? urls[0]?.url ?? "",
          plugins: [HlsPlugin],
          autoplay: true,
          playsinline: true,
          width: containerWidth,
          height: containerHeight,
          fitVideoSize: "fixWidth",
          definition: {
            defaultDefinition: "720p",
            list: urls.map((u) => ({
              definition: u.resolution,
              url: u.url,
              text: { zh: u.label, en: u.label },
            })),
          },
          hlsvod: {
            loadTimeout: 10000,
            preloadTime: 60,
            retryCount: 1,
            retryDelay: 1000,
          },
        });

        playerRef.current = player;
      } catch (err) {
        if (disposed) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg =
          err instanceof Error ? err.message : "获取播放地址失败，请稍后重试";
        setError(msg);
        // eslint-disable-next-line no-console
        console.error("[video-player]", err);
      } finally {
        if (!disposed) setLoading(false);
      }
    })();

    return () => {
      disposed = true;
      ac.abort();
      if (playerRef.current) {
        try {
          playerRef.current.pause?.();
          playerRef.current.destroy(true);
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [video.id]);

  return (
    <div className={className}>
      <div className="bg-black relative w-full h-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-300 z-10">
            正在获取播放地址…
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-red-300 px-4 text-center z-10">
            {error}
          </div>
        )}
        <div key={`player-${video.id}`} ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}

