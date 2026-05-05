"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Users,
  BookOpen,
  Plus,
  Send,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AtSign,
  Pin,
  Loader2,
  CornerDownRight,
  ShieldCheck,
  GraduationCap,
  ChevronDown,
  MessageCircle,
  UserPlus,
  UserMinus,
  Hash,
  Sparkles,
  X,
  MessageSquare,
  Settings,
  HelpCircle,
  CheckCircle2,
  Share2,
  Library,
  Microscope,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AppSiteHeader from "@/components/app-site-header";
import { getToken, getUser, userHasAnyRole, type UserInfo } from "@/lib/auth";
import {
  fetchStandaloneTopics,
  createStandaloneTopic,
  deleteStandaloneTopic,
  joinStandaloneTopic,
  leaveStandaloneTopic,
  fetchStandaloneReplies,
  createStandaloneReply,
  deleteStandaloneReply,
  fetchStandaloneTopicMembers,
  resolveStandaloneTopicMembership,
  type CommunityTopicResponse,
  type CommunityTopicReplyResponse,
  type CommunityTopicMember,
  type StandaloneTopicCursor,
} from "@/lib/standalone-community";
import {
  readStoredJoinedTopicIds,
  writeStoredJoinedTopicIds,
  addStoredJoinedTopicId,
  removeStoredJoinedTopicId,
} from "@/lib/community-joined-storage";

// ---------------------------------------------------------------------------
// 色板常量
// ---------------------------------------------------------------------------

const C = {
  bg: "#f9f9fc",
  bgLow: "#f3f3f6",
  bgCard: "#ffffff",
  border: "rgba(195,198,214,0.25)",
  primary: "#0040a1",
  primaryMuted: "rgba(0,64,161,0.08)",
  danger: "#cc2200",
  text: "#1a1c1e",
  muted: "#424654",
  faint: "#737785",
};

// ---------------------------------------------------------------------------
// 工具：时间
// ---------------------------------------------------------------------------

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// 工具：头像
// ---------------------------------------------------------------------------

function Avatar({
  username,
  avatarUrl,
  size = "md",
}: {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const cls = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  }[size];
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt="" className={cn("rounded-full object-cover shrink-0", cls)} />;
  }
  return (
    <div
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center font-bold text-white select-none",
        cls,
      )}
      style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 工具：角色徽章
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: string }) {
  if (role === "teacher")
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 shrink-0">
        <ShieldCheck size={9} />讲师
      </span>
    );
  if (role === "admin")
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 shrink-0">
        <ShieldCheck size={9} />管理员
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-500 shrink-0">
      <GraduationCap size={9} />学员
    </span>
  );
}

function roleLabelEnStyle(role: string): string {
  const r = role.toLowerCase();
  if (r === "teacher") return "Instructor";
  if (r === "admin") return "Admin";
  return "Student";
}

// ---------------------------------------------------------------------------
// @提及组件
// ---------------------------------------------------------------------------

function MentionPicker({
  members,
  query,
  onSelect,
  anchorRef,
}: {
  members: CommunityTopicMember[];
  query: string;
  onSelect: (m: CommunityTopicMember) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const filtered = members.filter(
    (m) =>
      m.username.toLowerCase().includes(query.toLowerCase()) ||
      (m.real_name ?? "").toLowerCase().includes(query.toLowerCase()),
  );
  if (!filtered.length) return null;
  const rect = anchorRef.current?.getBoundingClientRect();
  return (
    <div
      style={{
        position: "fixed",
        top: rect ? rect.bottom + 4 : 0,
        left: rect ? rect.left : 0,
        minWidth: 220,
        zIndex: 9999,
      }}
      className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
    >
      {filtered.slice(0, 6).map((m) => (
        <button
          key={m.user_id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(m);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
        >
          <Avatar username={m.username} avatarUrl={m.avatar_url} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{m.real_name || m.username}</p>
            <p className="text-[10px] text-gray-400 truncate">@{m.username}</p>
          </div>
          <RoleBadge role={m.role} />
        </button>
      ))}
    </div>
  );
}

function MentionTextarea({
  value,
  onChange,
  onMentionChange,
  members,
  placeholder,
  rows = 3,
  className,
  textFieldClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  onMentionChange: (ids: string[]) => void;
  members: CommunityTopicMember[];
  placeholder?: string;
  rows?: number;
  className?: string;
  textFieldClassName?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [ids, setIds] = useState<string[]>([]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    onChange(v);
    const cur = e.target.selectionStart;
    const match = v.slice(0, cur).match(/@(\w*)$/);
    setQuery(match ? match[1] : null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") setQuery(null);
  }

  function handleSelect(m: CommunityTopicMember) {
    const ta = ref.current;
    if (!ta) return;
    const cur = ta.selectionStart;
    const before = value.slice(0, cur);
    const atIdx = before.lastIndexOf("@");
    const newText = value.slice(0, atIdx) + `@${m.username} ` + value.slice(cur);
    onChange(newText);
    const newIds = ids.includes(m.user_id) ? ids : [...ids, m.user_id];
    setIds(newIds);
    onMentionChange(newIds);
    setQuery(null);
    setTimeout(() => {
      ta.setSelectionRange(atIdx + m.username.length + 2, atIdx + m.username.length + 2);
      ta.focus();
    }, 0);
  }

  return (
    <div className={cn("relative", className)}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full resize-none bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none leading-relaxed",
          textFieldClassName,
        )}
      />
      {query !== null && (
        <MentionPicker members={members} query={query} onSelect={handleSelect} anchorRef={ref} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 回复列表项
// ---------------------------------------------------------------------------

function ReplyItem({
  reply,
  allReplies,
  topicAuthorId,
  currentUser,
  topicId,
  token,
  onDelete,
  onQuote,
  presentation = "default",
  accentLeft = false,
}: {
  reply: CommunityTopicReplyResponse;
  allReplies: CommunityTopicReplyResponse[];
  topicAuthorId: string;
  currentUser: UserInfo | null;
  topicId: string;
  token: string;
  onDelete: (id: string) => void;
  onQuote: (r: CommunityTopicReplyResponse) => void;
  presentation?: "default" | "editorial";
  accentLeft?: boolean;
}) {
  const [deleting, setDeleting] = useState(false);
  const canDelete =
    currentUser?.id === reply.author_id ||
    userHasAnyRole(currentUser?.role, "admin") ||
    currentUser?.id === topicAuthorId;
  const quoted = reply.reply_to_reply_id
    ? allReplies.find((r) => r.id === reply.reply_to_reply_id)
    : null;

  async function handleDelete() {
    if (!confirm("删除该回复？")) return;
    setDeleting(true);
    try {
      await deleteStandaloneReply(topicId, reply.id, token);
      onDelete(reply.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
      setDeleting(false);
    }
  }

  if (presentation === "editorial") {
    return (
      <div
        className={cn(
          "rounded-xl bg-white p-6 shadow-sm border border-[#c3c6d6]/10",
          accentLeft && "border-l-4 border-l-[#0040a1]",
        )}
      >
        <div className="flex gap-4">
          <Avatar username={reply.author_username} avatarUrl={reply.author_avatar_url} size="md" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-[#1a1c1e]">
                {reply.author_real_name || reply.author_username}
              </span>
              <span className="rounded bg-[#eeeef0] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-[#424654]">
                {roleLabelEnStyle(reply.author_role)}
              </span>
              <span className="text-xs text-[#737785]/80">• {timeAgo(reply.created_at)}</span>
            </div>
            {quoted && (
              <div className="mb-2 border-l-2 border-[#e2e2e5] pl-3 text-xs italic text-[#737785]">
                <CornerDownRight size={10} className="mr-1 inline" />
                回复 @{quoted.author_username}：{quoted.content.slice(0, 80)}
                {quoted.content.length > 80 ? "…" : ""}
              </div>
            )}
            <p className="mb-4 text-sm leading-relaxed whitespace-pre-wrap text-[#424654]">
              {reply.content}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onQuote(reply)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#424654] transition-colors hover:text-[#0040a1]"
              >
                <CornerDownRight size={14} />
                回复
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 text-xs font-bold text-[#737785] hover:text-red-600"
                >
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  删除
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group py-3 border-b border-gray-100 last:border-0">
      <Avatar username={reply.author_username} avatarUrl={reply.author_avatar_url} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="text-sm font-bold text-gray-900">
            {reply.author_real_name || reply.author_username}
          </span>
          <span className="text-xs text-gray-400">@{reply.author_username}</span>
          <RoleBadge role={reply.author_role} />
          <span className="text-xs text-gray-400 ml-auto">{timeAgo(reply.created_at)}</span>
        </div>
        {quoted && (
          <div className="mb-2 pl-3 border-l-2 border-gray-200 text-xs text-gray-400 italic">
            <CornerDownRight size={10} className="inline mr-1" />
            回复 @{quoted.author_username}：{quoted.content.slice(0, 50)}
            {quoted.content.length > 50 ? "…" : ""}
          </div>
        )}
        <p className="text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap">
          {reply.content}
        </p>
        <div className="flex items-center gap-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onQuote(reply)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
          >
            <CornerDownRight size={12} />回复
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 话题详情面板（独立页面或内嵌容器）
// ---------------------------------------------------------------------------

export type TopicDetailPanelLayout = "overlay" | "fullpage" | "editorial";

export function TopicDetailPanel({
  topic,
  token,
  currentUser,
  isMember,
  onClose,
  onTopicDeleted,
  onMemberCountChange,
  layout = "overlay",
  onMembersChange,
}: {
  topic: CommunityTopicResponse;
  token: string;
  currentUser: UserInfo;
  isMember: boolean;
  onClose: () => void;
  onTopicDeleted: (id: string) => void;
  onMemberCountChange: (id: string, delta: number) => void;
  layout?: TopicDetailPanelLayout;
  onMembersChange?: (members: CommunityTopicMember[]) => void;
}) {
  const [replies, setReplies] = useState<CommunityTopicReplyResponse[]>([]);
  const [members, setMembers] = useState<CommunityTopicMember[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextAt, setNextAt] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [joined, setJoined] = useState(isMember);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    setJoined(isMember);
  }, [isMember]);
  const [replyContent, setReplyContent] = useState("");
  const [replyMentionIds, setReplyMentionIds] = useState<string[]>([]);
  const [quotingReply, setQuotingReply] = useState<CommunityTopicReplyResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState("");

  const canDelete =
    currentUser.id === topic.author_id || userHasAnyRole(currentUser.role, "admin");
  const isAuthor = currentUser.id === topic.author_id;

  const pagePad = layout === "fullpage" ? "px-5 sm:px-8 lg:px-12 xl:px-14" : "px-4";

  const loadReplies = useCallback(
    async (more = false) => {
      if (!joined) { setLoadingReplies(false); return; }
      setLoadingReplies(!more);
      try {
        const data = await fetchStandaloneReplies(topic.id, token, {
          pageSize: 50,
          ...(more && nextAt && nextId ? { cursorCreatedAt: nextAt, cursorId: nextId } : {}),
        });
        setReplies((p) => (more ? [...p, ...data.items] : data.items));
        setHasMore(data.has_more);
        setNextAt(data.next_cursor_created_at);
        setNextId(data.next_cursor_id);
      } catch { /* ignore */ }
      finally { setLoadingReplies(false); }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topic.id, token, joined],
  );

  useEffect(() => {
    void loadReplies();
    if (joined) {
      fetchStandaloneTopicMembers(topic.id, token).then(setMembers).catch(() => {});
    }
  }, [topic.id, token, joined, loadReplies]);

  useEffect(() => {
    onMembersChange?.(members);
  }, [members, onMembersChange]);

  async function handleJoin() {
    setJoining(true);
    try {
      await joinStandaloneTopic(topic.id, token);
      setJoined(true);
      addStoredJoinedTopicId(topic.id);
      onMemberCountChange(topic.id, 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "加入失败");
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (!confirm("确定退出该话题？")) return;
    setJoining(true);
    try {
      await leaveStandaloneTopic(topic.id, token);
      setJoined(false);
      removeStoredJoinedTopicId(topic.id);
      onMemberCountChange(topic.id, -1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "退出失败");
    } finally {
      setJoining(false);
    }
  }

  async function handleDeleteTopic() {
    if (!confirm("确定删除该话题？所有回复将一并删除。")) return;
    try {
      await deleteStandaloneTopic(topic.id, token);
      onTopicDeleted(topic.id);
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function handleSubmitReply(e: FormEvent) {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSubmitting(true);
    setReplyError("");
    try {
      const r = await createStandaloneReply(topic.id, token, {
        content: replyContent.trim(),
        reply_to_reply_id: quotingReply?.id ?? null,
        mention_user_ids: replyMentionIds,
      });
      setReplies((p) => [...p, r]);
      setReplyContent("");
      setReplyMentionIds([]);
      setQuotingReply(null);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (layout === "editorial") {
    function shareTopic() {
      if (typeof window === "undefined") return;
      const url = window.location.href;
      void navigator.clipboard.writeText(url).catch(() => {});
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-16 [scrollbar-width:thin]">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-[#424654]">
          <Link href="/community" className="transition-colors hover:text-[#0040a1]">
            学习社区
          </Link>
          <ChevronRight className="size-4 shrink-0 opacity-50" aria-hidden />
          <Link href="/community" className="transition-colors hover:text-[#0040a1]">
            全部话题
          </Link>
          <ChevronRight className="size-4 shrink-0 opacity-50" aria-hidden />
          <span className="line-clamp-2 font-semibold text-[#1a1c1e]">{topic.title}</span>
        </nav>

        <section className="mb-8 rounded-xl border border-[#c3c6d6]/15 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar
                username={topic.author_username}
                avatarUrl={topic.author_avatar_url}
                size="lg"
              />
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-[#1a1c1e]">
                    {topic.author_real_name || topic.author_username}
                  </h2>
                  <span className="rounded-full bg-[#0040a1]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0040a1]">
                    {roleLabelEnStyle(topic.author_role)}
                  </span>
                </div>
                <p className="text-xs text-[#737785]">
                  发布于 {timeAgo(topic.created_at)} · 微光智造微课社区
                  {topic.is_pinned && " · 置顶话题"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {!joined ? (
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={joining}
                  className="flex items-center gap-1 text-sm font-bold text-[#0040a1] transition-opacity hover:opacity-80"
                >
                  <UserPlus size={18} />
                  {joining ? "加入中…" : "加入话题"}
                </button>
              ) : !isAuthor ? (
                <button
                  type="button"
                  onClick={handleLeave}
                  disabled={joining}
                  className="text-sm font-bold text-[#424654] hover:text-[#0040a1]"
                >
                  {joining ? "…" : "退出话题"}
                </button>
              ) : (
                <span className="text-xs font-bold text-[#0040a1]">你是话题作者</span>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDeleteTopic}
                  className="rounded-full p-2 text-[#737785] hover:bg-red-50 hover:text-red-600"
                  aria-label="删除话题"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>

          <h1 className="mb-6 text-3xl font-extrabold leading-tight tracking-tight text-[#1a1c1e]">
            {topic.title}
          </h1>
          <div className="prose prose-slate max-w-none space-y-4 text-[#424654] leading-relaxed">
            <p className="whitespace-pre-wrap">{topic.content}</p>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-[#e8e8ea] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-sm font-semibold text-[#424654]">
                <MessageCircle size={18} />
                {topic.reply_count} 条回复
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold text-[#424654]">
                <Users size={18} />
                {topic.member_count} 位成员
              </span>
              <button
                type="button"
                onClick={shareTopic}
                className="flex items-center gap-2 text-sm font-semibold text-[#424654] transition-colors hover:text-[#0040a1]"
              >
                <Share2 size={18} />
                分享
              </button>
            </div>
            {topic.is_pinned && (
              <div className="flex items-center gap-2 text-[#872200]">
                <Pin size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">精选讨论</span>
              </div>
            )}
          </div>
        </section>

        {joined && (
          <section className="mb-12 rounded-xl bg-[#f3f3f6] p-6">
            {quotingReply && (
              <div className="mb-3 flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-xs text-[#737785]">
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <CornerDownRight size={11} />
                  回复 @{quotingReply.author_username}
                </span>
                <button type="button" onClick={() => setQuotingReply(null)} className="shrink-0 font-bold text-[#1a1c1e]">
                  <X size={13} />
                </button>
              </div>
            )}
            <div className="flex gap-4">
              <Avatar username={currentUser.username} avatarUrl={currentUser.avatar_url} size="md" />
              <form className="min-w-0 flex-1" onSubmit={handleSubmitReply}>
                <MentionTextarea
                  value={replyContent}
                  onChange={setReplyContent}
                  onMentionChange={setReplyMentionIds}
                  members={members}
                  placeholder="写下你的回复…（可用 @ 提及成员）"
                  rows={5}
                  textFieldClassName="min-h-[8rem] rounded-lg border border-[#c3c6d6]/20 bg-white p-4 text-sm focus:ring-2 focus:ring-[#0040a1]/25"
                />
                {replyError && <p className="mt-2 text-xs text-red-600">{replyError}</p>}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-1 text-[11px] text-[#737785]">
                    <AtSign size={10} /> 支持 @ 提及
                  </span>
                  <button
                    type="submit"
                    disabled={submitting || !replyContent.trim()}
                    className="rounded-full bg-gradient-to-br from-[#0040a1] to-[#0056d2] px-6 py-2 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-40"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : "发布回复"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {!joined ? (
          <div className="rounded-xl border border-dashed border-[#c3c6d6]/40 bg-white/50 py-14 text-center text-sm text-[#737785]">
            加入话题后即可查看全部回复并参与讨论
            <div className="mt-4">
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="rounded-full px-6 py-2 text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
              >
                {joining ? <Loader2 size={14} className="animate-spin" /> : "立即加入"}
              </button>
            </div>
          </div>
        ) : loadingReplies ? (
          <div className="flex justify-center py-12">
            <Loader2 size={22} className="animate-spin text-[#c3c6d6]" />
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-[#1a1c1e]">
              回复（{replies.length}）
            </h3>
            {replies.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#737785]">暂无回复，来做第一条吧</p>
            ) : (
              replies.map((r, idx) => (
                <ReplyItem
                  key={r.id}
                  reply={r}
                  allReplies={replies}
                  topicAuthorId={topic.author_id}
                  currentUser={currentUser}
                  topicId={topic.id}
                  token={token}
                  onDelete={(id) => setReplies((p) => p.filter((x) => x.id !== id))}
                  onQuote={setQuotingReply}
                  presentation="editorial"
                  accentLeft={idx === 0}
                />
              ))
            )}
            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  type="button"
                  onClick={() => loadReplies(true)}
                  className="flex items-center gap-1 text-xs font-bold text-[#0040a1] hover:underline"
                >
                  <ChevronDown size={13} />
                  加载更多回复
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden w-full",
        layout === "fullpage" ? "flex-1 min-h-0 w-full" : "h-full",
      )}
    >
      {/* 顶栏 */}
      <div
        className={cn(
          "flex items-center gap-3 py-3 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10",
          pagePad,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors -ml-2"
        >
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-gray-900 truncate">{topic.title}</p>
          <p className="text-xs text-gray-400">{topic.reply_count} 条回复</p>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={handleDeleteTopic}
            className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* 滚动区 */}
      <div
        className={cn(
          "flex-1 overflow-y-auto",
          layout === "fullpage" && "min-h-0",
        )}
      >
        {/* 话题主体 */}
        <div className={cn(pagePad, "pt-4 pb-4 border-b border-gray-100")}>
          <div className="flex gap-3 mb-3">
            <Avatar username={topic.author_username} avatarUrl={topic.author_avatar_url} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-gray-900 text-[15px]">
                  {topic.author_real_name || topic.author_username}
                </span>
                <span className="text-sm text-gray-400">@{topic.author_username}</span>
                <RoleBadge role={topic.author_role} />
                {topic.is_pinned && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600">
                    <Pin size={9} />置顶
                  </span>
                )}
              </div>
            </div>
          </div>
          <p
            className={cn(
              "font-bold text-gray-900 mb-2 leading-snug",
              layout === "fullpage" ? "text-xl md:text-2xl" : "text-[17px]",
            )}
          >
            {topic.title}
          </p>
          <p
            className={cn(
              "text-gray-700 leading-relaxed whitespace-pre-wrap",
              layout === "fullpage" ? "text-[15px] md:text-base" : "text-[15px]",
            )}
          >
            {topic.content}
          </p>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              <span className="font-bold text-gray-900">{topic.member_count}</span> 位成员
            </span>
            <span className="text-sm text-gray-500">
              <span className="font-bold text-gray-900">{topic.reply_count}</span> 条回复
            </span>
            <span className="text-xs text-gray-400 ml-auto">{timeAgo(topic.created_at)}</span>
          </div>
          {/* 加入/退出 */}
          <div className="mt-4">
            {!joined ? (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
              >
                {joining ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                加入话题
              </button>
            ) : !isAuthor ? (
              <button
                type="button"
                onClick={handleLeave}
                disabled={joining}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500 transition-colors"
              >
                {joining ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                退出话题
              </button>
            ) : null}
          </div>
        </div>

        {/* 回复区 */}
        {!joined ? (
          <div className={cn(pagePad, "py-12 text-center text-sm text-gray-400")}>
            加入话题后即可查看和参与讨论
          </div>
        ) : loadingReplies ? (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-gray-300" />
          </div>
        ) : replies.length === 0 ? (
          <div className={cn(pagePad, "py-12 text-center text-sm text-gray-400")}>
            暂无回复，来发表第一条吧
          </div>
        ) : (
          <div className={pagePad}>
            {replies.map((r) => (
              <ReplyItem
                key={r.id}
                reply={r}
                allReplies={replies}
                topicAuthorId={topic.author_id}
                currentUser={currentUser}
                topicId={topic.id}
                token={token}
                onDelete={(id) => setReplies((p) => p.filter((x) => x.id !== id))}
                onQuote={setQuotingReply}
              />
            ))}
          </div>
        )}

        {hasMore && (
          <div className={cn("flex justify-center py-3", pagePad)}>
            <button
              type="button"
              onClick={() => loadReplies(true)}
              className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"
            >
              <ChevronDown size={13} />加载更多
            </button>
          </div>
        )}
      </div>

      {/* 发表回复 */}
      {joined && (
        <div className={cn("border-t border-gray-100 py-3 bg-white", pagePad)}>
          {quotingReply && (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-2 text-xs text-gray-500">
              <span className="flex items-center gap-1.5 truncate">
                <CornerDownRight size={11} />
                回复 @{quotingReply.author_username}：
                <span className="italic truncate">{quotingReply.content.slice(0, 40)}</span>
              </span>
              <button type="button" onClick={() => setQuotingReply(null)} className="shrink-0 ml-2 font-bold hover:text-gray-900">
                <X size={13} />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmitReply}>
            <div className="flex items-start gap-3">
              <Avatar username={currentUser.username} avatarUrl={currentUser.avatar_url} size="sm" />
              <MentionTextarea
                value={replyContent}
                onChange={setReplyContent}
                onMentionChange={setReplyMentionIds}
                members={members}
                placeholder={`回复，输入 @ 提及成员…`}
                rows={2}
                className="flex-1 min-w-0"
              />
            </div>
            {replyError && <p className="text-xs text-red-500 mt-1">{replyError}</p>}
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <AtSign size={10} /> @ 提及成员
              </span>
              <button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold text-white disabled:opacity-40 transition-opacity"
                style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                回复
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 开设话题 Compose 框（教师专用）
// ---------------------------------------------------------------------------

function ComposeBox({
  currentUser,
  token,
  onCreated,
}: {
  currentUser: UserInfo;
  token: string;
  onCreated: (t: CommunityTopicResponse) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const t = await createStandaloneTopic(token, {
        title: title.trim(),
        content: content.trim(),
        mention_user_ids: [],
      });
      onCreated(t);
      setTitle("");
      setContent("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "开设失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div
        id="community-compose"
        className="mb-10 rounded-xl border border-[#c3c6d6]/25 bg-white p-6 shadow-[0_24px_24px_-12px_rgba(26,28,30,0.06)]"
      >
        <div
          className="flex cursor-pointer items-center gap-4"
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <Avatar username={currentUser.username} avatarUrl={currentUser.avatar_url} size="md" />
          <div className="flex-1 rounded-full bg-[#f3f3f6] px-5 py-3 text-sm text-[#737785] transition-colors hover:bg-[#e8e8ea]">
            开设新话题，分享你的见解…
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95"
            style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="community-compose"
      className="mb-10 rounded-xl border border-[#c3c6d6]/25 bg-white p-6 shadow-[0_24px_24px_-12px_rgba(26,28,30,0.06)]"
    >
      <div className="flex gap-3">
        <Avatar username={currentUser.username} avatarUrl={currentUser.avatar_url} size="md" />
        <form onSubmit={handleSubmit} className="flex-1 space-y-3">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="话题标题（必填）"
            maxLength={200}
            className="w-full border-b border-[#c3c6d6]/30 bg-transparent pb-2 text-lg font-bold text-[#1a1c1e] placeholder:text-[#c3c6d6] focus:outline-none"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="详细描述该话题的讨论方向…"
            rows={4}
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[#424654] placeholder:text-[#737785] focus:outline-none"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center justify-between border-t border-[#c3c6d6]/20 pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !content.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold text-white disabled:opacity-40 transition-opacity"
              style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              开设话题
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 话题 Feed 卡片
// ---------------------------------------------------------------------------

function TopicFeedCard({
  topic,
  isMember,
  currentUser,
  token,
  onJoin,
}: {
  topic: CommunityTopicResponse;
  isMember: boolean;
  currentUser: UserInfo | null;
  token: string | null;
  onJoin: () => void;
}) {
  const [joining, setJoining] = useState(false);

  async function handleJoin(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return;
    setJoining(true);
    try {
      await joinStandaloneTopic(topic.id, token);
      onJoin();
    } catch (err) {
      alert(err instanceof Error ? err.message : "加入失败");
    } finally {
      setJoining(false);
    }
  }

  const detailHref = `/community/${topic.id}`;

  return (
    <article
      className="rounded-xl bg-white p-6 shadow-[0_24px_24px_-12px_rgba(26,28,30,0.06)] transition-all hover:shadow-[0_32px_32px_-16px_rgba(26,28,30,0.1)] md:p-8"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <Link href={detailHref} className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar username={topic.author_username} avatarUrl={topic.author_avatar_url} size="lg" />
          <div className="min-w-0">
            <h4 className="font-bold text-[#1a1c1e]">
              {topic.author_real_name || topic.author_username}
            </h4>
            <span className="text-xs font-bold uppercase tracking-widest text-[#0040a1]">
              @{topic.author_username} · {roleLabelEnStyle(topic.author_role)}
            </span>
          </div>
        </Link>
        <div className="shrink-0">
          {currentUser ? (
            isMember ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0040a1]/25 bg-[#dae2ff]/40 px-5 py-2 text-xs font-bold text-[#0040a1]">
                <Users size={14} />
                已加入
              </span>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="rounded-full px-8 py-2.5 text-sm font-bold tracking-wide text-white transition active:scale-95"
                style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
              >
                {joining ? <Loader2 size={14} className="animate-spin" /> : "加入"}
              </button>
            )
          ) : (
            <Link
              href="/login"
              className="inline-flex rounded-full px-8 py-2.5 text-sm font-bold tracking-wide text-white transition active:scale-95"
              style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
            >
              登录加入
            </Link>
          )}
        </div>
      </div>

      <Link href={detailHref} className="group block">
        <h2 className="mb-3 text-xl font-bold text-[#1a1c1e] transition group-hover:text-[#0056d2] md:text-2xl">
          {topic.title}
        </h2>
        <p className="mb-6 line-clamp-3 text-sm leading-relaxed text-[#424654] md:text-base">
          {topic.content}
        </p>
      </Link>

      <div className="flex flex-wrap items-center gap-6 border-t border-[#c3c6d6]/15 pt-6">
        <div className="flex items-center gap-2 text-sm text-[#424654]">
          <MessageCircle className="text-lg" size={18} />
          {topic.reply_count} 条回复
        </div>
        <div className="flex items-center gap-2 text-sm text-[#424654]">
          <Users className="text-lg" size={18} />
          {topic.member_count} 位成员
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {topic.is_pinned && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-700">
              置顶
            </span>
          )}
          {topic.reply_count === 0 && !topic.is_pinned && (
            <span className="rounded-full bg-[#872200]/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#872200]">
              新话题
            </span>
          )}
          <span className="text-xs text-[#737785]">{timeAgo(topic.created_at)}</span>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export default function CommunityPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mounted, setMounted] = useState(false);

  const [topics, setTopics] = useState<CommunityTopicResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<StandaloneTopicCursor | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [feedTab, setFeedTab] = useState<"all" | "joined">("all");

  useEffect(() => {
    const t = getToken();
    const u = getUser();
    setToken(t);
    setUser(u);
    setMounted(true);
    setJoinedIds(readStoredJoinedTopicIds());
  }, []);

  useEffect(() => {
    if (!user) setFeedTab("all");
  }, [user]);

  const topicIdsKey = useMemo(() => topics.map((t) => t.id).join(","), [topics]);

  useEffect(() => {
    if (!token || !user?.id || topics.length === 0) return;
    const uid = user.id;
    let cancelled = false;
    void (async () => {
      const results = await Promise.all(
        topics.map(async (t) => {
          try {
            const isIn = await resolveStandaloneTopicMembership(t.id, token, uid);
            return { id: t.id, isIn } as const;
          } catch {
            return { id: t.id, isIn: null } as const;
          }
        }),
      );
      if (cancelled) return;
      setJoinedIds((prev) => {
        const next = new Set(prev);
        for (const r of results) {
          if (r.isIn === true) next.add(r.id);
          if (r.isIn === false) next.delete(r.id);
        }
        writeStoredJoinedTopicIds(next);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.id, topicIdsKey]);

  const displayTopics =
    feedTab === "joined" ? topics.filter((t) => joinedIds.has(t.id)) : topics;

  const loadTopics = useCallback(
    async (more = false) => {
      if (!token) { setLoading(false); return; }
      if (more) setLoadingMore(true);
      else setLoading(true);
      try {
        const data = await fetchStandaloneTopics(token, {
          pageSize: 20,
          cursor: more && nextCursor ? nextCursor : undefined,
        });
        setTopics((p) => (more ? [...p, ...data.items] : data.items));
        setHasMore(data.has_more);
        setNextCursor(data.next_cursor);
      } catch { /* ignore */ }
      finally { setLoading(false); setLoadingMore(false); }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token],
  );

  useEffect(() => { void loadTopics(); }, [loadTopics]);

  function handleJoined(topicId: string) {
    addStoredJoinedTopicId(topicId);
    setJoinedIds((p) => new Set([...p, topicId]));
    setTopics((p) =>
      p.map((t) => (t.id === topicId ? { ...t, member_count: t.member_count + 1 } : t)),
    );
  }

  const isTeacher = userHasAnyRole(user?.role, "teacher", "admin");

  function scrollToCompose() {
    document.getElementById("community-compose")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="min-h-screen">
      <AppSiteHeader
        active="community"
        layoutSpacer={false}
        primaryAction={
          mounted && isTeacher ? (
            <button
              type="button"
              onClick={scrollToCompose}
              className="rounded-full px-5 py-2 text-sm font-bold tracking-wide text-white transition active:scale-95 md:px-6"
              style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
            >
              发布话题
            </button>
          ) : undefined
        }
      />

      <div className="flex pt-20">
        {!mounted ? (
          <>
            <aside className="fixed left-0 top-20 z-40 hidden h-[calc(100dvh-5rem)] w-72 flex-col bg-[#f3f3f6] lg:flex" />
            <main className="ml-0 w-full flex-1 lg:ml-72">
              <div className="flex justify-center gap-12 px-6 py-10 lg:px-12 lg:py-12">
                <div className="max-w-4xl flex-1 space-y-6">
                  <div className="mb-10 h-36 animate-pulse rounded-xl bg-[#e8e8ea]/80" />
                  <div className="h-64 animate-pulse rounded-xl bg-white/80 shadow-lg" />
                </div>
              </div>
            </main>
          </>
        ) : (
          <>
        <aside className="fixed left-0 top-20 z-40 hidden h-[calc(100dvh-5rem)] w-72 flex-col bg-[#f3f3f6] lg:flex">
          <div className="px-8 pt-6">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl font-black text-white">
                <span className="flex h-full w-full items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}>
                  微
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-[#0040a1]">学习空间</h3>
                <p className="text-xs text-[#737785]">微课讨论广场</p>
              </div>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            <Link
              href="/community"
              className="ml-4 flex translate-x-1 items-center gap-4 rounded-l-full bg-white py-3 pl-4 font-semibold text-[#0056d2]"
            >
              <MessageSquare size={22} strokeWidth={2} />
              <span>讨论广场</span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-4 py-3 pl-8 text-[#424654] transition-colors hover:rounded-l-full hover:bg-[#e2e2e5]"
            >
              <Home size={22} />
              <span>全部课程</span>
            </Link>
            <Link
              href="/my-learning"
              className="flex items-center gap-4 py-3 pl-8 text-[#424654] transition-colors hover:rounded-l-full hover:bg-[#e2e2e5]"
            >
              <Library size={22} />
              <span>我的学习</span>
            </Link>
            {isTeacher && (
              <Link
                href="/teacher"
                className="flex items-center gap-4 py-3 pl-8 text-[#424654] transition-colors hover:rounded-l-full hover:bg-[#e2e2e5]"
              >
                <Microscope size={22} />
                <span>讲师工作台</span>
              </Link>
            )}
            <Link
              href="/"
              className="flex items-center gap-4 py-3 pl-8 text-[#424654] transition-colors hover:rounded-l-full hover:bg-[#e2e2e5]"
            >
              <Brain size={22} />
              <span>探索微课</span>
            </Link>
          </nav>
          <div className="p-8">
            <Link
              href="/"
              className="block w-full rounded-xl border border-[#0040a1] py-3 text-center text-sm font-bold text-[#0040a1] transition-colors hover:bg-[#0040a1]/5"
            >
              浏览精品课程
            </Link>
          </div>
          <div className="mt-auto space-y-1 border-t border-[#c3c6d6]/15 p-4">
            <Link
              href="/"
              className="flex items-center gap-4 py-2 pl-8 text-sm text-[#424654] transition-colors hover:text-[#0040a1]"
            >
              <Settings size={18} />
              设置
            </Link>
            <span className="flex cursor-default items-center gap-4 py-2 pl-8 text-sm text-[#424654]">
              <HelpCircle size={18} />
              帮助与支持
            </span>
          </div>
        </aside>

        <main className="relative ml-0 w-full flex-1 lg:ml-72">
          <div className="flex flex-col gap-10 px-4 py-8 xl:flex-row xl:gap-12 xl:px-12 xl:py-12">
            <div className="max-w-4xl flex-1">
              <div className="mb-10">
                <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-[#1a1c1e] md:text-4xl">
                  学习社区
                </h1>
                <div className="flex gap-8 border-b border-[#c3c6d6]/20">
                  <button
                    type="button"
                    onClick={() => setFeedTab("all")}
                    className={cn(
                      "pb-4 text-lg transition-colors",
                      feedTab === "all"
                        ? "border-b-2 border-[#0040a1] font-bold text-[#0040a1]"
                        : "text-[#737785] hover:text-[#1a1c1e]",
                    )}
                  >
                    全部话题
                  </button>
                  {mounted && user && (
                    <button
                      type="button"
                      onClick={() => setFeedTab("joined")}
                      className={cn(
                        "pb-4 text-lg transition-colors",
                        feedTab === "joined"
                          ? "border-b-2 border-[#0040a1] font-bold text-[#0040a1]"
                          : "text-[#737785] hover:text-[#1a1c1e]",
                      )}
                    >
                      已加入
                    </button>
                  )}
                </div>
              </div>

              {mounted && user && isTeacher && (
                <ComposeBox
                  currentUser={user}
                  token={token!}
                  onCreated={(t) => {
                    setTopics((p) => [t, ...p]);
                    router.push(`/community/${t.id}`);
                  }}
                />
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 size={24} className="animate-spin text-[#c3c6d6]" />
                  <p className="text-sm text-[#737785]">加载中…</p>
                </div>
              ) : !token && mounted ? (
                <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
                  <div
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white"
                    style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
                  >
                    <Hash size={28} />
                  </div>
                  <h2 className="mb-2 text-xl font-extrabold text-[#1a1c1e]">加入学习社区</h2>
                  <p className="mb-6 max-w-xs text-sm leading-relaxed text-[#424654]">
                    与数千位学员和讲师在话题中深度交流，共同成长。
                  </p>
                  <Link
                    href="/login"
                    className="rounded-full px-8 py-3 font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #0056d2 100%)` }}
                  >
                    立即登录
                  </Link>
                </div>
              ) : topics.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
                  <Hash size={32} className="mb-3 text-[#e2e2e5]" />
                  <p className="text-sm font-bold text-[#424654]">还没有话题</p>
                  {isTeacher && (
                    <p className="mt-1 text-xs text-[#737785]">点击上方发布话题或展开编辑器开设第一个话题</p>
                  )}
                </div>
              ) : displayTopics.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
                  <Users size={32} className="mb-3 text-[#e2e2e5]" />
                  <p className="text-sm font-bold text-[#424654]">还没有已加入的话题</p>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#737785]">
                    在「全部话题」中加入讨论后，会出现在这里。若已在其它页面加入，可先切回「全部话题」并加载更多以同步成员状态。
                  </p>
                  <button
                    type="button"
                    onClick={() => setFeedTab("all")}
                    className="mt-4 text-sm font-bold text-[#0056d2] hover:underline"
                  >
                    前往全部话题
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {displayTopics.map((topic) => (
                    <TopicFeedCard
                      key={topic.id}
                      topic={topic}
                      isMember={joinedIds.has(topic.id)}
                      currentUser={user}
                      token={token}
                      onJoin={() => handleJoined(topic.id)}
                    />
                  ))}
                  {feedTab === "all" && hasMore && (
                    <div className="flex justify-center py-6">
                      <button
                        type="button"
                        onClick={() => loadTopics(true)}
                        disabled={loadingMore}
                        className="flex items-center gap-2 rounded-full border border-[#c3c6d6]/40 px-5 py-2 text-sm font-bold text-[#424654] transition-colors hover:bg-[#f3f3f6]"
                      >
                        {loadingMore ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                        加载更多
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="hidden w-full shrink-0 flex-col gap-8 xl:flex xl:w-80">
              <section className="rounded-xl bg-[#f3f3f6] p-8">
                <h3 className="mb-6 text-xl font-extrabold text-[#1a1c1e]">关于社区</h3>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#0040a1]" strokeWidth={2} />
                    <p className="text-sm leading-relaxed text-[#424654]">
                      获取讲师与研究伙伴的实时反馈，围绕微课与项目深化讨论。
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <Share2 className="mt-0.5 size-5 shrink-0 text-[#0040a1]" strokeWidth={2} />
                    <p className="text-sm leading-relaxed text-[#424654]">
                      与大量学员和讲师建立专业联系，在话题中沉淀可复用的经验。
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <BookOpen className="mt-0.5 size-5 shrink-0 text-[#0040a1]" strokeWidth={2} />
                    <p className="text-sm leading-relaxed text-[#424654]">
                      结合平台微课与社区讨论，把理论学习与动手实践连接起来。
                    </p>
                  </li>
                  {isTeacher && (
                    <li className="flex gap-3">
                      <Sparkles className="mt-0.5 size-5 shrink-0 text-[#0040a1]" strokeWidth={2} />
                      <p className="text-sm leading-relaxed text-[#424654]">
                        讲师与管理员可发布话题，发起班级或公开讨论。
                      </p>
                    </li>
                  )}
                </ul>
              </section>

              {topics.length > 0 && (
                <section className="rounded-xl bg-white p-8 shadow-[0_24px_24px_-12px_rgba(26,28,30,0.06)]">
                  <h3 className="mb-6 text-xl font-extrabold text-[#1a1c1e]">话题概览</h3>
                  <div className="flex flex-wrap gap-2">
                    {topics.slice(0, 8).map((t) => (
                      <Link
                        key={t.id}
                        href={`/community/${t.id}`}
                        className="rounded-full bg-[#e2e2e5] px-4 py-2 text-xs font-bold text-[#424654] transition-colors hover:bg-[#0040a1] hover:text-white"
                      >
                        {t.title.length > 18 ? `${t.title.slice(0, 18)}…` : t.title}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <section className="relative flex h-64 flex-col justify-end overflow-hidden rounded-xl bg-[#0056d2] p-8 text-white">
                <div
                  className="pointer-events-none absolute inset-0 opacity-90"
                  style={{
                    background:
                      "linear-gradient(135deg, #0040a1 0%, #0056d2 45%, #001847 100%)",
                  }}
                />
                <div className="relative z-10">
                  <h3 className="mb-2 text-2xl font-black tracking-tight">同步提升技能</h3>
                  <p className="mb-6 text-sm text-white/85">
                    浏览最新的专业微课，将讨论中的问题转化为可练习的能力。
                  </p>
                  <Link
                    href="/"
                    className="block w-full rounded-full bg-white py-3 text-center text-sm font-bold text-[#0040a1] transition-colors hover:bg-blue-50"
                  >
                    浏览课程
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        </main>
          </>
        )}
      </div>
    </div>
  );
}
