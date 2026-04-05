"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Loader2, Star } from "lucide-react";
import { getToken, getUser } from "@/lib/auth";
import { fetchCourse, type Course } from "@/lib/courses";
import {
  COURSE_ENROLLMENT_CHANGED_EVENT,
  fetchEnrollmentCount,
  fetchEnrollmentStatus,
  toggleCourseVote,
} from "@/lib/course-enrollment";
import { cn } from "@/lib/utils";

export type CourseEngagementSnapshot = {
  enrollmentCount: number | null;
  voteCount: number;
  hasVoted: boolean;
  canVote: boolean;
  loggedIn: boolean;
};

/** 教师/管理员不可关注课程，其余角色允许（未知角色由后端 403 兜底） */
function isBlockedFromVoting(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r === "teacher" || r === "admin";
}

export default function CourseDetailStats({
  course,
  courseId,
  courseStatus,
  onStatsChange,
}: {
  course: Course;
  courseId: string;
  courseStatus: string;
  onStatsChange?: (s: CourseEngagementSnapshot) => void;
}) {
  const published = String(courseStatus).toLowerCase() === "published";

  const [loading, setLoading] = useState(true);
  const [enrollmentCount, setEnrollmentCount] = useState<number | null>(null);
  const [voteCount, setVoteCount] = useState(course.vote_count ?? 0);
  const [hasVoted, setHasVoted] = useState(!!course.has_voted);
  const [enrolled, setEnrolled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const onStatsChangeRef = useRef(onStatsChange);
  onStatsChangeRef.current = onStatsChange;

  const refresh = useCallback(async () => {
    const token = getToken();
    setVoteError(null);

    if (!token) {
      setLoggedIn(false);
      setEnrollmentCount(null);
      setVoteCount(course.vote_count ?? 0);
      setHasVoted(false);
      setEnrolled(false);
      setLoading(false);
      onStatsChangeRef.current?.({
        enrollmentCount: null,
        voteCount: course.vote_count ?? 0,
        hasVoted: false,
        canVote: false,
        loggedIn: false,
      });
      return;
    }

    setLoggedIn(true);
    setLoading(true);

    try {
      const [countRes, enrollRes, courseRes] = await Promise.all([
        fetchEnrollmentCount(token, courseId).catch(() => null),
        fetchEnrollmentStatus(token, courseId).catch(() => ({
          enrolled: false as const,
          enrollment: null,
        })),
        fetchCourse(courseId, { token }).catch(() => null),
      ]);

      const ec = countRes?.enrollment_count ?? null;
      const en = !!enrollRes.enrolled;
      const vc = courseRes?.vote_count ?? course.vote_count ?? 0;
      const hv = courseRes?.has_voted ?? false;

      setEnrollmentCount(ec);
      setEnrolled(en);
      setVoteCount(vc);
      setHasVoted(hv);

      const user = getUser();
      const canVote = published && en && !isBlockedFromVoting(user?.role);

      onStatsChangeRef.current?.({
        enrollmentCount: ec,
        voteCount: vc,
        hasVoted: hv,
        canVote,
        loggedIn: true,
      });
    } finally {
      setLoading(false);
    }
  }, [course.vote_count, courseId, published]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onStorage = () => void refresh();
    const onEnrollChange = (ev: Event) => {
      const d = (ev as CustomEvent<{ courseId?: string }>).detail;
      if (d?.courseId === courseId) void refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(COURSE_ENROLLMENT_CHANGED_EVENT, onEnrollChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        COURSE_ENROLLMENT_CHANGED_EVENT,
        onEnrollChange,
      );
    };
  }, [courseId, refresh]);

  const user = getUser();
  const canVote =
    loggedIn && published && enrolled && !isBlockedFromVoting(user?.role);

  const handleVote = async () => {
    const token = getToken();
    if (!token || !canVote || voteBusy) return;
    setVoteBusy(true);
    setVoteError(null);
    try {
      const r = await toggleCourseVote(token, courseId);
      let nextVote = voteCount;
      let nextHas = hasVoted;
      if (typeof r.vote_count === "number") nextVote = r.vote_count;
      if (typeof r.has_voted === "boolean") nextHas = r.has_voted;
      else if (typeof r.voted === "boolean") nextHas = r.voted;
      else {
        const c = await fetchCourse(courseId, { token });
        nextVote = c.vote_count ?? nextVote;
        nextHas = !!c.has_voted;
      }
      setVoteCount(nextVote);
      setHasVoted(nextHas);
      onStatsChangeRef.current?.({
        enrollmentCount,
        voteCount: nextVote,
        hasVoted: nextHas,
        canVote,
        loggedIn: true,
      });
    } catch (e) {
      setVoteError(e instanceof Error ? e.message : "操作失败，请稍后重试");
    } finally {
      setVoteBusy(false);
    }
  };

  const enrollmentLabel = loading
    ? "…"
    : enrollmentCount !== null
      ? `${enrollmentCount.toLocaleString("zh-CN")} 人学习`
      : loggedIn
        ? "—"
        : "登录后查看学习人数";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[#424654] font-medium text-sm">
        <Star
          className="text-amber-500 mr-0.5 size-[18px] fill-amber-500 shrink-0"
          aria-hidden
        />
        <span>{voteCount.toLocaleString("zh-CN")} 关注</span>
        <span className="text-[#c3c6d6]" aria-hidden>
          |
        </span>
        <span title={!loggedIn ? "登录后可查看本课选课人数" : undefined}>
          {enrollmentLabel}
        </span>
        <span className="text-[#c3c6d6]" aria-hidden>
          |
        </span>

        {canVote ? (
          <>
            <span className="text-[#c3c6d6] hidden sm:inline" aria-hidden>
              |
            </span>
            <button
              type="button"
              disabled={voteBusy}
              onClick={() => void handleVote()}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors sm:text-sm",
                hasVoted
                  ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  : "border-[#c3c6d6] bg-white text-[#0040a1] hover:border-[#0040a1]/40",
              )}
            >
              {voteBusy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Star
                  className={cn("size-3.5", hasVoted ? "fill-current" : "")}
                  aria-hidden
                />
              )}
              {hasVoted ? "已关注" : "关注"}
            </button>
          </>
        ) : null}
        {loggedIn &&
        published &&
        enrolled &&
        isBlockedFromVoting(user?.role) ? (
          <span className="text-xs text-[#737785]">（学员可关注）</span>
        ) : null}
        {loggedIn &&
        published &&
        !enrolled &&
        !isBlockedFromVoting(user?.role) ? (
          <span className="text-xs text-[#737785]">选课后可关注</span>
        ) : null}
      </div>
      {voteError ? (
        <p className="text-xs text-red-600" role="alert">
          {voteError}
        </p>
      ) : null}
    </div>
  );
}
