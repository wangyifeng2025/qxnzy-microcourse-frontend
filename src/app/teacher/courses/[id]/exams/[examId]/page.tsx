import TopNav from "@/components/top-nav";
import TeacherExamEditor from "@/components/teacher-exam-editor";

interface PageProps {
  params: Promise<{ id: string; examId: string }>;
}

export default async function TeacherExamEditorPage({ params }: PageProps) {
  const { id, examId } = await params;
  return (
    <div className="flex min-h-dvh flex-col bg-[#f9f9fc]">
      <TopNav />
      <div className="min-h-0 flex-1 overflow-hidden">
        <TeacherExamEditor courseId={id} examId={examId} />
      </div>
    </div>
  );
}
