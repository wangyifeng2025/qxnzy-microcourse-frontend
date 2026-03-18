import { notFound } from "next/navigation";
import TopNav from "@/components/top-nav";
import CourseLearning from "@/components/course-learning";
import {
  fetchCourse,
  fetchChapters,
  fetchVideos,
  type Chapter,
  type Video,
} from "@/lib/courses";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseLearnPage({ params }: PageProps) {
  const { id } = await params;

  let course;
  try {
    course = await fetchCourse(id);
  } catch (err) {
    if (err instanceof Error && err.message === "COURSE_NOT_FOUND") notFound();
    notFound();
  }

  let chapters: Chapter[] = [];
  try {
    chapters = await fetchChapters(id);
  } catch {
    /* non-critical */
  }

  const videosPerChapter = await Promise.all(
    chapters.map((ch) => fetchVideos(ch.id).catch((): Video[] => []))
  );
  const chaptersWithVideos = chapters.map((ch, i) => ({
    ...ch,
    videos: videosPerChapter[i],
  }));

  return (
    <div className="h-dvh bg-white overflow-hidden">
      <TopNav />

      {/* 固定一屏：不允许页面滚动（左侧列表内部可滚动） */}
      <div className="h-[calc(100dvh-57px)] overflow-hidden">
        <CourseLearning courseTitle={course.title} chapters={chaptersWithVideos} />
      </div>
    </div>
  );
}

