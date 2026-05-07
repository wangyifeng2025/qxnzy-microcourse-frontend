"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  ClipboardPen,
  Pencil,
  Download,
  Upload,
} from "lucide-react";
import { getToken } from "@/lib/auth";
import {
  fetchChapters,
  fetchCourse,
  fetchVideos,
  type Chapter,
  type Course,
  type Video,
} from "@/lib/courses";
import {
  createCourseQuestion,
  deleteCourseQuestion,
  exportCourseQuestionsXlsx,
  fetchCourseQuestions,
  importCourseQuestionsXlsx,
  questionTypeLabel,
  QUESTION_TYPE_ORDER,
  updateCourseQuestion,
  type CreateQuestionBody,
  type Question,
  type QuestionOption,
  type QuestionType,
  type QuestionImportResult,
} from "@/lib/questions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const primary = "#0040a1";

type ChapterWithVideos = Chapter & { videos: Video[] };

type FilterTab = "all" | QuestionType;

function summarizeAnswer(q: Question): string {
  const c = q.correct_answer;
  if (c === null || c === undefined) return "无标准答案（人工评分）";
  if (typeof c === "boolean") return c ? "正确" : "错误";
  if (Array.isArray(c)) return c.join("、");
  return String(c);
}

const DEFAULT_OPTIONS: QuestionOption[] = [
  { key: "A", text: "" },
  { key: "B", text: "" },
  { key: "C", text: "" },
  { key: "D", text: "" },
];

function optionsFromQuestion(q: Question): QuestionOption[] {
  const map = new Map((q.options ?? []).map((o) => [o.key, o.text]));
  return ["A", "B", "C", "D"].map((k) => ({
    key: k,
    text: map.get(k) ?? "",
  }));
}

function formatQuestionPlacement(
  q: Question,
  structure: ChapterWithVideos[],
): string {
  if (!q.chapter_id && !q.video_id) {
    return "未绑定章节与小节";
  }
  let chapterTitle: string | null = null;
  let videoTitle: string | null = null;
  if (q.video_id) {
    for (const c of structure) {
      const v = c.videos.find((x) => x.id === q.video_id);
      if (v) {
        chapterTitle = c.title;
        videoTitle = v.title;
        break;
      }
    }
    if (!videoTitle) {
      videoTitle = "（小节不存在或已删除）";
    }
    if (!chapterTitle && q.chapter_id) {
      chapterTitle =
        structure.find((c) => c.id === q.chapter_id)?.title ?? null;
    }
  } else if (q.chapter_id) {
    chapterTitle =
      structure.find((c) => c.id === q.chapter_id)?.title ??
      "（章节不存在或已删除）";
  }
  const parts: string[] = [];
  if (chapterTitle) parts.push(`章节：${chapterTitle}`);
  if (q.video_id) parts.push(`小节：${videoTitle ?? "—"}`);
  return parts.length > 0 ? parts.join(" · ") : "未绑定章节与小节";
}

type BuildBodyResult =
  | { ok: true; body: CreateQuestionBody }
  | { ok: false; message: string };

function buildQuestionBody(
  draftType: QuestionType,
  draftChapterId: string,
  draftVideoId: string,
  contentRaw: string,
  draftExplanation: string,
  draftScore: string,
  options: QuestionOption[],
  singleCorrect: string,
  multiCorrect: string[],
  tfCorrect: "true" | "false",
): BuildBodyResult {
  const content = contentRaw.trim();
  if (!content) {
    return { ok: false, message: "请填写题目内容" };
  }
  const scoreNum = Number(draftScore);
  if (Number.isNaN(scoreNum) || scoreNum < 0) {
    return { ok: false, message: "请输入有效的默认分值" };
  }
  if (draftType === "single_choice") {
    const filled = options.filter((o) => o.text.trim());
    if (filled.length < 2) {
      return { ok: false, message: "单选题至少需要 2 个有效选项" };
    }
    const keys = new Set(filled.map((o) => o.key));
    if (!keys.has(singleCorrect)) {
      return { ok: false, message: "正确答案必须是其中一个选项键" };
    }
    return {
      ok: true,
      body: {
        chapter_id: draftChapterId || null,
        video_id: draftVideoId || null,
        question_type: "single_choice",
        content,
        options: filled,
        correct_answer: singleCorrect,
        explanation: draftExplanation.trim() || null,
        default_score: scoreNum,
      },
    };
  }
  if (draftType === "multiple_choice") {
    const filled = options.filter((o) => o.text.trim());
    if (filled.length < 2) {
      return { ok: false, message: "多选题至少需要 2 个有效选项" };
    }
    const keys = new Set(filled.map((o) => o.key));
    const ans = multiCorrect.filter((k) => keys.has(k));
    if (ans.length < 2) {
      return { ok: false, message: "多选题请至少选择 2 个正确选项" };
    }
    return {
      ok: true,
      body: {
        chapter_id: draftChapterId || null,
        video_id: draftVideoId || null,
        question_type: "multiple_choice",
        content,
        options: filled,
        correct_answer: ans.sort(),
        explanation: draftExplanation.trim() || null,
        default_score: scoreNum,
      },
    };
  }
  if (draftType === "true_false") {
    return {
      ok: true,
      body: {
        chapter_id: draftChapterId || null,
        video_id: draftVideoId || null,
        question_type: "true_false",
        content,
        options: null,
        correct_answer: tfCorrect === "true",
        explanation: draftExplanation.trim() || null,
        default_score: scoreNum,
      },
    };
  }
  return {
    ok: true,
    body: {
      chapter_id: draftChapterId || null,
      video_id: draftVideoId || null,
      question_type: "essay",
      content,
      options: null,
      correct_answer: null,
      explanation: draftExplanation.trim() || null,
      default_score: scoreNum,
    },
  };
}

type MutateQuestionFieldsProps = {
  structure: ChapterWithVideos[];
  videoOptions: { id: string; label: string; chapterId: string }[];
  onPickVideo: (videoId: string) => void;
  qType: QuestionType;
  onQTypeUserChange: (t: QuestionType) => void;
  chapterId: string;
  onChapterIdChange: (id: string) => void;
  videoId: string;
  content: string;
  onContentChange: (v: string) => void;
  explanation: string;
  onExplanationChange: (v: string) => void;
  score: string;
  onScoreChange: (v: string) => void;
  options: QuestionOption[];
  onOptionTextChange: (idx: number, text: string) => void;
  singleCorrect: string;
  onSingleCorrectChange: (v: string) => void;
  multiCorrect: string[];
  onToggleMulti: (key: string) => void;
  tfCorrect: "true" | "false";
  onTfCorrectChange: (v: "true" | "false") => void;
};

function MutateQuestionFields({
  structure,
  videoOptions,
  onPickVideo,
  qType,
  onQTypeUserChange,
  chapterId,
  onChapterIdChange,
  videoId,
  content,
  onContentChange,
  explanation,
  onExplanationChange,
  score,
  onScoreChange,
  options,
  onOptionTextChange,
  singleCorrect,
  onSingleCorrectChange,
  multiCorrect,
  onToggleMulti,
  tfCorrect,
  onTfCorrectChange,
}: MutateQuestionFieldsProps) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>题型</Label>
          <Select
            value={qType}
            onValueChange={(v) => onQTypeUserChange(v as QuestionType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single_choice">单选题</SelectItem>
              <SelectItem value="multiple_choice">多选题</SelectItem>
              <SelectItem value="true_false">判断题</SelectItem>
              <SelectItem value="essay">问答题</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>默认分值</Label>
          <Input
            type="number"
            min={0}
            value={score}
            onChange={(e) => onScoreChange(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>绑定章节（可选）</Label>
          <Select
            value={chapterId || "__none__"}
            onValueChange={(v) =>
              onChapterIdChange(v === "__none__" ? "" : v)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="不绑定" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">不绑定章节</SelectItem>
              {structure.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>
                  {ch.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>绑定小节 / 视频（可选）</Label>
          <Select
            value={videoId || "__none__"}
            onValueChange={(v) =>
              onPickVideo(v === "__none__" ? "" : v)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="不绑定" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">不绑定小节</SelectItem>
              {videoOptions
                .filter(
                  (o) => !chapterId || o.chapterId === chapterId,
                )
                .map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>题干</Label>
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          rows={3}
          className={cn(
            "min-h-[80px] w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          )}
          placeholder="请输入题目内容"
        />
      </div>

      {(qType === "single_choice" || qType === "multiple_choice") && (
        <div className="space-y-3">
          <Label>选项（填写文本；键为 A–D）</Label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={opt.key} className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-sm font-semibold text-[#424654]">
                  {opt.key}.
                </span>
                <Input
                  value={opt.text}
                  onChange={(e) => onOptionTextChange(idx, e.target.value)}
                  placeholder={`选项 ${opt.key}`}
                />
              </div>
            ))}
          </div>
          {qType === "single_choice" ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-[#424654]">正确答案</span>
              <Select
                value={singleCorrect}
                onValueChange={onSingleCorrectChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.key} value={o.key}>
                      {o.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-sm text-[#424654]">正确答案（多选）</span>
              <div className="flex flex-wrap gap-3">
                {options.map((o) => (
                  <label
                    key={o.key}
                    className="inline-flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 rounded border-[#c3c6d6]"
                      checked={multiCorrect.includes(o.key)}
                      onChange={() => onToggleMulti(o.key)}
                    />
                    {o.key}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {qType === "true_false" && (
        <div className="space-y-2">
          <Label>正确答案</Label>
          <Select
            value={tfCorrect}
            onValueChange={(v) => onTfCorrectChange(v as "true" | "false")}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">正确</SelectItem>
              <SelectItem value="false">错误</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>解析 / 参考说明（可选）</Label>
        <textarea
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          rows={2}
          className={cn(
            "min-h-[64px] w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          )}
          placeholder="学生交卷后可展示，或作为问答题评分参考"
        />
      </div>
    </div>
  );
}

export default function TeacherCourseQuestions({
  courseId,
}: {
  courseId: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [structure, setStructure] = useState<ChapterWithVideos[]>([]);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterTab>("all");
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  const [draftType, setDraftType] = useState<QuestionType>("single_choice");
  const [draftChapterId, setDraftChapterId] = useState<string>("");
  const [draftVideoId, setDraftVideoId] = useState<string>("");
  const [draftContent, setDraftContent] = useState("");
  const [draftExplanation, setDraftExplanation] = useState("");
  const [draftScore, setDraftScore] = useState("5");
  const [options, setOptions] = useState<QuestionOption[]>(() => [
    ...DEFAULT_OPTIONS,
  ]);
  const [singleCorrect, setSingleCorrect] = useState("A");
  const [multiCorrect, setMultiCorrect] = useState<string[]>(["A"]);
  const [tfCorrect, setTfCorrect] = useState<"true" | "false">("true");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraftType, setEditDraftType] = useState<QuestionType>(
    "single_choice",
  );
  const [editChapterId, setEditChapterId] = useState("");
  const [editVideoId, setEditVideoId] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editExplanation, setEditExplanation] = useState("");
  const [editScore, setEditScore] = useState("5");
  const [editOptions, setEditOptions] = useState<QuestionOption[]>(() => [
    ...DEFAULT_OPTIONS,
  ]);
  const [editSingleCorrect, setEditSingleCorrect] = useState("A");
  const [editMultiCorrect, setEditMultiCorrect] = useState<string[]>(["A"]);
  const [editTfCorrect, setEditTfCorrect] = useState<"true" | "false">(
    "true",
  );
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);
  const [exportChapterId, setExportChapterId] = useState("");
  const [exportVideoId, setExportVideoId] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<QuestionImportResult | null>(
    null,
  );

  useEffect(() => {
    setToken(getToken());
  }, []);

  const reloadQuestions = useCallback(async (t: string) => {
    const list = await fetchCourseQuestions(courseId, t);
    setQuestions(list);
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = getToken();
      if (!t) {
        setError("请先登录后再管理题库");
        setLoading(false);
        setQuestions([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const c = await fetchCourse(courseId, { token: t });
        if (cancelled) return;
        setCourse(c);
        const chs = await fetchChapters(courseId, { token: t });
        const withVideos = await Promise.all(
          chs.map(async (ch) => ({
            ...ch,
            videos: await fetchVideos(ch.id, { token: t }),
          })),
        );
        if (cancelled) return;
        setStructure(withVideos);
        await reloadQuestions(t);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "加载失败");
        setQuestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, reloadQuestions]);

  const videoOptions = useMemo(() => {
    const out: { id: string; label: string; chapterId: string }[] = [];
    for (const ch of structure) {
      for (const v of ch.videos) {
        out.push({
          id: v.id,
          chapterId: ch.id,
          label: `${ch.title} — ${v.title}`,
        });
      }
    }
    return out;
  }, [structure]);

  const onPickVideoDraft = (videoId: string) => {
    setDraftVideoId(videoId);
    if (!videoId) return;
    const hit = videoOptions.find((o) => o.id === videoId);
    if (hit) setDraftChapterId(hit.chapterId);
  };

  const onPickVideoEdit = (videoId: string) => {
    setEditVideoId(videoId);
    if (!videoId) return;
    const hit = videoOptions.find((o) => o.id === videoId);
    if (hit) setEditChapterId(hit.chapterId);
  };

  const onPickExportVideo = (videoId: string) => {
    setExportVideoId(videoId);
    if (!videoId) return;
    const hit = videoOptions.find((o) => o.id === videoId);
    if (hit) setExportChapterId(hit.chapterId);
  };

  const grouped = useMemo(() => {
    const map: Record<QuestionType, Question[]> = {
      single_choice: [],
      multiple_choice: [],
      true_false: [],
      essay: [],
    };
    for (const q of questions ?? []) {
      if (map[q.question_type]) map[q.question_type].push(q);
    }
    return map;
  }, [questions]);

  const visibleSections = useMemo(() => {
    if (filter === "all") return QUESTION_TYPE_ORDER;
    return [filter];
  }, [filter]);

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setEditFormError(null);
    setEditDraftType(q.question_type);
    setEditChapterId(q.chapter_id ?? "");
    setEditVideoId(q.video_id ?? "");
    setEditContent(q.content);
    setEditExplanation(q.explanation ?? "");
    setEditScore(String(q.default_score));
    setEditOptions(optionsFromQuestion(q));
    if (q.question_type === "single_choice") {
      setEditSingleCorrect(
        typeof q.correct_answer === "string" ? q.correct_answer : "A",
      );
    } else {
      setEditSingleCorrect("A");
    }
    if (q.question_type === "multiple_choice") {
      setEditMultiCorrect(
        Array.isArray(q.correct_answer) ? [...q.correct_answer] : ["A"],
      );
    } else {
      setEditMultiCorrect(["A"]);
    }
    if (q.question_type === "true_false") {
      setEditTfCorrect(q.correct_answer === true ? "true" : "false");
    } else {
      setEditTfCorrect("true");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormError(null);
  };

  const handleCreate = async () => {
    const t = token ?? getToken();
    if (!t) {
      setFormError("请先登录");
      return;
    }
    const built = buildQuestionBody(
      draftType,
      draftChapterId,
      draftVideoId,
      draftContent,
      draftExplanation,
      draftScore,
      options,
      singleCorrect,
      multiCorrect,
      tfCorrect,
    );
    if (!built.ok) {
      setFormError(built.message);
      return;
    }
    setFormError(null);
    setCreating(true);
    try {
      await createCourseQuestion(courseId, t, built.body);
      setDraftContent("");
      setDraftExplanation("");
      setDraftScore("5");
      setDraftChapterId("");
      setDraftVideoId("");
      setDraftType("single_choice");
      setOptions([...DEFAULT_OPTIONS]);
      setSingleCorrect("A");
      setMultiCorrect(["A"]);
      setTfCorrect("true");
      await reloadQuestions(t);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async () => {
    const t = token ?? getToken();
    if (!t || !editingId) {
      setEditFormError("请先登录");
      return;
    }
    const built = buildQuestionBody(
      editDraftType,
      editChapterId,
      editVideoId,
      editContent,
      editExplanation,
      editScore,
      editOptions,
      editSingleCorrect,
      editMultiCorrect,
      editTfCorrect,
    );
    if (!built.ok) {
      setEditFormError(built.message);
      return;
    }
    setEditFormError(null);
    setSavingEditId(editingId);
    try {
      await updateCourseQuestion(courseId, editingId, t, built.body);
      setEditingId(null);
      await reloadQuestions(t);
    } catch (e) {
      setEditFormError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingEditId(null);
    }
  };

  const handleDelete = async (q: Question) => {
    if (!confirm("确定从题库删除该题？若已加入试卷，组卷关联也会被移除。")) {
      return;
    }
    const t = token ?? getToken();
    if (!t) return;
    setDeleteBusyId(q.id);
    setError(null);
    try {
      await deleteCourseQuestion(courseId, q.id, t);
      await reloadQuestions(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeleteBusyId(null);
    }
  };

  const toggleEditMulti = (key: string) => {
    setEditMultiCorrect((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleExportXlsx = async () => {
    const t = token ?? getToken();
    if (!t) {
      setError("请先登录后再导出");
      return;
    }
    setError(null);
    setExportBusy(true);
    try {
      const query: { chapter_id?: string; video_id?: string } = {};
      if (exportChapterId) query.chapter_id = exportChapterId;
      if (exportVideoId) query.video_id = exportVideoId;
      const { blob, filename } = await exportCourseQuestionsXlsx(
        courseId,
        t,
        Object.keys(query).length ? query : undefined,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        filename ??
        `questions_${courseId.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExportBusy(false);
    }
  };

  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const t = token ?? getToken();
    if (!t) {
      setError("请先登录后再导入");
      return;
    }
    setError(null);
    setImportResult(null);
    setImportBusy(true);
    try {
      const result = await importCourseQuestionsXlsx(courseId, t, file);
      setImportResult(result);
      if (result.imported > 0) {
        await reloadQuestions(t);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImportBusy(false);
    }
  };

  const toggleMultiKey = (key: string) => {
    setMultiCorrect((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-screen-2xl px-4 pb-16 pt-6 md:px-8 md:pt-8 lg:px-16">
        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/teacher"
            className="inline-flex items-center gap-1.5 font-medium text-[#424654] transition-colors hover:text-[#0040a1]"
          >
            <ArrowLeft size={16} aria-hidden />
            返回课程管理
          </Link>
          <span className="text-[#c3c6d6]">|</span>
          <Link
            href={`/teacher/courses/${courseId}`}
            className="font-medium text-[#0040a1] hover:underline"
          >
            编辑大纲
          </Link>
        </div>

        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-2 text-[#0040a1]">
              <ClipboardPen className="size-5" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-wider">
                题库
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1a1c1e] md:text-4xl">
              {course?.title ?? "加载中…"}
            </h1>
            <p className="mt-2 max-w-2xl text-base text-[#424654]">
              按题型维护课程题库，题目可绑定章节或小节，供后续组卷使用。
            </p>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card className="mb-10 border-[#c3c6d6]/20 bg-white shadow-sm">
          <CardHeader className="border-b border-[#eeeef0]">
            <CardTitle>题库导入 / 导出（Excel）</CardTitle>
            <CardDescription>
              与后端{" "}
              <code className="rounded bg-[#f3f3f6] px-1 text-xs">
                GET …/questions/export
              </code>{" "}
              及{" "}
              <code className="rounded bg-[#f3f3f6] px-1 text-xs">
                POST …/questions/import
              </code>{" "}
              一致：导出为 .xlsx（含「题目列表」「填写说明」）；导入使用
              multipart 字段名 <code className="text-xs">file</code>。
              导入时 <strong>chapter_id / video_id 列会被忽略</strong>
              ，题目将不绑定章节；可直接上传导出文件再编辑绑定。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 pt-6">
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => void handleImportFileChange(e)}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#eeeef0] bg-[#fafbfc] p-4">
                <p className="mb-3 text-sm font-semibold text-[#1a1c1e]">
                  导出
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-[#424654]">
                      筛选（可选，与接口查询参数相同）
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Select
                        value={exportChapterId || "__none__"}
                        onValueChange={(v) => {
                          setExportChapterId(v === "__none__" ? "" : v);
                          setExportVideoId("");
                        }}
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="全部章节" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">全部章节</SelectItem>
                          {structure.map((ch) => (
                            <SelectItem key={ch.id} value={ch.id}>
                              {ch.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={exportVideoId || "__none__"}
                        onValueChange={(v) =>
                          onPickExportVideo(v === "__none__" ? "" : v)
                        }
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="全部小节" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">全部小节</SelectItem>
                          {videoOptions
                            .filter(
                              (o) =>
                                !exportChapterId ||
                                o.chapterId === exportChapterId,
                            )
                            .map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 gap-2 border-[#0040a1]/30 text-[#0040a1] hover:bg-[#0040a1]/5"
                  disabled={exportBusy || !token || loading}
                  title="下载当前筛选下的题库 Excel"
                  onClick={() => void handleExportXlsx()}
                >
                  {exportBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  下载 .xlsx
                </Button>
              </div>
              <div className="rounded-xl border border-[#eeeef0] bg-[#fafbfc] p-4">
                <p className="mb-3 text-sm font-semibold text-[#1a1c1e]">
                  导入
                </p>
                <p className="mb-4 text-xs leading-relaxed text-[#424654]">
                  选择由导出生成或按模板填写的 .xlsx；仅校验失败的行会跳过并返回{" "}
                  <code className="rounded bg-white px-0.5">errors</code>。
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 border-[#0040a1]/30 text-[#0040a1] hover:bg-[#0040a1]/5"
                  disabled={importBusy || !token || loading}
                  title="上传 Excel 批量写入题库"
                  onClick={() => importFileRef.current?.click()}
                >
                  {importBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  选择文件并导入
                </Button>
              </div>
            </div>
            {importResult && (
              <div
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm",
                  importResult.failed > 0
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-emerald-200 bg-emerald-50 text-emerald-950",
                )}
              >
                <p className="font-medium">
                  导入完成：共 {importResult.total} 条解析，成功{" "}
                  {importResult.imported} 条，失败 {importResult.failed} 条。
                </p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-2 max-h-40 list-inside list-disc space-y-1 overflow-y-auto text-xs opacity-90">
                    {importResult.errors.map((row, i) => (
                      <li key={`${row.index}-${i}`}>
                        #{row.index} {row.message}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="mt-3 text-xs font-medium underline opacity-80 hover:opacity-100"
                  onClick={() => setImportResult(null)}
                >
                  关闭摘要
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-10 border-[#c3c6d6]/20 bg-white shadow-sm">
          <CardHeader className="border-b border-[#eeeef0]">
            <CardTitle>新建题目</CardTitle>
            <CardDescription>
              新建与编辑均使用{" "}
              <code className="rounded bg-[#f3f3f6] px-1 text-xs">
                POST / PUT /api/courses/&#123;course_id&#125;/questions
              </code>{" "}
              （PUT 为全量替换）。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 pt-6">
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
            <MutateQuestionFields
              structure={structure}
              videoOptions={videoOptions}
              onPickVideo={onPickVideoDraft}
              qType={draftType}
              onQTypeUserChange={(t) => {
                setDraftType(t);
                setOptions([...DEFAULT_OPTIONS]);
                setSingleCorrect("A");
                setMultiCorrect(["A"]);
                setTfCorrect("true");
              }}
              chapterId={draftChapterId}
              onChapterIdChange={(id) => {
                setDraftChapterId(id);
                setDraftVideoId("");
              }}
              videoId={draftVideoId}
              content={draftContent}
              onContentChange={setDraftContent}
              explanation={draftExplanation}
              onExplanationChange={setDraftExplanation}
              score={draftScore}
              onScoreChange={setDraftScore}
              options={options}
              onOptionTextChange={(idx, text) => {
                setOptions((prev) => {
                  const next = [...prev];
                  const row = next[idx];
                  if (row) next[idx] = { ...row, text };
                  return next;
                });
              }}
              singleCorrect={singleCorrect}
              onSingleCorrectChange={setSingleCorrect}
              multiCorrect={multiCorrect}
              onToggleMulti={toggleMultiKey}
              tfCorrect={tfCorrect}
              onTfCorrectChange={setTfCorrect}
            />
            <div>
              <Button
                type="button"
                disabled={creating || !token}
                className="gap-2 font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${primary} 0%, #0056d2 100%)`,
                }}
                onClick={() => void handleCreate()}
              >
                {creating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                保存到题库
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-sm font-semibold text-[#1a1c1e]">
            按题型查看
          </span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "全部"] as const,
                ...QUESTION_TYPE_ORDER.map(
                  (t) => [t, questionTypeLabel(t)] as const,
                ),
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  filter === key
                    ? "bg-[#0040a1] text-white shadow-sm"
                    : "bg-white text-[#424654] ring-1 ring-[#c3c6d6]/40 hover:bg-[#f3f5fb]",
                )}
              >
                {label}
                {key !== "all" && (
                  <span className="ml-1.5 tabular-nums opacity-80">
                    ({grouped[key as QuestionType].length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <p className="flex items-center gap-2 text-sm text-[#424654]">
            <Loader2 className="size-4 animate-spin" />
            加载题库…
          </p>
        )}

        {!loading && questions && (
          <div className="space-y-10">
            {visibleSections.map((typeKey) => {
              const list = grouped[typeKey];
              if (filter !== "all" && list.length === 0) {
                return (
                  <section key={typeKey}>
                    <h2 className="mb-4 text-lg font-bold text-[#1a1c1e]">
                      {questionTypeLabel(typeKey)}
                    </h2>
                    <p className="rounded-xl border border-dashed border-[#c3c6d6] bg-white/60 px-6 py-10 text-center text-sm text-[#424654]">
                      该题型下暂无题目，可在上方新建。
                    </p>
                  </section>
                );
              }
              if (filter === "all" && list.length === 0) return null;
              return (
                <section key={typeKey}>
                  <div className="mb-4 flex flex-wrap items-baseline gap-3">
                    <h2 className="text-lg font-bold text-[#1a1c1e]">
                      {questionTypeLabel(typeKey)}
                    </h2>
                    <span className="text-sm text-[#424654]">
                      共 {list.length} 道
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {list.map((q) => (
                      <li
                        key={q.id}
                        className="rounded-xl border border-[#c3c6d6]/15 bg-white p-4 shadow-sm md:p-5"
                      >
                        {editingId === q.id ? (
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="text-sm font-semibold text-[#1a1c1e]">
                                编辑题目
                              </h3>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={!!savingEditId}
                                onClick={cancelEdit}
                              >
                                取消
                              </Button>
                            </div>
                            {editFormError && (
                              <p className="text-sm text-red-600">
                                {editFormError}
                              </p>
                            )}
                            <MutateQuestionFields
                              structure={structure}
                              videoOptions={videoOptions}
                              onPickVideo={onPickVideoEdit}
                              qType={editDraftType}
                              onQTypeUserChange={(t) => {
                                setEditDraftType(t);
                                setEditOptions([...DEFAULT_OPTIONS]);
                                setEditSingleCorrect("A");
                                setEditMultiCorrect(["A"]);
                                setEditTfCorrect("true");
                              }}
                              chapterId={editChapterId}
                              onChapterIdChange={(id) => {
                                setEditChapterId(id);
                                setEditVideoId("");
                              }}
                              videoId={editVideoId}
                              content={editContent}
                              onContentChange={setEditContent}
                              explanation={editExplanation}
                              onExplanationChange={setEditExplanation}
                              score={editScore}
                              onScoreChange={setEditScore}
                              options={editOptions}
                              onOptionTextChange={(idx, text) => {
                                setEditOptions((prev) => {
                                  const next = [...prev];
                                  const row = next[idx];
                                  if (row) next[idx] = { ...row, text };
                                  return next;
                                });
                              }}
                              singleCorrect={editSingleCorrect}
                              onSingleCorrectChange={setEditSingleCorrect}
                              multiCorrect={editMultiCorrect}
                              onToggleMulti={toggleEditMulti}
                              tfCorrect={editTfCorrect}
                              onTfCorrectChange={setEditTfCorrect}
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                disabled={!!savingEditId || !token}
                                className="gap-2 font-bold text-white"
                                style={{
                                  background: `linear-gradient(135deg, ${primary} 0%, #0056d2 100%)`,
                                }}
                                onClick={() => void handleSaveEdit()}
                              >
                                {savingEditId === q.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : null}
                                保存修改
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={!!savingEditId}
                                onClick={cancelEdit}
                              >
                                取消
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="font-semibold"
                                >
                                  {questionTypeLabel(q.question_type)}
                                </Badge>
                                <span className="text-xs tabular-nums text-[#424654]">
                                  默认 {String(q.default_score)} 分
                                </span>
                              </div>
                              <p className="text-xs leading-relaxed text-[#424654]">
                                <span className="font-medium text-[#1a1c1e]">
                                  所属：
                                </span>
                                {formatQuestionPlacement(q, structure)}
                              </p>
                              <p className="text-[15px] font-medium leading-snug text-[#1a1c1e]">
                                {q.content}
                              </p>
                              {q.options && q.options.length > 0 && (
                                <ul className="mt-2 space-y-1 text-sm text-[#424654]">
                                  {q.options.map((o) => (
                                    <li key={o.key}>
                                      <span className="font-semibold text-[#1a1c1e]">
                                        {o.key}.
                                      </span>{" "}
                                      {o.text}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <p className="text-xs text-[#424654]">
                                答案：{" "}
                                <span className="font-medium text-[#1a1c1e]">
                                  {summarizeAnswer(q)}
                                </span>
                              </p>
                              {q.explanation && (
                                <p className="text-xs leading-relaxed text-[#424654]">
                                  解析：{q.explanation}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-1 md:flex-col md:items-end lg:flex-row">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 px-2 text-xs font-medium text-[#424654] hover:bg-[#0040a1]/10 hover:text-[#0040a1]"
                                disabled={
                                  (!!editingId && editingId !== q.id) ||
                                  !!savingEditId
                                }
                                title="修改本题内容与绑定章节"
                                onClick={() => startEdit(q)}
                              >
                                <Pencil className="size-3.5 shrink-0" />
                                <span>编辑</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                disabled={
                                  deleteBusyId === q.id ||
                                  editingId === q.id
                                }
                                title="从题库删除本题"
                                onClick={() => void handleDelete(q)}
                              >
                                {deleteBusyId === q.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                                <span className="ml-1">删除</span>
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        {!loading && questions?.length === 0 && (
          <p className="rounded-xl border border-dashed border-[#c3c6d6] bg-white/60 px-6 py-12 text-center text-sm text-[#424654]">
            题库为空，请使用上方表单创建第一道题目。
          </p>
        )}
      </div>
    </main>
  );
}
