import { notFound } from "next/navigation";
import Link from "next/link";
import TopNav from "@/components/top-nav";
import CourseDetailView from "@/components/course-detail-view";
import { Button } from "@/components/ui/button";
import {
  fetchCourse,
  fetchChapters,
  fetchVideos,
  getCoverGradient,
  type Chapter,
  type Video,
} from "@/lib/courses";

/** 课程可见性随发布状态变化，禁用整页静态缓存，与 fetch no-store 一致 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params;

  let course;
  try {
    course = await fetchCourse(id);
  } catch (err) {
    if (err instanceof Error && err.message === "COURSE_NOT_FOUND") {
      notFound();
    }
    return <ErrorPage />;
  }

  const gradient = getCoverGradient(course.id);
  const hasCover =
    !!course.cover_image_url && !course.cover_image_url.includes("example.com");

  let chapters: Chapter[] = [];
  try {
    chapters = await fetchChapters(id);
  } catch {
    /* non-critical */
  }

  const videosPerChapter = await Promise.all(
    chapters.map((ch) => fetchVideos(ch.id).catch((): Video[] => [])),
  );
  const chaptersWithVideos = chapters.map((ch, i) => ({
    ...ch,
    videos: videosPerChapter[i],
  }));

  return (
    <div className="min-h-screen bg-[#f9f9fc]">
      <TopNav />
      <CourseDetailView
        course={course}
        chaptersWithVideos={chaptersWithVideos}
        gradient={gradient}
        hasCover={hasCover}
      />
    </div>
  );
}

function ErrorPage() {
  return (
    <div className="min-h-screen bg-[#f9f9fc] flex flex-col">
      <TopNav />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-[#424654] mb-4">加载课程失败，请稍后重试</p>
          <Link href="/">
            <Button
              variant="outline"
              className="rounded-full border-[#c3c6d6] text-[#1a1c1e]"
            >
              返回首页
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
