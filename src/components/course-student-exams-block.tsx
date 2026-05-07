"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ScrollText } from "lucide-react";
import { getToken } from "@/lib/auth";
import { fetchEnrollmentStatus } from "@/lib/course-enrollment";
import { listCourseExams, type CourseExam } from "@/lib/exams";
import { cn } from "@/lib/utils";

/**
 * 已登录且已选课学员：展示当前课程已发布试卷入口。
 * - variant="dark"：学习页侧栏
 * - variant="light"：课程详情页侧栏 / 主栏
 */
export default function CourseStudentExamsBlock({
  courseId,
  variant = "light",
}: {
  courseId: string;
  variant?: "light" | "dark";
}) {
  const [mounted, setMounted] = useState(false);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [exams, setExams] = useState<CourseExam[] | null>(null);
  const [loadingExams, setLoadingExams] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    const token = getToken();
    if (!token || enrolled !== true) {
      if (enrolled === false) setExams(null);
      return;
    }
    setLoadingExams(true);
    listCourseExams(courseId, token)
      .then(setExams)
      .catch(() => setExams([]))
      .finally(() => setLoadingExams(false));
  }, [courseId, enrolled]);

  if (!mounted) return null;
  const token = getToken();
  if (!token) return null;
  if (enrolled === false) return null;

  const isDark = variant === "dark";

  if (enrolled === null) {
    return (
      <div
        className={cn(
          isDark
            ? "border-b border-white/8 p-2"
            : "rounded-2xl border border-[#c3c6d6]/15 bg-white p-6 shadow-sm",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
            isDark ? "text-slate-500" : "text-[#424654]",
          )}
        >
          <ScrollText size={13} />
          课程测试
        </div>
        <p
          className={cn(
            "mt-2 flex items-center gap-2 text-xs",
            isDark ? "text-slate-600" : "text-[#424654]",
          )}
        >
          <Loader2 className="size-3.5 animate-spin" />
          确认选课状态中…
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        isDark
          ? "border-b border-white/8 p-2"
          : "rounded-2xl border border-[#c3c6d6]/15 bg-white p-6 shadow-sm",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-xs font-bold uppercase tracking-widest",
          isDark ? "text-slate-500" : "text-[#424654]",
        )}
      >
        <ScrollText size={13} className={cn(!isDark && "text-[#0040a1]")} />
        课程测试
      </div>
      <p
        className={cn(
          "mt-1 text-xs",
          isDark ? "text-slate-600" : "text-[#424654]",
        )}
      >
        已发布试卷可在此进入作答（需已选课）
      </p>

      {loadingExams && (
        <p
          className={cn(
            "mt-3 flex items-center gap-2 text-xs",
            isDark ? "text-slate-600" : "text-[#424654]",
          )}
        >
          <Loader2 className="size-3.5 animate-spin" />
          加载试卷…
        </p>
      )}

      {!loadingExams && exams && exams.length === 0 && (
        <p
          className={cn(
            "mt-3 text-xs",
            isDark ? "text-slate-600" : "text-[#424654]",
          )}
        >
          暂无已发布试卷
        </p>
      )}

      {!loadingExams && exams && exams.length > 0 && (
        <ul className={cn("mt-3 space-y-1", isDark && "space-y-px")}>
          {exams.map((exam) => (
            <li key={exam.id}>
              <Link
                href={`/courses/${courseId}/learn/exams/${exam.id}`}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors",
                  isDark
                    ? "text-slate-300 hover:bg-white/6 hover:text-white"
                    : "text-[#1a1c1e] hover:bg-[#f3f5fb] hover:text-[#0040a1]",
                )}
              >
                <span className="line-clamp-2">{exam.title}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-[11px] font-normal",
                    isDark ? "text-slate-600" : "text-[#424654]",
                  )}
                >
                  满分 {exam.total_score} · 及格 {exam.pass_score}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
