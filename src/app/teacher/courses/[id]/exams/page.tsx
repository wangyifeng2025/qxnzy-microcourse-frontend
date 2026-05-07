import TopNav from "@/components/top-nav";
import TeacherCourseExams from "@/components/teacher-course-exams";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeacherCourseExamsPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="flex min-h-dvh flex-col bg-[#f9f9fc]">
      <TopNav />
      <div className="min-h-0 flex-1 overflow-hidden">
        <TeacherCourseExams courseId={id} />
      </div>
    </div>
  );
}
