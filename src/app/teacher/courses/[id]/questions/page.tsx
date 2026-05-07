import TopNav from "@/components/top-nav";
import TeacherCourseQuestions from "@/components/teacher-course-questions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeacherCourseQuestionsPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="flex min-h-dvh flex-col bg-[#f9f9fc]">
      <TopNav />
      <div className="min-h-0 flex-1 overflow-hidden">
        <TeacherCourseQuestions courseId={id} />
      </div>
    </div>
  );
}
