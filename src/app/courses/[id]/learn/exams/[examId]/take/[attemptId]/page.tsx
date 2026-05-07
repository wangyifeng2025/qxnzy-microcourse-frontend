import StudentExamTake from "@/components/student-exam-take";

interface PageProps {
  params: Promise<{ id: string; examId: string; attemptId: string }>;
}

export default async function CourseLearnExamTakePage({ params }: PageProps) {
  const { id, examId, attemptId } = await params;
  return (
    <StudentExamTake courseId={id} examId={examId} attemptId={attemptId} />
  );
}
