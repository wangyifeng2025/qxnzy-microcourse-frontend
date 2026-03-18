import HomeContent from "@/components/home-content";
import { fetchCourses, type Course } from "@/lib/courses";

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

export default async function Home() {
  const { courses, error } = await getCourses();
  return <HomeContent courses={courses} error={error} />;
}
