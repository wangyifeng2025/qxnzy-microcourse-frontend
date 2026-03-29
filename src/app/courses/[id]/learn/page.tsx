import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
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
    <div className="flex min-h-dvh flex-col bg-[#f9f9fc]">
      <TopNav />

      {/* flex-1 + min-h-0：与顶栏占位 h-20 衔接，把剩余视口高度交给学习区（避免旧版 57px 与播放器 h-full 塌陷） */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CourseLearning
          courseId={id}
          courseTitle={course.title}
          chapters={chaptersWithVideos}
        />
      </div>
    </div>
  );
}

