import TopNav from "@/components/top-nav";
import TeacherCourseInfoEdit from "@/components/teacher-course-info-edit";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * 未发布课程需在客户端带 Bearer；服务端无 token，不在此预校验。
 */
export default async function TeacherCourseInfoPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <TeacherCourseInfoEdit courseId={id} />
    </div>
  );
}
