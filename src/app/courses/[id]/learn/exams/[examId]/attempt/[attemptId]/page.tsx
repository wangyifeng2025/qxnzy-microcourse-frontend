import StudentExamAttemptDetail from "@/components/student-exam-attempt-detail";

interface PageProps {
  params: Promise<{ id: string; examId: string; attemptId: string }>;
}

export default async function CourseLearnExamAttemptPage({ params }: PageProps) {
  const { id, examId, attemptId } = await params;
  return (
    <StudentExamAttemptDetail
      courseId={id}
      examId={examId}
      attemptId={attemptId}
    />
  );
}
