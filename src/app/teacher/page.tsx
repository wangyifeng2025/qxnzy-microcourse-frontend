import TopNav from "@/components/top-nav";
import TeacherConsole from "@/components/teacher-console";

export default function TeacherPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f9f9fc]">
      <TopNav />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TeacherConsole />
      </div>
    </div>
  );
}
