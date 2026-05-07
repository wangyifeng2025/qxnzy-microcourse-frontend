import StudentExamHub from "@/components/student-exam-hub";

interface PageProps {
  params: Promise<{ id: string; examId: string }>;
}

export default async function CourseLearnExamHubPage({ params }: PageProps) {
  const { id, examId } = await params;
  return <StudentExamHub courseId={id} examId={examId} />;
}
