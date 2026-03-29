"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/auth";
import { type Course } from "@/lib/courses";
import { cn } from "@/lib/utils";

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

type UploadUrlResponse = {
  upload_url?: string;
  object_key?: string;
  expires_in?: number;
  message?: string;
};

/** 后端 cover_image_url 存的是对象存储 key（如 course-covers/{course_id}/a.jpg），不是公网 URL */
function looksLikeHttpUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

/**
 * 保存到 PUT/PATCH 的 cover_image_url：应为 object key（course-covers/…）。
 * 若误粘贴了完整 URL，仅当路径中含 course-covers/ 时解析为 key；否则返回 null。
 */
function normalizeCoverImageUrlForSave(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (looksLikeHttpUrl(v)) {
    try {
      const u = new URL(v);
      const path = u.pathname.replace(/^\/+/, "");
      const idx = path.indexOf("course-covers/");
      if (idx >= 0) return path.slice(idx);
    } catch {
      return null;
    }
    return null;
  }
  return v.replace(/^\/+/, "");
}

export default function TeacherCourseInfoEdit({
  courseId,
}: {
  courseId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadPct, setCoverUploadPct] = useState<number | null>(null);
  const [coverDeleting, setCoverDeleting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const pendingPreview = useMemo(() => {
    if (pendingCoverFile) return URL.createObjectURL(pendingCoverFile);
    return "";
  }, [pendingCoverFile]);

  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  const loadCourse = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("请先登录");
      return;
    }
    setError(null);
    const res = await fetch(`/api/courses/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await safeJson(res)) as Course | null;
    if (!res.ok) {
      throw new Error(
        (body as { message?: string })?.message ??
          `加载课程失败 (${res.status})`,
      );
    }
    if (!body) throw new Error("课程数据为空");
    setTitle(body.title ?? "");
    setDescription(body.description ?? "");
    setCoverImageUrl(body.cover_image_url ?? "");
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const token = getToken();
      if (!token) {
        setError("请先登录");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        await loadCourse();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [courseId, loadCourse]);

  /** 选择文件后上传到 MinIO 并 confirm，不写简介 */
  const uploadCoverFile = async (file: File) => {
    const token = getToken();
    if (!token) {
      setError("请先登录");
      return;
    }
    setCoverUploading(true);
    setCoverUploadPct(0);
    setError(null);
    setSuccess(null);
    try {
      const urlRes = await fetch(
        `/api/courses/${courseId}/cover/upload-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ filename: file.name }),
        },
      );
      const urlBody = (await safeJson(urlRes)) as UploadUrlResponse;
      if (!urlRes.ok) {
        throw new Error(
          urlBody?.message ?? `申请封面上传地址失败 (${urlRes.status})`,
        );
      }
      const uploadUrl = urlBody.upload_url;
      const objectKey = urlBody.object_key;
      if (!uploadUrl || !objectKey) {
        throw new Error("申请封面上传地址成功但返回数据不完整");
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "application/octet-stream",
        );
        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          setCoverUploadPct(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setCoverUploadPct(100);
            resolve();
          } else {
            reject(new Error(`上传封面到对象存储失败 (${xhr.status})`));
          }
        };
        xhr.onerror = () =>
          reject(new Error("上传封面失败（网络错误）"));
        xhr.send(file);
      });

      const confirmRes = await fetch(
        `/api/courses/${courseId}/cover/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ object_key: objectKey }),
        },
      );
      const confirmBody = await safeJson(confirmRes);
      if (!confirmRes.ok) {
        throw new Error(
          (confirmBody as { message?: string })?.message ??
            `确认封面失败 (${confirmRes.status})`,
        );
      }

      setPendingCoverFile(null);
      setFileInputKey((k) => k + 1);
      await loadCourse();
      setSuccess("封面已更新");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "封面上传失败");
    } finally {
      setCoverUploading(false);
      setCoverUploadPct(null);
    }
  };

  const deleteCover = async () => {
    if (!confirm("确定删除当前课程封面吗？")) return;
    const token = getToken();
    if (!token) {
      setError("请先登录");
      return;
    }
    setCoverDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/cover`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await safeJson(res);
      if (!res.ok) {
        throw new Error(
          (body as { message?: string })?.message ??
            `删除封面失败 (${res.status})`,
        );
      }
      await loadCourse();
      setSuccess("已删除封面");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除封面失败");
    } finally {
      setCoverDeleting(false);
    }
  };

  /** 保存简介与封面 object key（字段名仍为 cover_image_url，值为 course-covers/...） */
  const save = async () => {
    const token = getToken();
    if (!token) {
      setError("请先登录");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const coverKey = normalizeCoverImageUrlForSave(coverImageUrl);
      if (coverImageUrl.trim() && coverKey === null) {
        throw new Error(
          "封面请填写 MinIO object key（如 course-covers/课程ID/文件名.jpg），不要粘贴无法解析的链接",
        );
      }
      const payload = {
        description: description.trim(),
        cover_image_url: coverKey,
      };

      const endpoint = `/api/courses/${courseId}`;
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
        const putBody = await safeJson(putRes);
        if (!putRes.ok) {
          throw new Error(
            putBody?.message ?? `保存失败 (${putRes.status})`,
          );
        }
      } else {
        const patchBody = await safeJson(patchRes);
        if (!patchRes.ok) {
          throw new Error(
            patchBody?.message ?? `保存失败 (${patchRes.status})`,
          );
        }
      }

      await loadCourse();
      setSuccess("已保存");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[720px] mx-auto px-6 py-10 flex items-center gap-2 text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        加载中…
      </div>
    );
  }

  /** object key 不能作为 <img src>；仅 http(s) 或 blob 可预览 */
  const coverPreviewSrc =
    pendingPreview ||
    (coverImageUrl.trim() && looksLikeHttpUrl(coverImageUrl)
      ? coverImageUrl.trim()
      : "");

  return (
    <div className="max-w-[720px] mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900">编辑课程信息</p>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{title}</p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl border-gray-200 shrink-0"
          asChild
        >
          <Link href="/teacher" className="gap-2">
            <ArrowLeft size={16} />
            返回控制台
          </Link>
        </Button>
      </div>

      <Card className="mt-6 rounded-2xl border-gray-100 shadow-xs">
        <CardHeader className="border-b border-gray-100">
          <CardTitle>简介与封面</CardTitle>
          <CardDescription>
            封面上传后入库的为 MinIO object key（course-covers/课程ID/文件名）；保存时「封面」字段也提交该
            key。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 aspect-video flex items-center justify-center relative">
            {coverPreviewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreviewSrc}
                alt="封面预览"
                className="w-full h-full object-cover"
              />
            ) : coverImageUrl.trim() ? (
              <div className="text-gray-500 flex flex-col items-center gap-2 px-4 text-center">
                <ImageIcon size={28} className="text-gray-400" />
                <span className="text-xs">当前为 object key，无法直接预览图片</span>
                <code className="text-[11px] break-all max-w-full bg-white/80 rounded px-2 py-1 border border-gray-100">
                  {coverImageUrl.trim()}
                </code>
              </div>
            ) : (
              <div className="text-gray-400 flex flex-col items-center gap-2">
                <ImageIcon size={28} />
                <span className="text-xs">暂无封面</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>上传封面图片</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                key={fileInputKey}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                className="rounded-xl max-w-[280px]"
                disabled={coverUploading || coverDeleting}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setPendingCoverFile(f);
                  setSuccess(null);
                }}
              />
              <Button
                type="button"
                className="rounded-xl gap-2"
                disabled={
                  !pendingCoverFile || coverUploading || coverDeleting
                }
                onClick={() => {
                  if (pendingCoverFile) void uploadCoverFile(pendingCoverFile);
                }}
              >
                {coverUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    上传中…
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    上传并应用
                  </>
                )}
              </Button>
              {pendingCoverFile && (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl text-gray-600"
                  disabled={coverUploading}
                  onClick={() => {
                    setPendingCoverFile(null);
                    setFileInputKey((k) => k + 1);
                  }}
                >
                  清除
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-gray-200 text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
                disabled={
                  !coverImageUrl ||
                  coverUploading ||
                  coverDeleting
                }
                onClick={() => void deleteCover()}
              >
                {coverDeleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                删除封面
              </Button>
            </div>
            {coverUploadPct !== null && (
              <p className="text-xs text-gray-500">
                上传进度 {coverUploadPct}%
              </p>
            )}
            <p className="text-xs text-gray-400">
              流程：申请预签名 → PUT 到 MinIO →
              确认入库。支持常见图片扩展名（以后端校验为准）。
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cover_image_url">
              封面 object key（提交字段 cover_image_url）
            </Label>
            <Input
              id="cover_image_url"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder={`例如 course-covers/${courseId}/cover.jpg`}
              className="rounded-xl font-mono text-sm"
            />
            <p className="text-xs text-gray-400">
              应保存为{" "}
              <code className="px-1 bg-gray-100 rounded">course-covers/…</code>{" "}
              形式的 key；上传成功后会自动回填。若误粘贴完整 URL，保存时会尽量解析出
              course-covers/ 段。
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">课程简介</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要介绍课程内容与适用人群"
              className={cn(
                "w-full min-h-[140px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              )}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              {success}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100">
          <Button variant="outline" className="rounded-xl border-gray-200" asChild>
            <Link href={`/teacher/courses/${courseId}`}>去编辑章节与视频</Link>
          </Button>
          <Button
            className="rounded-xl gap-2"
            onClick={() => void save()}
            disabled={saving || coverUploading}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                保存中…
              </>
            ) : (
              <>
                <Save size={16} />
                保存简介与封面
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
