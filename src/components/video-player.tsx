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
    let resizeObserver: ResizeObserver | null = null;
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

        if (disposed || !containerRef.current) return;

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

        if (disposed) {
          try {
            player.destroy();
          } catch {
            // ignore
          }
          return;
        }

        playerRef.current = player;

        const resize = () => {
          if (disposed || !containerRef.current || !playerRef.current) return;
          const el = containerRef.current;
          const w = el.offsetWidth || el.clientWidth;
          const h = el.offsetHeight || el.clientHeight;
          if (w <= 0 || h <= 0) return;
          try {
            const p = playerRef.current as {
              resize?: () => void;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              emit?: (ev: string, ...args: any[]) => void;
            };
            p.resize?.();
            p.emit?.("resize", { width: w, height: h });
          } catch {
            // ignore
          }
        };

        resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(resize);
        });
        resizeObserver.observe(containerEl);
        requestAnimationFrame(resize);
      } catch (err) {
        if (disposed) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg =
          err instanceof Error ? err.message : "获取播放地址失败，请稍后重试";
        setError(msg);
        console.error("[video-player]", err);
      } finally {
        if (!disposed) setLoading(false);
      }
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
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
      <div className="relative h-full w-full bg-black">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-white/8">
              <svg
                className="size-6 animate-spin text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            </div>
            <p className="text-xs font-medium text-slate-400">加载中…</p>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-500/15">
              <svg className="size-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-400">播放失败</p>
            <p className="text-xs text-slate-500">{error}</p>
          </div>
        )}
        <div key={`player-${video.id}`} ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}

