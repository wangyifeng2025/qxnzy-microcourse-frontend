import HomeContent from "@/components/home-content";
import { fetchCourses, type Course } from "@/lib/courses";

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
  const { courses, error } = await getCourses();
  const q = pickSearchQuery((await searchParams).q);
  return (
    <HomeContent
      key={q}
      courses={courses}
      error={error}
      initialSearchQuery={q}
    />
  );
}
