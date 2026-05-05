import CourseCatalogContent from "@/components/course-catalog-content";
import {
  fetchAllPublishedCourses,
  type Course,
} from "@/lib/courses";
import { fetchDiscoverPopularCourses } from "@/lib/discover";

export const dynamic = "force-dynamic";

function pickSearchQuery(q: string | string[] | undefined): string {
  if (q == null) return "";
  return typeof q === "string" ? q : q[0] ?? "";
}

async function loadCatalogData(): Promise<{
  courses: Course[];
  enrollmentByCourseId: Record<string, number>;
  error: string | null;
}> {
  try {
    const [courses, popular] = await Promise.all([
      fetchAllPublishedCourses({ maxItems: 500, pageSize: 100 }),
      fetchDiscoverPopularCourses(100).catch(() => []),
    ]);
    const enrollmentByCourseId: Record<string, number> = {};
    for (const c of popular) {
      enrollmentByCourseId[c.id] = c.enrollment_count;
    }
    return { courses, enrollmentByCourseId, error: null };
  } catch (err) {
    console.error("[course-catalog]", err);
    return {
      courses: [],
      enrollmentByCourseId: {},
      error: "暂时无法加载课程列表，请稍后刷新重试",
    };
  }
}

export default async function CoursesCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const q = pickSearchQuery((await searchParams).q);
  const { courses, enrollmentByCourseId, error } = await loadCatalogData();

  return (
    <CourseCatalogContent
      key={q}
      courses={courses}
      enrollmentByCourseId={enrollmentByCourseId}
      error={error}
      initialSearchQuery={q}
    />
  );
}
