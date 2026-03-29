"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getToken } from "@/lib/auth";
import {
  enrollCourse,
  fetchEnrollmentStatus,
  unenrollCourse,
} from "@/lib/course-enrollment";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CourseEnrollmentCTA({
  courseId,
  courseStatus,
  variant = "hero",
}: {
  courseId: string;
  courseStatus: string;
  variant?: "hero" | "sidebar";
}) {
  const router = useRouter();
  const canEnroll = String(courseStatus).toLowerCase() === "published";

  const [loggedIn, setLoggedIn] = useState(false);
  const [statusReady, setStatusReady] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(() => {
    const token = getToken();
    setLoggedIn(!!token);
    if (!token) {
      setEnrolled(false);
      setStatusReady(true);
      return;
    }
    setStatusReady(false);
    fetchEnrollmentStatus(token, courseId)
      .then((r) => setEnrolled(!!r.enrolled))
      .catch(() => setEnrolled(false))
      .finally(() => setStatusReady(true));
  }, [courseId]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const onAuthChange = () => refreshStatus();
    window.addEventListener("storage", onAuthChange);
    return () => window.removeEventListener("storage", onAuthChange);
  }, [refreshStatus]);

  const loginHref = `/login?next=${encodeURIComponent(`/courses/${courseId}`)}`;

  const handleEnrollAndLearn = async () => {
    const token = getToken();
    if (!token || !canEnroll) return;
    setBusy(true);
    setError(null);
    try {
      await enrollCourse(token, courseId);
      setEnrolled(true);
      router.push(`/courses/${courseId}/learn`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "选课失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  const handleUnenroll = async () => {
    if (
      !window.confirm(
        "确定取消该课程的学习？取消后需重新选课才能从「开始学习」进入学习页。",
      )
    ) {
      return;
    }
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await unenrollCourse(token, courseId);
      setEnrolled(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取消选课失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  const isHero = variant === "hero";
  const btnPrimary = isHero
    ? "inline-flex items-center justify-center rounded-full px-8 md:px-10 py-3.5 md:py-4 text-base md:text-lg font-bold text-white shadow-xl transition-transform duration-300 hover:scale-105 disabled:opacity-60"
    : "flex w-full items-center justify-center rounded-full py-3.5 text-sm font-bold text-white shadow-md disabled:opacity-60";

  if (!statusReady) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-[#424654]",
          isHero ? "flex-wrap gap-4 pt-2" : "w-full justify-center py-2",
        )}
      >
        <Loader2 className="size-5 animate-spin text-[#0040a1]" aria-hidden />
        <span className="text-sm">加载选课状态…</span>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-4 md:gap-6",
          isHero ? "pt-2" : "w-full flex-col",
        )}
      >
        <Button asChild className={cn(btnPrimary, !isHero && "rounded-full")}>
          <Link
            href={loginHref}
            style={
              isHero
                ? {
                    background:
                      "linear-gradient(135deg, #0040a1 0%, #0056d2 100%)",
                  }
                : {
                    background:
                      "linear-gradient(135deg, #0040a1 0%, #0056d2 100%)",
                  }
            }
          >
            登录后开始学习
          </Link>
        </Button>
        {error ? (
          <p className="w-full text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (enrolled) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 md:gap-4",
          isHero ? "pt-2" : "w-full flex-col",
        )}
      >
        <Link
          href={`/courses/${courseId}/learn`}
          className={btnPrimary}
          style={{
            background: "linear-gradient(135deg, #0040a1 0%, #0056d2 100%)",
          }}
        >
          继续学习
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleUnenroll()}
          className={cn(
            "rounded-full border border-[#c3c6d6] px-5 py-3 text-sm font-bold text-[#424654] transition-colors hover:bg-[#f3f3f6] disabled:opacity-50",
            !isHero && "w-full py-3.5",
          )}
        >
          {busy ? (
            <Loader2 className="inline size-4 animate-spin" aria-hidden />
          ) : (
            "取消学习"
          )}
        </button>
        {error ? (
          <p className="w-full text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        isHero ? "items-start pt-2" : "w-full",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-4 md:gap-6",
          !isHero && "w-full flex-col",
        )}
      >
        <button
          type="button"
          disabled={busy || !canEnroll}
          onClick={() => void handleEnrollAndLearn()}
          className={btnPrimary}
          style={{
            background: "linear-gradient(135deg, #0040a1 0%, #0056d2 100%)",
          }}
          title={
            !canEnroll ? "课程未发布，暂不可选课" : undefined
          }
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            "开始学习"
          )}
        </button>
      </div>
      {!canEnroll ? (
        <p className="text-sm text-amber-800">
          该课程尚未发布，暂不可选课。
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
