"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  PlayCircle,
  AlertCircle,
  Loader2,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import TopNav from "@/components/top-nav";
import { getToken, getUser, type UserInfo } from "@/lib/auth";
import { fetchMyEnrollments } from "@/lib/course-enrollment";
import { getCoverGradient, type Course } from "@/lib/courses";
import { cn } from "@/lib/utils";

export default function MyLearning() {
  const router = useRouter();
  const [user] = useState<UserInfo | null>(() =>
    typeof window !== "undefined" ? getUser() : null,
  );
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token || !getUser()) {
      router.push("/login?next=/my-learning");
      return;
    }

    fetchMyEnrollments(token)
      .then((data) => setCourses(data.items ?? []))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "加载失败，请稍后重试"),
      )
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[#f9f9fc]">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 lg:px-16">
          {/* 页头 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100">
                <GraduationCap className="size-5 text-blue-600" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#1a1c1e]">
                我的学习
              </h1>
            </div>
            {user && (
              <p className="text-sm text-[#424654] ml-[52px]">
                {user.real_name || user.username}，继续你的学习之旅
              </p>
            )}
          </div>

          {/* 加载状态 */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-[#424654]">
              <Loader2 className="size-8 animate-spin text-blue-600" />
              <p className="text-sm">加载中…</p>
            </div>
          )}

          {/* 错误状态 */}
          {!loading && error && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
              <AlertCircle className="size-10 text-red-400" />
              <p className="text-sm font-medium text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-full border border-red-200 px-5 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
              >
                重新加载
              </button>
            </div>
          )}

          {/* 空状态 */}
          {!loading && !error && courses.length === 0 && (
            <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-[#c3c6d6] bg-white px-6 py-20 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-blue-50">
                <BookOpen className="size-8 text-blue-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#1a1c1e]">
                  还没有选课记录
                </p>
                <p className="mt-1 text-sm text-[#424654]">
                  去课程广场浏览感兴趣的课程，点击「开始学习」即可加入
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-md"
                style={{
                  background:
                    "linear-gradient(135deg, #0040a1 0%, #0056d2 100%)",
                }}
              >
                浏览课程
                <ArrowRight className="size-4" />
              </Link>
            </div>
          )}

          {/* 课程列表 */}
          {!loading && !error && courses.length > 0 && (
            <>
              <p className="mb-5 text-sm text-[#424654]">
                共{" "}
                <span className="font-semibold text-[#1a1c1e]">
                  {courses.length}
                </span>{" "}
                门课程
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {courses.map((course) => (
                  <EnrolledCourseCard key={course.id} course={course} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function EnrolledCourseCard({ course }: { course: Course }) {
  const gradient = getCoverGradient(course.id);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* 封面 */}
      <Link href={`/courses/${course.id}/learn`} className="block shrink-0">
        {course.cover_image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={course.cover_image_url}
            alt={course.title}
            className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              "flex h-40 w-full items-center justify-center bg-linear-to-br",
              gradient,
            )}
          >
            <BookOpen className="size-10 text-white/80" />
          </div>
        )}
      </Link>

      {/* 内容 */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <Link
            href={`/courses/${course.id}/learn`}
            className="line-clamp-2 text-sm font-semibold leading-snug text-[#1a1c1e] transition-colors hover:text-blue-600"
          >
            {course.title}
          </Link>
          {course.teacher_name && (
            <p className="mt-1 truncate text-xs text-[#424654]">
              {course.teacher_name}
            </p>
          )}
          {course.description && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#424654]/80">
              {course.description}
            </p>
          )}
        </div>

        {/* 操作按钮 */}
        <Link
          href={`/courses/${course.id}/learn`}
          className="flex items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #0040a1 0%, #0056d2 100%)",
          }}
        >
          <PlayCircle className="size-3.5" />
          继续学习
        </Link>
      </div>
    </div>
  );
}
