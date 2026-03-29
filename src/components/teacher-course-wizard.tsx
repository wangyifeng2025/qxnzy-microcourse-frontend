"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  Video as VideoIcon,
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getToken, getUser } from "@/lib/auth";

type Step = 1 | 2;

type LessonDraft = {
  title: string;
  description: string;
  file: File | null;
};

type ChapterDraft = {
  title: string;
  description: string;
  lessons: LessonDraft[];
};

type FormValues = {
  course: {
    title: string;
    description: string;
    cover_image_url: string;
    major_id: string;
  };
  chapters: ChapterDraft[];
};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const DEFAULT_LESSON: LessonDraft = { title: "", description: "", file: null };
const DEFAULT_CHAPTER: ChapterDraft = {
  title: "",
  description: "",
  lessons: [{ ...DEFAULT_LESSON }],
};

export default function TeacherCourseWizard() {
  const router = useRouter();
  const user = getUser();

  const [step, setStep] = useState<Step>(1);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Editor selection (Step2)
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [activeLessonIdx, setActiveLessonIdx] = useState(0);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const coverPreview = useMemo(() => {
    if (coverFile) return URL.createObjectURL(coverFile);
    return "";
  }, [coverFile]);

  const form = useForm({
    defaultValues: {
      course: {
        title: "",
        description: "",
        cover_image_url: "",
        major_id: "",
      },
      chapters: [{ ...DEFAULT_CHAPTER }],
    } as FormValues,
    onSubmit: async () => {
      // 最终提交由按钮显式触发 submitAll，这里留空
    },
  });

  const chapters = form.state.values.chapters;
  const activeChapter = chapters[activeChapterIdx] ?? chapters[0];
  const activeLesson = activeChapter?.lessons?.[activeLessonIdx];

  const setChapters = (next: ChapterDraft[]) => {
    form.setFieldValue("chapters", next);
  };

  const addChapter = () => {
    const next = [...chapters, { ...DEFAULT_CHAPTER }];
    setChapters(next);
    setActiveChapterIdx(next.length - 1);
    setActiveLessonIdx(0);
  };

  const removeChapter = (idx: number) => {
    if (chapters.length <= 1) return;
    const next = chapters.filter((_, i) => i !== idx);
    setChapters(next);
    const nextChapterIdx = Math.max(0, Math.min(activeChapterIdx, next.length - 1));
    setActiveChapterIdx(nextChapterIdx);
    setActiveLessonIdx(0);
  };

  const updateChapter = (idx: number, patch: Partial<Omit<ChapterDraft, "lessons">>) => {
    const next = chapters.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    setChapters(next);
  };

  const addLesson = (chapterIdx: number) => {
    const next = chapters.map((c, i) =>
      i === chapterIdx ? { ...c, lessons: [...c.lessons, { ...DEFAULT_LESSON }] } : c
    );
    setChapters(next);
    setActiveChapterIdx(chapterIdx);
    setActiveLessonIdx((next[chapterIdx]?.lessons.length ?? 1) - 1);
  };

  const removeLesson = (chapterIdx: number, lessonIdx: number) => {
    const target = chapters[chapterIdx];
    if (!target) return;
    if (target.lessons.length <= 1) return;
    const next = chapters.map((c, i) =>
      i === chapterIdx
        ? { ...c, lessons: c.lessons.filter((_, j) => j !== lessonIdx) }
        : c
    );
    setChapters(next);
    setActiveChapterIdx(chapterIdx);
    setActiveLessonIdx(Math.max(0, Math.min(activeLessonIdx, (next[chapterIdx]?.lessons.length ?? 1) - 1)));
  };

  const updateLesson = (
    chapterIdx: number,
    lessonIdx: number,
    patch: Partial<LessonDraft>
  ) => {
    const next = chapters.map((c, i) =>
      i === chapterIdx
        ? {
            ...c,
            lessons: c.lessons.map((l, j) => (j === lessonIdx ? { ...l, ...patch } : l)),
          }
        : c
    );
    setChapters(next);
  };

  const submitStep1 = async () => {
    setServerError(null);
    const token = getToken();
    if (!token) {
      setServerError("请先登录后再创建课程");
      return;
    }
    const course = form.state.values.course;
    const courseValid =
      course.title.trim().length >= 2 &&
      course.description.trim().length >= 2 &&
      course.major_id.trim().length > 0;
    if (!courseValid) {
      setServerError("请完善课程标题、简介和专业方向（major_id）");
      return;
    }
    if (createdCourseId) {
      setStep(2);
      return;
    }

    setBusy(true);
    try {
      const payload = {
        title: form.state.values.course.title.trim(),
        description: form.state.values.course.description.trim(),
        cover_image_url: form.state.values.course.cover_image_url.trim(),
        major_id: form.state.values.course.major_id.trim(),
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
      if (!res.ok) throw new Error(body?.message ?? `创建课程失败 (${res.status})`);
      const id = body?.id as string | undefined;
      if (!id) throw new Error("创建课程成功但未返回 id");

      setCreatedCourseId(id);
      setStep(2);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "创建课程失败");
    } finally {
      setBusy(false);
    }
  };

  const submitAll = async () => {
    setServerError(null);
    const token = getToken();
    if (!token) {
      setServerError("请先登录后再创建课程");
      return;
    }
    if (!createdCourseId) {
      setServerError("请先完成第 1 步并保存课程信息");
      setStep(1);
      return;
    }

    const hasAnyFile = chapters.some((c) => c.lessons.some((l) => !!l.file));
    if (!hasAnyFile) {
      setServerError("请至少上传一个小节视频文件");
      return;
    }

    setBusy(true);
    try {
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const createChapterRes = await fetch(
          `/api/courses/${createdCourseId}/chapters`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: ch.title.trim() || `第 ${i + 1} 章`,
              description: ch.description.trim() || null,
              sort_order: i + 1,
            }),
          }
        );

        const createdChapter = await safeJson(createChapterRes);
        if (!createChapterRes.ok) {
          throw new Error(
            createdChapter?.message ??
              `创建章节失败（第 ${i + 1} 章）(${createChapterRes.status})`
          );
        }
        const chapterId = createdChapter?.id as string | undefined;
        if (!chapterId) throw new Error("创建章节成功但未返回 chapter.id");

        for (let j = 0; j < ch.lessons.length; j++) {
          const lesson = ch.lessons[j];
          if (!lesson.file) continue;

          const fd = new FormData();
          fd.set("title", lesson.title.trim() || `第 ${j + 1} 节`);
          fd.set("description", lesson.description.trim());
          fd.set("sort_order", String(j + 1));
          fd.set("file", lesson.file);

          const uploadRes = await fetch(`/api/chapters/${chapterId}/videos`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: fd,
          });

          const uploaded = await safeJson(uploadRes);
          if (!uploadRes.ok) {
            throw new Error(
              uploaded?.message ??
                `上传视频失败（第 ${i + 1} 章 / 第 ${j + 1} 节）(${uploadRes.status})`
            );
          }
        }
      }

      router.push("/teacher");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900">创建课程</p>
          <p className="text-sm text-gray-500 mt-1">
            常见流程：先保存课程基础信息，再编写章节并上传小节视频
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl border-gray-200"
          onClick={() => router.push("/teacher")}
          disabled={busy}
        >
          返回课程管理
        </Button>
      </div>

      {/* Stepper */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card
          className={cn(
            "rounded-2xl border-gray-100 shadow-xs",
            step === 1 && "border-blue-200 bg-blue-50/30"
          )}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold",
                  step > 1
                    ? "bg-green-600 text-white"
                    : step === 1
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-500"
                )}
              >
                {step > 1 ? <Check size={16} /> : 1}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">课程信息</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  封面、标题、简介、所属、专业方向
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "rounded-2xl border-gray-100 shadow-xs",
            step === 2 && "border-blue-200 bg-blue-50/30"
          )}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold",
                  step === 2 ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                )}
              >
                2
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">章节与小节</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  左侧结构，右侧编辑；小节绑定视频文件
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {serverError && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {serverError}
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Cover */}
          <Card className="lg:col-span-2 rounded-2xl border-gray-100 shadow-xs">
            <CardHeader className="border-b border-gray-100">
              <CardTitle>课程封面</CardTitle>
              <CardDescription>支持封面 URL 与本地图片预览</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 aspect-video flex items-center justify-center relative">
                {coverPreview || form.state.values.course.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverPreview || form.state.values.course.cover_image_url}
                    alt="封面预览"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center gap-2">
                    <ImageIcon size={20} />
                    <span className="text-xs">暂无封面</span>
                  </div>
                )}
              </div>

              <form.Field name="course.cover_image_url">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name} className="text-xs text-gray-500">
                      封面 URL（可选）
                    </Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="https://..."
                      className="rounded-xl"
                    />
                  </div>
                )}
              </form.Field>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">上传封面（预览用）</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="rounded-xl"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setCoverFile(f);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-gray-200"
                    onClick={() => setCoverFile(null)}
                  >
                    清除
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                提示：封面最终以你填写的 <code className="px-1 bg-gray-100 rounded">cover_image_url</code> 提交；本地上传目前仅作预览。
              </p>
            </CardContent>
          </Card>

          {/* Form */}
          <Card className="lg:col-span-3 rounded-2xl border-gray-100 shadow-xs">
            <CardHeader className="border-b border-gray-100">
              <CardTitle>课程信息</CardTitle>
              <CardDescription>保存后才能进入章节与小节编辑</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form.Field
                name="course.title"
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
                          "border-red-400 focus-visible:ring-red-200"
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
                name="course.description"
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
                        "w-full min-h-[110px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                        field.state.meta.errors.length > 0 &&
                          "border-red-400 focus-visible:ring-red-200"
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
                  name="course.major_id"
                  validators={{
                    onChange: ({ value }) =>
                      !value.trim() ? "请填写 major_id" : undefined,
                  }}
                >
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor={field.name}>专业方向（major_id）</Label>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="例如：622d... 或 backend/rust"
                        className={cn(
                          "rounded-xl",
                          field.state.meta.errors.length > 0 &&
                            "border-red-400 focus-visible:ring-red-200"
                        )}
                      />
                      {field.state.meta.errors.length > 0 ? (
                        <p className="text-xs text-red-500">
                          {field.state.meta.errors[0]?.toString()}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">
                          后续可接入专业方向列表做下拉选择
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <form.Subscribe
                selector={(s) => [
                  s.values.course.title,
                  s.values.course.description,
                  s.values.course.major_id,
                ]}
              >
                {([t, d, m]) => {
                  const canNext =
                    t.trim().length >= 2 &&
                    d.trim().length >= 2 &&
                    m.trim().length > 0;
                  return (
                    <Button
                      type="button"
                      className="rounded-xl gap-2"
                      onClick={submitStep1}
                      disabled={!canNext || busy}
                    >
                      {busy
                        ? "保存中…"
                        : createdCourseId
                          ? "下一步"
                          : "保存并下一步"}
                      <ArrowRight size={16} />
                    </Button>
                  );
                }}
              </form.Subscribe>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="mt-6 grid grid-cols-12 gap-6 items-start">
          {/* Left: Outline */}
          <Card className="col-span-12 lg:col-span-4 rounded-2xl border-gray-100 shadow-xs overflow-hidden">
            <CardHeader className="border-b border-gray-100">
              <CardTitle>课程结构</CardTitle>
              <CardDescription>
                点击左侧条目，在右侧编辑章节/小节
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                    {form.state.values.course.title || "未命名课程"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {chapters.length} 章 ·{" "}
                    {chapters.reduce((s, c) => s + c.lessons.length, 0)} 节
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-gray-200 gap-2"
                  onClick={addChapter}
                  disabled={busy}
                >
                  <Plus size={16} />
                  添加章
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                {chapters.map((ch, cIdx) => (
                  <div
                    key={cIdx}
                    className={cn(
                      "rounded-xl border border-gray-100 overflow-hidden",
                      cIdx === activeChapterIdx && "border-blue-200 bg-blue-50/20"
                    )}
                  >
                    <button
                      type="button"
                      className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-blue-50/40 transition-colors"
                      onClick={() => {
                        setActiveChapterIdx(cIdx);
                        setActiveLessonIdx(0);
                      }}
                    >
                      <Badge
                        variant="secondary"
                        className="border-0 bg-blue-50 text-blue-700"
                      >
                        第 {cIdx + 1} 章
                      </Badge>
                      <span className="text-sm font-semibold text-gray-800 truncate flex-1">
                        {ch.title?.trim() || "未命名章节"}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {ch.lessons.length} 节
                      </span>
                    </button>

                    <div className="px-3 pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-400">小节</p>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            className="rounded-lg border-gray-200"
                            onClick={() => addLesson(cIdx)}
                            disabled={busy}
                          >
                            <Plus size={14} />
                            添加
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeChapter(cIdx)}
                            disabled={busy || chapters.length === 1}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1">
                        {ch.lessons.map((l, lIdx) => {
                          const active =
                            cIdx === activeChapterIdx && lIdx === activeLessonIdx;
                          return (
                            <button
                              key={lIdx}
                              type="button"
                              onClick={() => {
                                setActiveChapterIdx(cIdx);
                                setActiveLessonIdx(lIdx);
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left border border-transparent hover:bg-blue-50/50 transition-colors",
                                active && "bg-blue-50 border-blue-200"
                              )}
                            >
                              <VideoIcon size={14} className="text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-700 truncate flex-1">
                                {l.title?.trim() || `第 ${lIdx + 1} 节`}
                              </span>
                              {l.file ? (
                                <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                  已选择文件
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  未上传
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-gray-200 gap-2"
                onClick={() => setStep(1)}
                disabled={busy}
              >
                <ArrowLeft size={16} />
                上一步
              </Button>
              <Button
                type="button"
                className="rounded-xl gap-2"
                onClick={submitAll}
                disabled={busy}
              >
                {busy ? "创建中…" : "完成创建"}
                <ArrowRight size={16} />
              </Button>
            </CardFooter>
          </Card>

          {/* Right: Editor */}
          <Card className="col-span-12 lg:col-span-8 rounded-2xl border-gray-100 shadow-xs overflow-hidden">
            <CardHeader className="border-b border-gray-100">
              <CardTitle>编辑面板</CardTitle>
              <CardDescription>
                编辑当前选中的章节与小节信息，并选择要上传的视频文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Chapter editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="border-0 bg-blue-50 text-blue-700">
                      第 {activeChapterIdx + 1} 章
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {activeChapter?.lessons.length ?? 0} 节
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>章节标题</Label>
                    <Input
                      value={activeChapter?.title ?? ""}
                      onChange={(e) =>
                        updateChapter(activeChapterIdx, { title: e.target.value })
                      }
                      placeholder="例如：第一章：环境搭建"
                      className="rounded-xl"
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>章节描述</Label>
                    <Input
                      value={activeChapter?.description ?? ""}
                      onChange={(e) =>
                        updateChapter(activeChapterIdx, { description: e.target.value })
                      }
                      placeholder="可选"
                      className="rounded-xl"
                      disabled={busy}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Lesson editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="border-0 bg-gray-100 text-gray-700">
                      第 {activeLessonIdx + 1} 节
                    </Badge>
                    <span className="text-xs text-gray-400">
                      小节视频：选择文件后会在“完成创建”时上传
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
                    onClick={() => removeLesson(activeChapterIdx, activeLessonIdx)}
                    disabled={busy || (activeChapter?.lessons.length ?? 0) <= 1}
                  >
                    <Trash2 size={16} />
                    删除小节
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>小节标题</Label>
                    <Input
                      value={activeLesson?.title ?? ""}
                      onChange={(e) =>
                        updateLesson(activeChapterIdx, activeLessonIdx, {
                          title: e.target.value,
                        })
                      }
                      placeholder="例如：第 1 节：Rust 所有权介绍"
                      className="rounded-xl"
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>小节描述</Label>
                    <Input
                      value={activeLesson?.description ?? ""}
                      onChange={(e) =>
                        updateLesson(activeChapterIdx, activeLessonIdx, {
                          description: e.target.value,
                        })
                      }
                      placeholder="可选"
                      className="rounded-xl"
                      disabled={busy}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>上传视频文件</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="video/*"
                      className="rounded-xl"
                      disabled={busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        updateLesson(activeChapterIdx, activeLessonIdx, { file: f });
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-gray-200 gap-2"
                      disabled={busy}
                      onClick={() =>
                        updateLesson(activeChapterIdx, activeLessonIdx, { file: null })
                      }
                    >
                      <Trash2 size={16} />
                      清除
                    </Button>
                  </div>
                  {activeLesson?.file && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                      <Upload size={14} />
                      <span className="truncate">{activeLesson.file.name}</span>
                      <span className="text-gray-300">·</span>
                      <span>
                        {Math.max(1, Math.ceil(activeLesson.file.size / 1024 / 1024))} MB
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

