"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  BarChart3,
  Clock,
  Languages,
  FileText,
  FolderArchive,
  Link2,
  Download,
  ExternalLink,
  BookOpen,
  Users,
  Heart,
} from "lucide-react";
import ChapterList from "@/components/chapter-list";
import CourseDetailStats, {
  type CourseEngagementSnapshot,
} from "@/components/course-detail-stats";
import CourseEnrollmentCTA from "@/components/course-enrollment-cta";
import {
  STATUS_LABEL,
  type Chapter,
  type Course,
  type Video,
} from "@/lib/courses";
import { cn } from "@/lib/utils";

type ChapterWithVideos = Chapter & { videos: Video[] };

function difficultyLabel(id: string): string {
  const labels = ["入门", "初级", "中级", "进阶"];
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return labels[n % labels.length];
}

export default function CourseDetailView({
  course,
  chaptersWithVideos,
  gradient,
  hasCover,
}: {
  course: Course;
  chaptersWithVideos: ChapterWithVideos[];
  gradient: string;
  hasCover: boolean;
}) {
  const statusInfo = STATUS_LABEL[course.status] ?? STATUS_LABEL.Draft;
  const teacherName = course.teacher_name || "讲师";
  const teacherInitial = teacherName.charAt(0);

  const totalVideos = useMemo(
    () => chaptersWithVideos.reduce((s, c) => s + c.videos.length, 0),
    [chaptersWithVideos],
  );

  const totalMinutes = useMemo(() => {
    const sec = chaptersWithVideos.reduce(
      (s, c) => s + c.videos.reduce((a, v) => a + v.duration, 0),
      0,
    );
    return Math.max(1, Math.ceil(sec / 60));
  }, [chaptersWithVideos]);

  const estTimeLabel =
    totalMinutes >= 60
      ? `约 ${Math.round(totalMinutes / 60)} 小时`
      : `约 ${totalMinutes} 分钟`;

  const [engagement, setEngagement] = useState<CourseEngagementSnapshot | null>(
    null,
  );

  const navLinks = [
    { href: "#course-overview", label: "课程概览" },
    { href: "#course-syllabus", label: "课程大纲" },
    { href: "#course-instructor", label: "讲师" },
    { href: "#course-community", label: "社区" },
  ];

  return (
    <div className="bg-[#f9f9fc] text-[#1a1c1e]">
      {/* 返回
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 lg:px-16 pt-2">
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-[#424654] transition-colors hover:text-[#0040a1]"
        >
          ← 返回首页
        </Link>
      </div> */}

      {/* Hero — stitch: bg-surface-container-low */}
      <header className="relative bg-[#f3f3f6] py-8 md:py-16 px-4 md:px-8 lg:px-16 overflow-hidden">
        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-16 relative z-10">
          <div className="flex-1 space-y-6 md:space-y-8 w-full min-w-0">
            <div className="flex flex-wrap items-center gap-4">
              <span className="bg-[#872200] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                免费
              </span>
              <CourseDetailStats
                course={course}
                courseId={course.id}
                courseStatus={course.status}
                onStatsChange={setEngagement}
              />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter text-[#1a1c1e] leading-[1.1]">
              {course.title}
            </h1>

            <p className="text-lg md:text-xl text-[#424654] max-w-2xl leading-relaxed">
              {course.description?.trim() ||
                "系统化的精品微课，帮助你高效掌握核心知识与实战能力。"}
            </p>

            <div className="flex flex-wrap items-center gap-4 md:gap-6 pt-2">
              <CourseEnrollmentCTA
                courseId={course.id}
                courseStatus={course.status}
              />
              <button
                type="button"
                className="flex items-center gap-2 text-[#0040a1] font-bold hover:underline"
              >
                <Bookmark size={20} strokeWidth={2} />
                稍后再学
              </button>
            </div>
          </div>

          <div className="hidden lg:block w-full md:w-1/3 aspect-auto relative rounded-xl overflow-hidden bg-[#e2e2e5] shadow-2xl shrink-0 max-w-md">
            {hasCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.cover_image_url!}
                alt=""
                className="w-full h-full object-contain contrast-125 opacity-90 mix-blend-multiply"
              />
            ) : (
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-linear-to-br",
                  gradient,
                )}
              >
                <BookOpen size={80} className="text-white/25" />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-[#0040a1]/40 to-transparent pointer-events-none" />
          </div>
        </div>

        <div
          className="absolute -top-24 -right-24 w-96 h-96 bg-[#0040a1]/5 rounded-full blur-3xl pointer-events-none"
          aria-hidden
        />
      </header>

      {/* 主栏 + 侧栏 */}
      <div className="max-w-screen-2xl mx-auto px-4 md:px-8 lg:px-16 py-12 md:py-20 flex flex-col lg:flex-row gap-12 lg:gap-16">
        {/* 左栏 */}
        <div className="flex-1 min-w-0 space-y-16 md:space-y-20">
          {/* 内联 Tab */}
          <nav className="flex flex-wrap gap-x-8 md:gap-x-12 gap-y-2 border-b border-[#c3c6d6]/25 pb-4">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="pb-4 text-sm md:text-base font-bold text-[#424654] border-b-2 border-transparent hover:text-[#1a1c1e] hover:border-[#0040a1]/40 -mb-[17px] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <section className="space-y-6 scroll-mt-32" id="course-overview">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1e] tracking-tight">
              课程概览
            </h2>
            <div className="max-w-none text-[#424654] leading-loose text-base md:text-lg space-y-4">
              <p>
                {course.description?.trim() ||
                  "本课程为平台精选微课，内容结构清晰，适合利用碎片时间系统学习。"}
              </p>
              <p>
                你可以按章节顺序观看视频，结合大纲中的课时安排规划学习节奏。若课程含实操或延伸阅读，可在侧栏查看相关资料（如有）。
              </p>
            </div>
          </section>

          <section className="space-y-8 scroll-mt-32" id="course-syllabus">
            <div className="flex flex-wrap justify-between items-end gap-2">
              <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1e] tracking-tight">
                课程大纲
              </h2>
              <span className="text-xs font-medium text-[#424654] uppercase tracking-widest">
                {chaptersWithVideos.length} 章 · {totalVideos} 节
              </span>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm border border-[#c3c6d6]/15">
              <ChapterList chapters={chaptersWithVideos} />
            </div>
          </section>

          <section
            className="space-y-8 bg-[#f3f3f6] p-8 md:p-10 rounded-2xl scroll-mt-32"
            id="course-instructor"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1e] tracking-tight">
              主讲讲师
            </h2>
            <div className="flex flex-col md:flex-row gap-8 md:gap-10 items-start">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden shrink-0 border-4 border-white shadow-lg bg-[#e8e8ea] flex items-center justify-center text-3xl font-bold text-[#0040a1]">
                {teacherInitial}
              </div>
              <div className="space-y-4 min-w-0">
                <div>
                  <h4 className="text-xl md:text-2xl font-bold text-[#0040a1]">
                    {teacherName}
                  </h4>
                  <p className="text-[#424654] uppercase text-xs tracking-widest mt-1">
                    趣学内卷 · 认证讲师
                  </p>
                </div>
                <p className="text-[#424654] leading-relaxed">
                  讲师在本课程中为你梳理知识脉络，讲解关键概念。更多背景与作品展示敬请期待。
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-6 scroll-mt-32" id="course-community">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1a1c1e] tracking-tight">
              学习社区
            </h2>
            <p className="text-[#424654] leading-relaxed">
              课程讨论区即将开放，届时可与同学、讲师围绕作业与疑难点交流。
            </p>
          </section>
        </div>

        {/* 右侧边栏 */}
        <aside className="w-full lg:w-96 shrink-0 space-y-8 lg:space-y-10">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#c3c6d6]/10 space-y-6">
            <h3 className="font-bold text-lg text-[#1a1c1e]">课程规格</h3>
            <div className="space-y-1">
              <SpecRow
                icon={<BarChart3 className="size-4" />}
                label="难度"
                value={difficultyLabel(course.id)}
                valueClassName="text-[#0040a1]"
              />
              <SpecRow
                icon={<Clock className="size-4" />}
                label="预计学时"
                value={estTimeLabel}
              />
              <SpecRow
                icon={<Languages className="size-4" />}
                label="语言"
                value="中文"
              />
              <SpecRow
                icon={<BookOpen className="size-4" />}
                label="状态"
                value={statusInfo.label}
                valueClassName="text-[#0040a1]"
              />
              <SpecRow
                icon={<Users className="size-4" />}
                label="学习人数"
                value={
                  engagement?.enrollmentCount != null
                    ? `${engagement.enrollmentCount.toLocaleString("zh-CN")} 人`
                    : engagement?.loggedIn === false
                      ? "登录可见"
                      : "—"
                }
              />
              <SpecRow
                icon={<Heart className="size-4" />}
                label="关注"
                value={
                  engagement != null
                    ? `${engagement.voteCount.toLocaleString("zh-CN")} 人`
                    : (course.vote_count ?? 0).toLocaleString("zh-CN") + " 人"
                }
                valueClassName="text-[#0040a1]"
              />
            </div>
          </div>
          <div className="bg-[#f9f9fc] p-6 md:p-8 rounded-2xl border border-[#c3c6d6]/30 space-y-6">
            <h3 className="font-bold text-lg text-[#1a1c1e]">学习资源</h3>
            <div className="space-y-2">
              <a
                href="#"
                className="flex items-center gap-3 p-3 hover:bg-[#f3f3f6] rounded-lg transition-all group"
                onClick={(e) => e.preventDefault()}
              >
                <FileText className="text-[#0040a1] size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1a1c1e] truncate">
                    课程讲义（示例）
                  </p>
                  <p className="text-[10px] text-[#737785] uppercase tracking-wide">
                    PDF · 即将上线
                  </p>
                </div>
                <Download className="text-[#737785] group-hover:text-[#0040a1] size-5 shrink-0" />
              </a>
              <a
                href="#"
                className="flex items-center gap-3 p-3 hover:bg-[#f3f3f6] rounded-lg transition-all group"
                onClick={(e) => e.preventDefault()}
              >
                <FolderArchive className="text-[#0040a1] size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1a1c1e] truncate">
                    素材压缩包（示例）
                  </p>
                  <p className="text-[10px] text-[#737785] uppercase tracking-wide">
                    ZIP · 即将上线
                  </p>
                </div>
                <Download className="text-[#737785] group-hover:text-[#0040a1] size-5 shrink-0" />
              </a>
              <Link
                href="/"
                className="flex items-center gap-3 p-3 hover:bg-[#f3f3f6] rounded-lg transition-all group"
              >
                <Link2 className="text-[#0040a1] size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1a1c1e] truncate">
                    更多好课
                  </p>
                  <p className="text-[10px] text-[#737785] uppercase tracking-wide">
                    站内链接
                  </p>
                </div>
                <ExternalLink className="text-[#737785] group-hover:text-[#0040a1] size-5 shrink-0" />
              </Link>
            </div>
          </div>
          <div className="bg-[#e8e8ea] p-6 md:p-8 rounded-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#1a1c1e]">讨论精选</h3>
              <span className="bg-[#872200]/10 text-[#872200] px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter">
                热聊
              </span>
            </div>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl text-sm shadow-sm">
                <p className="text-[#424654] italic">
                  「这节的例题讲得特别清楚，已二刷！」
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-[#737785]">
                  <span>@learner_01</span>
                  <span className="text-[#0040a1]">3 条回复</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl text-sm shadow-sm">
                <p className="text-[#424654] italic">
                  「大纲节奏刚好，适合每天半小时。」
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-[#737785]">
                  <span>@night_owl</span>
                  <span className="text-[#0040a1]">1 条回复</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="w-full py-3 rounded-full border border-[#0040a1] text-[#0040a1] font-bold text-sm hover:bg-[#0040a1]/5 transition-colors"
            >
              参与讨论
            </button>
          </div>

          {/* 侧栏快捷 CTA（小屏；与 hero 选课逻辑一致） */}
          <div className="lg:hidden w-full">
            <CourseEnrollmentCTA
              courseId={course.id}
              courseStatus={course.status}
              variant="sidebar"
            />
          </div>
        </aside>
      </div>

      {/* 页脚 */}
      <footer className="bg-slate-50 w-full py-10 md:py-12 border-t border-slate-100 mt-8">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-16 flex flex-col md:flex-row flex-wrap justify-between items-center gap-6">
          <div className="text-sm font-black text-slate-900 uppercase tracking-widest">
            趣学内卷 · 微课
          </div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-xs uppercase tracking-widest text-slate-400">
            <Link href="#" className="hover:text-slate-900 transition-colors">
              关于我们
            </Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">
              条款
            </Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">
              隐私
            </Link>
            <Link href="#" className="hover:text-slate-900 transition-colors">
              帮助中心
            </Link>
          </div>
          <div className="text-xs uppercase tracking-widest text-slate-500 opacity-80">
            © {new Date().getFullYear()} 趣学内卷
          </div>
        </div>
      </footer>
    </div>
  );
}

function SpecRow({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#eeeef0] last:border-0">
      <div className="flex items-center gap-3 text-[#424654]">
        <span className="opacity-80">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={cn("text-sm font-bold text-[#1a1c1e]", valueClassName)}>
        {value}
      </span>
    </div>
  );
}
