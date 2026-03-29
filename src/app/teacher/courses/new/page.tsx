import TopNav from "@/components/top-nav";
import TeacherCourseCreate from "@/components/teacher-course-create";

export default function NewCoursePage() {
  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <TeacherCourseCreate />
    </div>
  );
}
