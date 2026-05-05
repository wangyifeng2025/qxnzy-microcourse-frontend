import HomeContent from "@/components/home-content";
import { fetchCourses, type Course } from "@/lib/courses";
import {
  fetchDiscoverPopularCourses,
  fetchDiscoverActiveTeachers,
  fetchDiscoverLatestTopics,
  type DiscoverPopularCourse,
  type DiscoverActiveTeacher,
  type DiscoverLatestTopic,
} from "@/lib/discover";

/** 与 fetchCourses no-store 一致，避免整页静态化后仍命中旧 RSC 负载 */
export const dynamic = "force-dynamic";

async function getCourses(): Promise<{
  courses: Course[];
  error: string | null;
}> {
  try {
    const data = await fetchCourses(50);
    return { courses: data.items, error: null };
  } catch (err) {
    console.error("[courses]", err);
    return { courses: [], error: "暂时无法加载课程，请稍后刷新重试" };
  }
}

async function getDiscoverHomeData(): Promise<{
  popularCourses: DiscoverPopularCourse[];
  activeTeachers: DiscoverActiveTeacher[];
  latestTopics: DiscoverLatestTopic[];
  enrollmentByCourseId: Record<string, number>;
}> {
  const empty = {
    popularCourses: [] as DiscoverPopularCourse[],
    activeTeachers: [] as DiscoverActiveTeacher[],
    latestTopics: [] as DiscoverLatestTopic[],
    enrollmentByCourseId: {} as Record<string, number>,
  };
  try {
    const [popularUpTo50, teachers, topics] = await Promise.all([
      fetchDiscoverPopularCourses(50),
      fetchDiscoverActiveTeachers(8),
      fetchDiscoverLatestTopics(8),
    ]);
    const enrollmentByCourseId: Record<string, number> = {};
    for (const c of popularUpTo50) {
      enrollmentByCourseId[c.id] = c.enrollment_count;
    }
    return {
      popularCourses: popularUpTo50.slice(0, 8),
      activeTeachers: teachers,
      latestTopics: topics,
      enrollmentByCourseId,
    };
  } catch (err) {
    console.error("[discover]", err);
    return empty;
  }
}

function pickSearchQuery(
  q: string | string[] | undefined,
): string {
  if (q == null) return "";
  return typeof q === "string" ? q : q[0] ?? "";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const q = pickSearchQuery((await searchParams).q);
  const [{ courses, error }, discover] = await Promise.all([
    getCourses(),
    getDiscoverHomeData(),
  ]);
  return (
    <HomeContent
      key={q}
      courses={courses}
      error={error}
      initialSearchQuery={q}
      popularCourses={discover.popularCourses}
      activeTeachers={discover.activeTeachers}
      latestTopics={discover.latestTopics}
      enrollmentByCourseId={discover.enrollmentByCourseId}
    />
  );
}
