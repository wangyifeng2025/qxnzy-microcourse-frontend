"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  LogIn,
  Hash,
  MessageSquare,
  LayoutDashboard,
  Globe,
  FlaskConical,
  Settings,
  MessageCircle,
  FileText,
  Link as LinkIcon,
  Star,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getToken, getUser, userHasAnyRole, type UserInfo } from "@/lib/auth";
import {
  fetchStandaloneTopic,
  fetchStandaloneTopicMembers,
  fetchStandaloneTopics,
  type CommunityTopicResponse,
  type CommunityTopicMember,
} from "@/lib/standalone-community";
import { TopicDetailPanel } from "@/components/community-page";
import AppSiteHeader from "@/components/app-site-header";

const C = { primary: "#0040a1" };

export default function CommunityTopicPage({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mounted, setMounted] = useState(false);

  const [topic, setTopic] = useState<CommunityTopicResponse | null>(null);
  const [topicLoading, setTopicLoading] = useState(true);
  const [topicError, setTopicError] = useState<string | null>(null);

  const [isMember, setIsMember] = useState(false);
  const [sidebarMembers, setSidebarMembers] = useState<CommunityTopicMember[]>([]);
  const [relatedTopics, setRelatedTopics] = useState<CommunityTopicResponse[]>([]);

  const isTeacher = userHasAnyRole(user?.role, "teacher", "admin");

  useEffect(() => {
    setToken(getToken());
    setUser(getUser());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!token || !mounted) return;
    let cancelled = false;
    setTopicLoading(true);
    setTopicError(null);
    void (async () => {
      try {
        const t = await fetchStandaloneTopic(topicId, token);
        if (cancelled) return;
        setTopic(t);
        const u = getUser();
        if (u?.id) {
          try {
            const members = await fetchStandaloneTopicMembers(t.id, token);
            if (!cancelled)
              setIsMember(members.some((m) => m.user_id === u.id));
          } catch {
            if (!cancelled) setIsMember(false);
          }
        } else if (!cancelled) {
          setIsMember(false);
        }
      } catch (err) {
        if (!cancelled)
          setTopicError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (!cancelled) setTopicLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topicId, token, mounted]);

  useEffect(() => {
    if (!token || !topic) return;
    let cancelled = false;
    void fetchStandaloneTopics(token, { pageSize: 12 })
      .then((d) => {
        if (cancelled) return;
        setRelatedTopics(d.items.filter((x) => x.id !== topic.id).slice(0, 4));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, topic]);

  const onMemberCountChange = (id: string, delta: number) => {
    if (id !== topicId) return;
    setTopic((t) =>
      t ? { ...t, member_count: Math.max(0, t.member_count + delta) } : t,
    );
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9f9fc]">
        <Loader2 size={24} className="animate-spin text-[#c3c6d6]" />
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f9f9fc] px-8 text-center">
        <Hash size={40} className="mb-4 text-[#e2e2e5]" />
        <h1 className="mb-2 text-lg font-bold text-[#1a1c1e]">查看话题</h1>
        <p className="mb-6 text-sm text-[#424654]">登录后即可参与讨论</p>
        <Link
          href={`/login?next=${encodeURIComponent(`/community/${topicId}`)}`}
          className="rounded-full px-8 py-3 font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
        >
          <LogIn size={16} className="mr-1 inline" />
          登录
        </Link>
        <Link href="/community" className="mt-6 text-sm text-[#737785] hover:text-[#1a1c1e]">
          返回社区
        </Link>
      </div>
    );
  }

  if (topicLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9f9fc]">
        <Loader2 size={24} className="animate-spin text-[#c3c6d6]" />
      </div>
    );
  }

  if (topicError || !topic) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f9f9fc] px-8 text-center">
        <p className="mb-2 text-sm font-bold text-[#1a1c1e]">{topicError ?? "话题不存在"}</p>
        <Link href="/community" className="text-sm font-bold text-[#0040a1] hover:underline">
          返回社区
        </Link>
      </div>
    );
  }

  const activeAvatars = sidebarMembers.slice(0, 4);
  const overflow = Math.max(0, sidebarMembers.length - 4);

  return (
    <div className="min-h-screen bg-[#f9f9fc] text-[#1a1c1e]">
      <AppSiteHeader
        active="community"
        layoutSpacer={false}
        primaryAction={
          isTeacher ? (
            <Link
              href="/community#community-compose"
              className="rounded-full px-5 py-2 text-sm font-bold tracking-wide text-white transition active:scale-95 md:px-6"
              style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
            >
              发布话题
            </Link>
          ) : undefined
        }
      />

      <div className="flex min-h-[calc(100dvh-5rem)] pt-20">
        <aside className="fixed left-0 top-20 z-40 hidden h-[calc(100dvh-5rem)] w-64 flex-col gap-2 border-r border-transparent bg-slate-50 p-6 lg:flex">
          <div className="mb-6 px-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#424654]/60">
              学习工作台
            </h3>
            <p className="text-sm font-medium text-[#0040a1]">微课社区</p>
          </div>
          <nav className="flex flex-col gap-1">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100"
            >
              <LayoutDashboard size={20} />
              首页
            </Link>
            <Link
              href="/community"
              className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-medium text-[#0040a1] shadow-sm transition-all"
            >
              <MessageSquare size={20} />
              讨论广场
            </Link>
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100"
            >
              <Globe size={20} />
              全部课程
            </Link>
            <Link
              href="/my-learning"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100"
            >
              <FlaskConical size={20} />
              我的学习
            </Link>
            {isTeacher && (
              <Link
                href="/teacher"
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100"
              >
                <Settings size={20} />
                讲师工作台
              </Link>
            )}
          </nav>
        </aside>

        <div className="flex w-full flex-1 lg:ml-64">
          <main className="max-w-5xl flex-1 px-4 py-8 md:px-12 xl:mr-80">
            <TopicDetailPanel
              topic={topic}
              token={token}
              currentUser={user}
              isMember={isMember}
              layout="editorial"
              onClose={() => router.push("/community")}
              onTopicDeleted={() => router.push("/community")}
              onMemberCountChange={onMemberCountChange}
              onMembersChange={setSidebarMembers}
            />
          </main>

          <aside
            className={cn(
              "fixed right-0 top-20 z-30 hidden h-[calc(100dvh-5rem)] w-80 overflow-y-auto p-8 xl:block",
              "[scrollbar-width:thin]",
            )}
          >
            <div className="space-y-8">
              <section className="rounded-2xl bg-[#f3f3f6] p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#1a1c1e]">
                  话题速览
                </h3>
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-white p-3 text-center">
                    <p className="text-2xl font-extrabold text-[#0040a1]">{topic.reply_count}</p>
                    <p className="text-[10px] font-bold uppercase tracking-tighter text-[#424654]">
                      回复
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3 text-center">
                    <p className="text-2xl font-extrabold text-[#0040a1]">{topic.member_count}</p>
                    <p className="text-[10px] font-bold uppercase tracking-tighter text-[#424654]">
                      成员
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#424654]">
                    提示
                  </p>
                  <div className="flex items-center gap-2 rounded-lg bg-white/60 p-2">
                    <FileText className="size-4 shrink-0 text-[#0040a1]" />
                    <span className="text-xs font-medium text-[#424654]">
                      加入话题后可查看完整回复树并使用 @ 提及
                    </span>
                  </div>
                  <Link
                    href="/community"
                    className="flex items-center gap-2 rounded-lg bg-white/60 p-2 transition-colors hover:bg-white"
                  >
                    <LinkIcon className="size-4 shrink-0 text-[#0040a1]" />
                    <span className="truncate text-xs font-medium text-[#424654]">返回话题列表</span>
                  </Link>
                </div>
              </section>

              {relatedTopics.length > 0 && (
                <section>
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#1a1c1e]">
                    相关话题
                  </h3>
                  <div className="space-y-4">
                    {relatedTopics.map((t) => (
                      <Link
                        key={t.id}
                        href={`/community/${t.id}`}
                        className="group block rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-md"
                      >
                        <h4 className="mb-2 text-sm font-bold leading-tight text-[#1a1c1e] group-hover:text-[#0040a1]">
                          {t.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] font-medium text-[#424654]">
                          <span className="flex items-center gap-1">
                            <MessageCircle size={14} />
                            {t.reply_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star size={14} />
                            {t.member_count}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {sidebarMembers.length > 0 && (
                <section>
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#1a1c1e]">
                    <TrendingUp className="size-4 text-[#872200]" />
                    成员头像
                  </h3>
                  <div className="flex -space-x-3 overflow-hidden pl-1">
                    {activeAvatars.map((m) => (
                      <div
                        key={m.user_id}
                        className="inline-block size-10 overflow-hidden rounded-full ring-2 ring-white"
                        title={m.real_name || m.username}
                      >
                        {m.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.avatar_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex size-full items-center justify-center bg-[#0040a1] text-xs font-bold text-white"
                          >
                            {m.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                    {overflow > 0 && (
                      <div className="flex size-10 items-center justify-center rounded-full bg-[#e8e8ea] text-xs font-bold text-[#424654] ring-2 ring-white">
                        +{overflow}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </aside>
        </div>
      </div>

      <footer className="flex w-full flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-8 py-10 md:flex-row md:px-16">
        <span className="text-xs text-slate-500 transition-opacity hover:opacity-100">
          © {new Date().getFullYear()} 微光智造 · 微课学习社区
        </span>
        <div className="flex flex-wrap justify-center gap-6">
          <span className="cursor-default text-xs text-slate-400">隐私政策</span>
          <span className="cursor-default text-xs text-slate-400">服务条款</span>
          <Link href="/community" className="text-xs text-slate-400 hover:text-[#0040a1]">
            帮助中心
          </Link>
        </div>
      </footer>
    </div>
  );
}
