"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Video as VideoIcon,
  Upload,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  fetchCourse,
  fetchChapters,
  fetchVideos,
  type Chapter,
  type Course,
  type Video,
  formatDuration,
} from "@/lib/courses";
import { getToken } from "@/lib/auth";
import VideoPlayerModal from "@/components/video-player-modal";

/** 列表接口的 status 可能比转码接口滞后，需结合会话内标记判断 */
function isVideoStatusPlayable(status: string | undefined | null) {
  const s = String(status ?? "").trim().toLowerCase();
  if (!s || s === "pending" || s === "processing" || s === "failed") return false;
  return (
    s === "ready" ||
    s === "completed" ||
    s === "published" ||
    s === "active" ||
    s === "success"
  );
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

type ChapterWithVideos = Chapter & { videos: Video[] };

type LessonDraft = {
  title: string;
  description: string;
  file: File | null;
};

type TranscodeItem = {
  resolution: string;
  status: string;
  playlist_url: string | null;
};

type TranscodeStatusResponse = {
  video_id: string;
  video_status: string;
  transcodes: TranscodeItem[];
};

export default function TeacherCourseEditor({
  courseId,
}: {
  courseId: string;
}) {
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<ChapterWithVideos[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapterDrafts, setChapterDrafts] = useState<
    Record<string, { title: string; description: string }>
  >({});
  const [editingChapters, setEditingChapters] = useState<
    Record<string, boolean>
  >({});
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [newChapterDraft, setNewChapterDraft] = useState({
    title: "",
    description: "",
  });
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [videoDrafts, setVideoDrafts] = useState<
    Record<string, { title: string; description: string }>
  >({});

  // 小节创建：每次只允许一个“未保存小节”存在（满足“保存后才能创建下一个小节”）
  const [draftChapterId, setDraftChapterId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LessonDraft>({
    title: "",
    description: "",
    file: null,
  });
  const [savedVideo, setSavedVideo] = useState<Video | null>(null);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [transcodeStatus, setTranscodeStatus] = useState<
    Record<string, TranscodeStatusResponse>
  >({});
  /** 转码接口已 ready 但列表 status 尚未更新时，仍允许播放 */
  const [playableVideoIds, setPlayableVideoIds] = useState<Record<string, boolean>>(
    {},
  );
  const transcodeTimersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const chapterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const token = typeof window === "undefined" ? null : getToken();

  const clearTranscodePolling = (videoId: string) => {
    const timer = transcodeTimersRef.current[videoId];
    if (timer) {
      clearInterval(timer);
      delete transcodeTimersRef.current[videoId];
    }
  };

  useEffect(() => {
    return () => {
      Object.keys(transcodeTimersRef.current).forEach((videoId) =>
        clearTranscodePolling(videoId),
      );
    };
  }, []);

  const totalVideos = useMemo(
    () => chapters.reduce((s, c) => s + c.videos.length, 0),
    [chapters],
  );

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const t = getToken();
        if (!t) {
          if (!silent) setError("请先登录");
          return;
        }
        const auth = { token: t };
        const c = await fetchCourse(courseId, auth);
        const chs = await fetchChapters(courseId, auth).catch(
          () => [] as Chapter[],
        );
        const vids = await Promise.all(
          chs.map((ch) =>
            fetchVideos(ch.id, auth).catch((): Video[] => []),
          ),
        );
        setCourse(c);
        setChapters(chs.map((ch, i) => ({ ...ch, videos: vids[i] })));
        setChapterDrafts((prev) => {
          const next = { ...prev };
          for (const ch of chs) {
            next[ch.id] = {
              title: prev[ch.id]?.title ?? ch.title ?? "",
              description: prev[ch.id]?.description ?? ch.description ?? "",
            };
          }
          return next;
        });
        // 与后端列表对齐后，可清理「仅靠转码接口推断」的可播放标记
        setPlayableVideoIds((prev) => {
          const next = { ...prev };
          chs.forEach((_, i) => {
            const list = vids[i] ?? [];
            for (const v of list) {
              if (isVideoStatusPlayable(v.status)) delete next[v.id];
            }
          });
          return next;
        });
      } catch (e) {
        if (!silent) {
          setError(e instanceof Error ? e.message : "加载失败");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [courseId],
  );

  const isVideoPlayable = useCallback(
    (v: Video) => {
      if (playableVideoIds[v.id]) return true;
      return isVideoStatusPlayable(v.status);
    },
    [playableVideoIds],
  );

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (!chapters.length) {
      setActiveChapterId(null);
      return;
    }
    setActiveChapterId((prev) =>
      prev && chapters.some((c) => c.id === prev) ? prev : chapters[0].id,
    );
  }, [chapters]);

  const openCreateChapterForm = () => {
    setError(null);
    setIsCreatingChapter(true);
    setNewChapterDraft({ title: "", description: "" });
  };

  const createChapter = async () => {
    if (!token) {
      setError("请先登录");
      return;
    }
    const title = newChapterDraft.title.trim();
    if (!title) {
      setError("请填写章节标题");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/chapters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description: newChapterDraft.description.trim() || null,
          sort_order: chapters.length + 1,
        }),
      });
      const body = await safeJson(res);
      if (!res.ok)
        throw new Error(body?.message ?? `创建章节失败 (${res.status})`);
      setIsCreatingChapter(false);
      setNewChapterDraft({ title: "", description: "" });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建章节失败");
    } finally {
      setBusy(false);
    }
  };

  const deleteChapter = async (chapterId: string) => {
    if (!token) {
      setError("请先登录");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/courses/${courseId}/chapters/${chapterId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const body = await safeJson(res);
      if (!res.ok)
        throw new Error(body?.message ?? `删除章节失败 (${res.status})`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除章节失败");
    } finally {
      setBusy(false);
    }
  };

  const saveChapter = async (chapterId: string): Promise<boolean> => {
    if (!token) {
      setError("请先登录");
      return false;
    }
    const d = chapterDrafts[chapterId];
    if (!d) return false;
    const title = d.title.trim();
    if (!title) {
      setError("章节标题不能为空");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title,
        description: d.description.trim() || null,
      };

      const endpoint = `/api/courses/${courseId}/chapters/${chapterId}`;
      const patchRes = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (patchRes.status === 405) {
        const putRes = await fetch(endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const body = await safeJson(putRes);
        if (!putRes.ok)
          throw new Error(body?.message ?? `更新章节失败 (${putRes.status})`);
      } else {
        const body = await safeJson(patchRes);
        if (!patchRes.ok)
          throw new Error(body?.message ?? `更新章节失败 (${patchRes.status})`);
      }

      await refresh();
      setEditingChapters((p) => ({ ...p, [chapterId]: false }));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新章节失败");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const startNewLesson = (chapterId: string) => {
    setError(null);
    // 若存在未保存的小节，阻止继续创建（按需求）
    if (draftChapterId && !savedVideo) {
      setError("请先保存当前小节后再创建下一个小节");
      return;
    }
    setDraftChapterId(chapterId);
    setSavedVideo(null);
    setDraft({ title: "", description: "", file: null });
  };

  const saveLessonMeta = async () => {
    if (!token) {
      setError("请先登录");
      return;
    }
    if (!draftChapterId) return;
    if (!draft.title.trim()) {
      setError("请填写小节标题");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 仅保存小节元数据（不上传文件）
      const res = await fetch(`/api/chapters/${draftChapterId}/videos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          sort_order: 9999,
        }),
      });
      const body = await safeJson(res);
      if (!res.ok) {
        throw new Error(body?.message ?? `保存小节失败 (${res.status})`);
      }
      const video = body as Video;
      if (!video?.id) throw new Error("保存成功但未返回视频 id");
      setSavedVideo(video);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存小节失败");
    } finally {
      setBusy(false);
    }
  };

  const uploadVideo = async () => {
    if (!token) {
      setError("请先登录");
      return;
    }
    if (!savedVideo?.id) {
      setError("请先保存小节信息");
      return;
    }
    if (!draft.file) {
      setError("请选择要上传的视频文件");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const videoId = savedVideo.id;
      setUploadProgress((prev) => ({ ...prev, [videoId]: 0 }));

      const uploadUrlRes = await fetch(`/api/videos/${videoId}/upload-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: draft.file.name,
        }),
      });

      const uploadUrlBody = await safeJson(uploadUrlRes);
      if (!uploadUrlRes.ok) {
        throw new Error(
          uploadUrlBody?.message ?? `申请上传地址失败 (${uploadUrlRes.status})`,
        );
      }

      const uploadUrl = uploadUrlBody?.upload_url as string | undefined;
      const objectKey = uploadUrlBody?.object_key as string | undefined;
      if (!uploadUrl || !objectKey) {
        throw new Error("申请上传地址成功但返回数据不完整");
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", draft.file?.type || "video/mp4");
        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          const p = Math.round((e.loaded / e.total) * 100);
          setUploadProgress((prev) => ({ ...prev, [videoId]: p }));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress((prev) => ({ ...prev, [videoId]: 100 }));
            resolve();
          } else {
            reject(new Error(`上传到对象存储失败 (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("上传到对象存储失败（网络错误）"));
        xhr.send(draft.file);
      });

      const duration = await new Promise<number>((resolve) => {
        const fileUrl = URL.createObjectURL(draft.file as File);
        const media = document.createElement("video");
        media.preload = "metadata";
        media.onloadedmetadata = () => {
          const d = Number.isFinite(media.duration)
            ? Math.max(1, Math.round(media.duration))
            : 1;
          URL.revokeObjectURL(fileUrl);
          resolve(d);
        };
        media.onerror = () => {
          URL.revokeObjectURL(fileUrl);
          resolve(1);
        };
        media.src = fileUrl;
      });

      const confirmRes = await fetch(`/api/videos/${videoId}/confirm-upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          object_key: objectKey,
          duration,
        }),
      });
      const confirmBody = await safeJson(confirmRes);
      if (!confirmRes.ok) {
        throw new Error(confirmBody?.message ?? `确认上传失败 (${confirmRes.status})`);
      }

      const fetchTranscodeStatus = async () => {
        const res = await fetch(`/api/videos/${videoId}/transcodes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await safeJson(res)) as TranscodeStatusResponse | null;
        if (!res.ok) throw new Error(body ? JSON.stringify(body) : `获取进度失败 (${res.status})`);
        if (!body) return;
        const status = body.video_status?.toLowerCase();
        if (status === "ready" || status === "failed") {
          clearTranscodePolling(videoId);
          if (status === "ready") {
            setPlayableVideoIds((prev) => ({ ...prev, [videoId]: true }));
            await refresh({ silent: true });
          }
          setTranscodeStatus((prev) => {
            const next = { ...prev };
            delete next[videoId];
            return next;
          });
          setUploadProgress((prev) => {
            const next = { ...prev };
            delete next[videoId];
            return next;
          });
        } else {
          setTranscodeStatus((prev) => ({ ...prev, [videoId]: body }));
        }
      };

      clearTranscodePolling(videoId);
      await fetchTranscodeStatus();
      transcodeTimersRef.current[videoId] = setInterval(() => {
        void fetchTranscodeStatus().catch(() => {
          // 轮询失败时保持已展示状态，等待下次重试
        });
      }, 3000);

      await refresh({ silent: true });
      // 上传后关闭当前草稿（可继续创建下一个小节）
      setDraftChapterId(null);
      setSavedVideo(null);
      setDraft({ title: "", description: "", file: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setBusy(false);
    }
  };

  const cancelLessonCreation = async () => {
    setError(null);
    // 若已经创建了视频记录（可能也已上传文件），取消时删除该视频
    if (savedVideo?.id) {
      if (!token) {
        setError("请先登录");
        return;
      }
      setBusy(true);
      try {
        const res = await fetch(`/api/videos/${savedVideo.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await safeJson(res);
        if (!res.ok) throw new Error(body?.message ?? `取消创建失败 (${res.status})`);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "取消创建失败");
        return;
      } finally {
        setBusy(false);
      }
    }

    setDraftChapterId(null);
    setSavedVideo(null);
    setDraft({ title: "", description: "", file: null });
  };

  const deleteLesson = async (videoId: string) => {
    if (!token) {
      setError("请先登录");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = await safeJson(res);
      if (!res.ok)
        throw new Error(body?.message ?? `删除小节失败 (${res.status})`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除小节失败");
    } finally {
      setBusy(false);
    }
  };

  const startEditLesson = (v: Video) => {
    setError(null);
    setEditingVideoId(v.id);
    setVideoDrafts((p) => ({
      ...p,
      [v.id]: {
        title: v.title ?? "",
        description: v.description ?? "",
      },
    }));
  };

  const saveLessonEdit = async (videoId: string) => {
    if (!token) {
      setError("请先登录");
      return;
    }
    const d = videoDrafts[videoId];
    if (!d) return;
    const title = d.title.trim();
    if (!title) {
      setError("小节标题不能为空");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = { title, description: d.description.trim() || null };
      const endpoint = `/api/videos/${videoId}`;
      const patchRes = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (patchRes.status === 405) {
        const putRes = await fetch(endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const body = await safeJson(putRes);
        if (!putRes.ok) throw new Error(body?.message ?? `更新小节失败 (${putRes.status})`);
      } else {
        const body = await safeJson(patchRes);
        if (!patchRes.ok) throw new Error(body?.message ?? `更新小节失败 (${patchRes.status})`);
      }

      setEditingVideoId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新小节失败");
    } finally {
      setBusy(false);
    }
  };

  const jumpToChapter = (chapterId: string) => {
    setActiveChapterId(chapterId);
    chapterRefs.current[chapterId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          加载中…
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900">
            课程编辑：{course?.title ?? courseId}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {chapters.length} 章 · {totalVideos} 节
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-xl border-gray-200"
            asChild
          >
            <Link href="/teacher">返回课程管理</Link>
          </Button>
          <Button
            className="rounded-xl gap-2"
            onClick={openCreateChapterForm}
            disabled={busy}
          >
            <Plus size={16} />
            新增章节
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {isCreatingChapter && (
        <Card className="mt-6 rounded-2xl border-gray-100 shadow-xs">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-base">新建章节</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>章节标题</Label>
                <Input
                  value={newChapterDraft.title}
                  onChange={(e) =>
                    setNewChapterDraft((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="例如：第一章：环境搭建"
                  className="rounded-xl bg-white"
                  disabled={busy}
                />
              </div>
              <div className="space-y-1.5">
                <Label>章节描述</Label>
                <Input
                  value={newChapterDraft.description}
                  onChange={(e) =>
                    setNewChapterDraft((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="可选"
                  className="rounded-xl bg-white"
                  disabled={busy}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-gray-200"
                onClick={() => {
                  setIsCreatingChapter(false);
                  setNewChapterDraft({ title: "", description: "" });
                }}
                disabled={busy}
              >
                取消
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                onClick={createChapter}
                disabled={busy}
              >
                保存章节
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-12 gap-4 lg:gap-6 items-start">
        <Card className="hidden lg:block lg:col-span-3 rounded-2xl border-gray-100 shadow-xs sticky top-6">
          <CardHeader className="border-b border-gray-100 py-4">
            <CardTitle className="text-base">章节目录</CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="space-y-1 max-h-[70vh] overflow-auto pr-1">
              {chapters.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => jumpToChapter(ch.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg transition-colors border",
                    activeChapterId === ch.id
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-white border-transparent text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <p className="text-xs text-gray-400">第 {ch.sort_order} 章</p>
                  <p className="text-sm font-medium truncate mt-0.5">
                    {ch.title || "未命名章节"}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="col-span-12 lg:col-span-9 space-y-4">
          {chapters.map((ch) => {
          const isCollapsed = collapsed[ch.id] ?? false;
          const isDraftHere = draftChapterId === ch.id;
          const chDraft = chapterDrafts[ch.id] ?? {
            title: ch.title ?? "",
            description: ch.description ?? "",
          };
          const isEditing = editingChapters[ch.id] ?? false;
          return (
            <div
              key={ch.id}
              ref={(el) => {
                chapterRefs.current[ch.id] = el;
              }}
              onMouseEnter={() => setActiveChapterId(ch.id)}
            >
            <Card className="rounded-2xl border-gray-100 shadow-xs overflow-hidden">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="border-0 bg-blue-50 text-blue-700"
                      >
                        第 {ch.sort_order} 章
                      </Badge>
                      <p className="text-base font-bold text-gray-900 line-clamp-1">
                        {ch.title}
                      </p>
                    </div>
                    {ch.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {ch.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {ch.videos.length} 节
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-gray-200 gap-2"
                      onClick={() =>
                        setEditingChapters((p) => ({
                          ...p,
                          [ch.id]: !isEditing,
                        }))
                      }
                      disabled={busy}
                    >
                      <Pencil size={16} />
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl border-gray-200 gap-2"
                      onClick={() => startNewLesson(ch.id)}
                      disabled={busy}
                    >
                      <Plus size={16} />
                      创建小节
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteChapter(ch.id)}
                      disabled={busy}
                      aria-label="删除章节"
                    >
                      <Trash2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-xl text-gray-500 hover:bg-gray-50"
                      onClick={() =>
                        setCollapsed((p) => ({ ...p, [ch.id]: !isCollapsed }))
                      }
                      aria-label="折叠"
                    >
                      {isCollapsed ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronUp size={16} />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {!isCollapsed && (
                <CardContent className="space-y-4">
                  {/* Chapter edit (toggle by button) */}
                  {isEditing && (
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-base">编辑章节</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl border-gray-200"
                            onClick={() =>
                              setEditingChapters((p) => ({
                                ...p,
                                [ch.id]: false,
                              }))
                            }
                            disabled={busy}
                          >
                            取消
                          </Button>
                          <Button
                            type="button"
                            className="rounded-xl"
                            onClick={() => saveChapter(ch.id)}
                            disabled={busy}
                          >
                            保存章节
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>章节标题</Label>
                          <Input
                            value={chDraft.title}
                            onChange={(e) =>
                              setChapterDrafts((p) => ({
                                ...p,
                                [ch.id]: { ...chDraft, title: e.target.value },
                              }))
                            }
                            placeholder="例如：第一章：环境搭建"
                            className="rounded-xl bg-white"
                            disabled={busy}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>章节描述</Label>
                          <Input
                            value={chDraft.description}
                            onChange={(e) =>
                              setChapterDrafts((p) => ({
                                ...p,
                                [ch.id]: {
                                  ...chDraft,
                                  description: e.target.value,
                                },
                              }))
                            }
                            placeholder="可选"
                            className="rounded-xl bg-white"
                            disabled={busy}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lessons list */}
                  <div className="space-y-2">
                    {ch.videos.length === 0 ? (
                      <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                        暂无小节
                      </div>
                    ) : (
                      ch.videos
                        .slice()
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((v) => (
                          <div key={v.id} className="space-y-2">
                            <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
                              <button
                                type="button"
                                className={cn(
                                  "flex min-w-0 flex-1 items-center gap-3 text-left rounded-lg -my-1 -ml-2 pl-2 pr-2 py-1 transition-colors",
                                  isVideoPlayable(v) && !busy
                                    ? "hover:bg-blue-50/80 cursor-pointer"
                                    : "cursor-default opacity-90"
                                )}
                                disabled={busy || !isVideoPlayable(v)}
                                onClick={() => setPlayingVideo(v)}
                                aria-label={
                                  isVideoPlayable(v)
                                    ? `播放：${v.title}`
                                    : "转码完成后可播放"
                                }
                              >
                                <VideoIcon
                                  size={16}
                                  className={cn(
                                    "shrink-0",
                                    isVideoPlayable(v) ? "text-blue-500" : "text-gray-400"
                                  )}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {v.title}
                                  </p>
                                  {v.description && (
                                    <p className="text-xs text-gray-400 truncate mt-0.5">
                                      {v.description}
                                    </p>
                                  )}
                                </div>
                              </button>
                              <span className="text-xs text-gray-400 shrink-0">
                                {formatDuration(v.duration)}
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "border-0 shrink-0",
                                  v.status === "Ready"
                                    ? "bg-green-50 text-green-700"
                                    : v.status === "Failed"
                                      ? "bg-red-50 text-red-700"
                                      : "bg-gray-100 text-gray-600",
                                )}
                              >
                                {v.status}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                className="rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => setPlayingVideo(v)}
                                disabled={busy || !isVideoPlayable(v)}
                                aria-label="播放"
                                title={
                                  isVideoPlayable(v)
                                    ? "播放"
                                    : "转码完成后可播放"
                                }
                              >
                                <Play size={16} />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                onClick={() => startEditLesson(v)}
                                disabled={busy}
                                aria-label="编辑小节"
                              >
                                <Pencil size={16} />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deleteLesson(v.id)}
                                disabled={busy}
                                aria-label="删除小节"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>

                            {transcodeStatus[v.id] && (
                              <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <span>转码状态：</span>
                                  <span className="font-medium">
                                    {transcodeStatus[v.id].video_status}
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  {transcodeStatus[v.id].transcodes?.map((t) => (
                                    <span
                                      key={`${v.id}-${t.resolution}`}
                                      className={cn(
                                        "text-[11px] px-2 py-0.5 rounded border",
                                        t.status === "done"
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : t.status === "processing"
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : t.status === "failed"
                                              ? "bg-red-50 text-red-700 border-red-200"
                                              : "bg-gray-100 text-gray-600 border-gray-200",
                                      )}
                                    >
                                      {t.resolution}: {t.status}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {editingVideoId === v.id && (
                              <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-bold text-gray-900">编辑小节</p>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="rounded-xl border-gray-200"
                                      onClick={() => setEditingVideoId(null)}
                                      disabled={busy}
                                    >
                                      取消
                                    </Button>
                                    <Button
                                      type="button"
                                      className="rounded-xl"
                                      onClick={() => saveLessonEdit(v.id)}
                                      disabled={busy}
                                    >
                                      保存
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label>小节标题</Label>
                                    <Input
                                      value={videoDrafts[v.id]?.title ?? ""}
                                      onChange={(e) =>
                                        setVideoDrafts((p) => ({
                                          ...p,
                                          [v.id]: {
                                            title: e.target.value,
                                            description:
                                              p[v.id]?.description ?? v.description ?? "",
                                          },
                                        }))
                                      }
                                      className="rounded-xl bg-white"
                                      disabled={busy}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label>小节描述</Label>
                                    <Input
                                      value={videoDrafts[v.id]?.description ?? ""}
                                      onChange={(e) =>
                                        setVideoDrafts((p) => ({
                                          ...p,
                                          [v.id]: {
                                            title: p[v.id]?.title ?? v.title ?? "",
                                            description: e.target.value,
                                          },
                                        }))
                                      }
                                      className="rounded-xl bg-white"
                                      disabled={busy}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </div>

                  {/* Draft creator */}
                  {isDraftHere && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900">
                            创建小节
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {savedVideo
                              ? "已保存小节信息，可选择立即上传或稍后上传"
                              : "请先保存小节信息，保存成功后才能创建下一个小节"}
                          </p>
                        </div>
                        {savedVideo && (
                          <Badge
                            variant="secondary"
                            className="border-0 bg-green-50 text-green-700"
                          >
                            已保存
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>小节标题</Label>
                          <Input
                            value={draft.title}
                            onChange={(e) =>
                              setDraft((p) => ({ ...p, title: e.target.value }))
                            }
                            placeholder="例如：2-1 在线教育系统项目效果演示"
                            className="rounded-xl bg-white"
                            disabled={busy || !!savedVideo}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>小节描述</Label>
                          <Input
                            value={draft.description}
                            onChange={(e) =>
                              setDraft((p) => ({
                                ...p,
                                description: e.target.value,
                              }))
                            }
                            placeholder="可选"
                            className="rounded-xl bg-white"
                            disabled={busy || !!savedVideo}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-1.5">
                        <Label>上传视频（可选）</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="video/*"
                            className="rounded-xl bg-white"
                            onChange={(e) =>
                              setDraft((p) => ({
                                ...p,
                                file: e.target.files?.[0] ?? null,
                              }))
                            }
                            disabled={busy || !savedVideo}
                          />
                          <Button
                            variant="outline"
                            className="rounded-xl border-gray-200 gap-2"
                            type="button"
                            onClick={() =>
                              setDraft((p) => ({ ...p, file: null }))
                            }
                            disabled={busy || !savedVideo}
                          >
                            <Trash2 size={16} />
                            清除
                          </Button>
                        </div>
                        {draft.file && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                            <Upload size={14} />
                            <span className="truncate">{draft.file.name}</span>
                            {savedVideo?.id && uploadProgress[savedVideo.id] >= 0 && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span>上传进度 {uploadProgress[savedVideo.id]}%</span>
                              </>
                            )}
                          </div>
                        )}
                        {!savedVideo && (
                          <p className="text-xs text-gray-500">
                            先点击“保存小节”，保存成功后可上传视频或稍后上传。
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl border-gray-200 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={cancelLessonCreation}
                          disabled={busy}
                        >
                          取消创建
                        </Button>
                        {!savedVideo ? (
                          <Button
                            className="rounded-xl"
                            onClick={saveLessonMeta}
                            disabled={busy}
                          >
                            {busy ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                保存中…
                              </>
                            ) : (
                              "保存小节"
                            )}
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              className="rounded-xl border-gray-200"
                              type="button"
                              onClick={() => {
                                // 结束本次创建（允许创建下一个）
                                setDraftChapterId(null);
                                setSavedVideo(null);
                                setDraft({
                                  title: "",
                                  description: "",
                                  file: null,
                                });
                              }}
                              disabled={busy}
                            >
                              稍后上传
                            </Button>
                            <Button
                              className="rounded-xl gap-2"
                              onClick={uploadVideo}
                              disabled={busy}
                            >
                              <Upload size={16} />
                              立即上传
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
            </div>
          );
          })}
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-400 leading-relaxed">
        注意：上传流程为“申请预签名 URL - PUT 到对象存储 - confirm-upload - 轮询 transcodes”。
        当前页面依赖后端接口：
        <code className="px-1 bg-gray-100 rounded mx-1">
          POST /api/chapters/:chapter_id/videos
        </code>
        （JSON 仅保存小节元数据）、
        <code className="px-1 bg-gray-100 rounded mx-1">
          POST /api/videos/:video_id/upload-url
        </code>
        、
        <code className="px-1 bg-gray-100 rounded mx-1">
          POST /api/videos/:video_id/confirm-upload
        </code>
        和
        <code className="px-1 bg-gray-100 rounded mx-1">
          GET /api/videos/:video_id/transcodes
        </code>
        。
      </div>

      {playingVideo && (
        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </div>
  );
}
