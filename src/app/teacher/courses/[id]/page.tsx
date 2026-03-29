import TopNav from "@/components/top-nav";
import TeacherCourseEditor from "@/components/teacher-course-editor";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * 未发布课程需在客户端带 Bearer 拉取详情；服务端无 token，不在此预校验。
 */
export default async function TeacherCourseEditPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <TeacherCourseEditor courseId={id} />
    </div>
  );
}

