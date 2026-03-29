"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { ArrowRight, Image as ImageIcon, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getToken, getUser } from "@/lib/auth";
import {
  deleteCourseCover,
  looksLikeHttpUrl,
  normalizeCoverImageUrlForSave,
  uploadCourseCoverViaPresign,
} from "@/lib/course-cover";
import { cn } from "@/lib/utils";

type FormValues = {
  title: string;
  description: string;
  cover_image_url: string;
  major_id: string;
};

type Major = {
  id: string;
  name: string;
  code?: string;
};

type MajorsResponse = {
  items?: Major[];
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function TeacherCourseCreate() {
  const router = useRouter();
  const user = getUser();
  const [serverError, setServerError] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  /** 创建成功但封面上传未完成时，用于卸载/取消时 DELETE /cover 清理 MinIO */
  const pendingCoverCleanupCourseIdRef = useRef<string | null>(null);
  const [coverUploadPct, setCoverUploadPct] = useState<number | null>(null);
  const [majors, setMajors] = useState<Major[]>([]);
  const [isLoadingMajors, setIsLoadingMajors] = useState(false);
  const [majorsError, setMajorsError] = useState<string | null>(null);

  const coverPreview = useMemo(() => {
    if (coverFile) return URL.createObjectURL(coverFile);
    return "";
  }, [coverFile]);

  useEffect(() => {
    let cancelled = false;
    const fetchMajors = async () => {
      const token = getToken();
      if (!token) {
        setMajorsError("请先登录后再选择专业方向");
        setMajors([]);
        return;
      }

      setIsLoadingMajors(true);
      setMajorsError(null);
      try {
        const res = await fetch("/api/majors?page_size=20", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const body = (await safeJson(res)) as MajorsResponse | null;
        if (!res.ok) {
          throw new Error(
            res.status === 401
              ? "登录状态已失效，请重新登录"
              : `获取专业方向失败 (${res.status})`,
          );
        }
        if (!cancelled) setMajors(Array.isArray(body?.items) ? body.items : []);
      } catch (e) {
        if (!cancelled) {
          setMajorsError(
            e instanceof Error ? e.message : "获取专业方向失败，请稍后重试",
          );
          setMajors([]);
        }
      } finally {
        if (!cancelled) setIsLoadingMajors(false);
      }
    };
    void fetchMajors();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 离开页面时：若已创建课程但封面上传流程未走完，删除 MinIO 中的封面 */
  useEffect(() => {
    return () => {
      const courseId = pendingCoverCleanupCourseIdRef.current;
      if (!courseId) return;
      const token = getToken();
      if (!token) return;
      pendingCoverCleanupCourseIdRef.current = null;
      void fetch(`/api/courses/${courseId}/cover`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        /* 忽略卸载时清理失败 */
      });
    };
  }, []);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      cover_image_url: "",
      major_id: "",
    } as FormValues,
    onSubmit: async ({ value }) => {
      setServerError(null);
      const token = getToken();
      if (!token) {
        setServerError("请先登录后再创建课程");
        return;
      }
      try {
        let coverForPost = "";
        if (coverFile) {
          coverForPost = "";
        } else {
          const k = normalizeCoverImageUrlForSave(value.cover_image_url);
          if (value.cover_image_url.trim() && k === null) {
            throw new Error(
              "封面请填写 MinIO object key（如 course-covers/…），或选择本地文件上传",
            );
          }
          coverForPost = k ?? "";
        }

        const payload = {
          title: value.title.trim(),
          description: value.description.trim(),
          cover_image_url: coverForPost,
          major_id: value.major_id.trim(),
        };

        const res = await fetch("/api/courses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const body = await safeJson(res);
        if (!res.ok)
          throw new Error(body?.message ?? `创建课程失败 (${res.status})`);
        const id = body?.id as string | undefined;
        if (!id) throw new Error("创建课程成功但未返回 id");

        if (coverFile) {
          pendingCoverCleanupCourseIdRef.current = id;
          setCoverUploadPct(0);
          try {
            await uploadCourseCoverViaPresign(id, coverFile, token, (pct) =>
              setCoverUploadPct(pct),
            );
          } catch (uploadErr) {
            try {
              await deleteCourseCover(id, token);
            } catch {
              /* 已尽力清理 */
            }
            pendingCoverCleanupCourseIdRef.current = null;
            throw uploadErr;
          }
          pendingCoverCleanupCourseIdRef.current = null;
          setCoverUploadPct(null);
        }

        router.push(`/teacher/courses/${id}`);
      } catch (e) {
        setServerError(e instanceof Error ? e.message : "创建课程失败");
        setCoverUploadPct(null);
      }
    },
  });

  const manualCoverInput = form.state.values.cover_image_url?.trim() ?? "";
  const coverImgSrc =
    coverPreview ||
    (manualCoverInput && looksLikeHttpUrl(manualCoverInput)
      ? manualCoverInput
      : "");

  return (
    <div className="max-w-[980px] mx-auto px-6 py-10">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900">创建课程</p>
          <p className="text-sm text-gray-500 mt-1">
            先创建课程基础信息，创建后在同一页面管理章节与小节视频
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl border-gray-200"
          onClick={() => router.push("/teacher")}
        >
          返回课程管理
        </Button>
      </div>
      {/* 课程创建表单 */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <Card className="lg:col-span-2 rounded-2xl border-gray-100 shadow-xs">
          <CardHeader className="border-b border-gray-100">
            <CardTitle>课程封面</CardTitle>
            <CardDescription>
              本地文件在提交「创建」后上传至 MinIO；仅填 key 则随创建请求提交。离开页面且上传未完成时会删除
              MinIO 中的封面。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 aspect-video flex items-center justify-center relative">
              {coverImgSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImgSrc}
                  alt="封面预览"
                  className="w-full h-full object-cover"
                />
              ) : manualCoverInput ? (
                <div className="text-gray-500 flex flex-col items-center gap-2 px-3 text-center">
                  <ImageIcon size={24} className="text-gray-400" />
                  <span className="text-xs">当前为 object key，无法直接预览</span>
                  <code className="text-[11px] break-all max-w-full bg-white/80 rounded px-2 py-1 border border-gray-100">
                    {manualCoverInput}
                  </code>
                </div>
              ) : (
                <div className="text-gray-400 flex flex-col items-center gap-2">
                  <ImageIcon size={20} />
                  <span className="text-xs">暂无封面</span>
                </div>
              )}
            </div>

            <form.Field name="cover_image_url">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name} className="text-xs text-gray-500">
                    封面 object key（可选，无本地文件时与创建一并提交）
                  </Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="course-covers/…/文件名.jpg"
                    disabled={!!coverFile}
                    className="rounded-xl font-mono text-sm"
                  />
                  {coverFile && (
                    <p className="text-xs text-amber-600">
                      已选择本地文件，创建后将优先上传文件；下方 key 不会提交。
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">
                上传封面文件（创建成功后自动上传并确认）
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                  className="rounded-xl"
                  disabled={coverUploadPct !== null}
                  onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-gray-200"
                  disabled={coverUploadPct !== null}
                  onClick={() => setCoverFile(null)}
                >
                  清除
                </Button>
              </div>
              {coverUploadPct !== null && (
                <p className="text-xs text-gray-500">
                  封面上传中… {coverUploadPct}%
                </p>
              )}
            </div>
            <p className="text-xs text-gray-400">
              字段{" "}
              <code className="px-1 bg-gray-100 rounded">cover_image_url</code>{" "}
              存 object key；若上传失败会尝试删除 MinIO 中已写入的封面。
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 rounded-2xl border-gray-100 shadow-xs">
          <CardHeader className="border-b border-gray-100">
            <CardTitle>课程信息</CardTitle>
            <CardDescription>
              创建后进入课程编辑页管理章节与小节
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form.Field
              name="title"
              validators={{
                onChange: ({ value }) =>
                  !value.trim()
                    ? "请输入课程标题"
                    : value.trim().length < 2
                      ? "标题至少 2 个字符"
                      : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>课程标题</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="例如：Rust 后端实战入门"
                    className={cn(
                      "rounded-xl h-10",
                      field.state.meta.errors.length > 0 &&
                        "border-red-400 focus-visible:ring-red-200",
                    )}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-red-500">
                      {field.state.meta.errors[0]?.toString()}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field
              name="description"
              validators={{
                onChange: ({ value }) =>
                  !value.trim()
                    ? "请输入课程简介"
                    : value.trim().length < 2
                      ? "简介至少 2 个字符"
                      : undefined,
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor={field.name}>课程简介</Label>
                  <textarea
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="一句话说明课程内容与适用人群"
                    className={cn(
                      "w-full min-h-[120px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      field.state.meta.errors.length > 0 &&
                        "border-red-400 focus-visible:ring-red-200",
                    )}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-red-500">
                      {field.state.meta.errors[0]?.toString()}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>所属</Label>
                <Input
                  value={user?.real_name || user?.username || ""}
                  readOnly
                  className="rounded-xl bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-400">
                  由后端根据登录用户自动填写
                </p>
              </div>
              <form.Field
                name="major_id"
                validators={{
                  onChange: ({ value }) =>
                    !value.trim() ? "请选择专业方向" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name}>专业方向</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                      disabled={isLoadingMajors || !!majorsError}
                    >
                      <SelectTrigger
                        id={field.name}
                        onBlur={field.handleBlur}
                        className={cn(
                          "w-full rounded-xl",
                          field.state.meta.errors.length > 0 &&
                            "border-red-400 focus-visible:ring-red-200",
                        )}
                      >
                        <SelectValue
                          placeholder={
                            isLoadingMajors
                              ? "专业方向加载中..."
                              : "请选择专业方向"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {majors.map((major) => (
                          <SelectItem key={major.id} value={major.id}>
                            {major.name}
                            {major.code ? ` (${major.code})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {majorsError && (
                      <p className="text-xs text-red-500">{majorsError}</p>
                    )}
                    {!isLoadingMajors &&
                      !majorsError &&
                      majors.length === 0 && (
                        <p className="text-xs text-gray-500">
                          暂无可用专业方向
                        </p>
                      )}
                    <p className="text-xs text-gray-400">
                      将提交所选专业的{" "}
                      <code className="px-1 bg-gray-100 rounded">id</code> 作为
                      <code className="px-1 bg-gray-100 rounded">major_id</code>
                    </p>
                    <input
                      type="hidden"
                      name={field.name}
                      value={field.state.value}
                      readOnly
                      className={cn(
                        "hidden",
                        field.state.meta.errors.length > 0 && "aria-invalid",
                      )}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-red-500">
                        {field.state.meta.errors[0]?.toString()}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            {serverError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {serverError}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  className="rounded-xl gap-2"
                  disabled={!canSubmit || !!isSubmitting}
                  onClick={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      创建中…
                    </>
                  ) : (
                    <>
                      创建并进入编辑
                      <ArrowRight size={16} />
                    </>
                  )}
                </Button>
              )}
            </form.Subscribe>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
