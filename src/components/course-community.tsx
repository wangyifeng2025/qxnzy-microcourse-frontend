"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  ChevronLeft,
  AtSign,
  Pin,
  Loader2,
  CornerDownRight,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getToken, getUser, type UserInfo } from "@/lib/auth";
import {
  fetchTopics,
  fetchReplies,
  createTopic,
  createReply,
  deleteTopic,
  deleteReply,
  fetchCommunityMembers,
  type CourseTopicResponse,
  type CourseTopicReplyResponse,
  type CourseMember,
  type TopicCursor,
} from "@/lib/community";

// ---------------------------------------------------------------------------
// 辅助：角色标签
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: string }) {
  if (role === "teacher") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0040a1]/10 text-[#0040a1] uppercase tracking-wide shrink-0">
        <ShieldCheck size={10} />
        讲师
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#872200]/10 text-[#872200] uppercase tracking-wide shrink-0">
        <ShieldCheck size={10} />
        管理员
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#424654]/10 text-[#424654] uppercase tracking-wide shrink-0">
      <GraduationCap size={10} />
      学员
    </span>
  );
}

// ---------------------------------------------------------------------------
// 辅助：用户头像
// ---------------------------------------------------------------------------

function Avatar({
  username,
  avatarUrl,
  size = "sm",
}: {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "md" ? "w-9 h-9 text-sm" : "w-7 h-7 text-xs";
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={username}
        className={cn("rounded-full object-cover shrink-0 border border-[#e2e2e5]", dim)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full shrink-0 bg-[#0040a1]/10 text-[#0040a1] font-bold flex items-center justify-center border border-[#0040a1]/15",
        dim,
      )}
    >
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 辅助：时间格式化
// ---------------------------------------------------------------------------

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
}

// ---------------------------------------------------------------------------
// @提及选择器
// ---------------------------------------------------------------------------

function MentionPicker({
  members,
  query,
  onSelect,
  anchorRef,
}: {
  members: CourseMember[];
  query: string;
  onSelect: (m: CourseMember) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const filtered = members.filter(
    (m) =>
      m.username.toLowerCase().includes(query.toLowerCase()) ||
      (m.real_name ?? "").toLowerCase().includes(query.toLowerCase()),
  );
  if (!filtered.length) return null;

  // 用 fixed + 纯视口坐标，避免与 relative 容器的坐标体系冲突
  const rect = anchorRef.current?.getBoundingClientRect();
  const top = rect ? rect.bottom + 4 : 0;
  const left = rect ? rect.left : 0;

  return (
    <div
      style={{ top, left, minWidth: 220, zIndex: 9999, position: "fixed" }}
      className="bg-white border border-[#c3c6d6]/40 rounded-xl shadow-xl overflow-hidden"
    >
      {filtered.slice(0, 6).map((m) => (
        <button
          key={m.user_id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(m);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#f3f3f6] transition-colors text-left"
        >
          <Avatar username={m.username} avatarUrl={m.avatar_url} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1a1c1e] truncate">
              {m.real_name || m.username}
            </p>
            <p className="text-[10px] text-[#737785] truncate">@{m.username}</p>
          </div>
          <RoleBadge role={m.role} />
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 带 @提及功能的文本域
// ---------------------------------------------------------------------------

function MentionTextarea({
  value,
  onChange,
  onMentionChange,
  members,
  placeholder,
  rows = 3,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  onMentionChange: (ids: string[]) => void;
  members: CourseMember[];
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    onChange(v);

    const cursor = e.target.selectionStart;
    const textUpToCursor = v.slice(0, cursor);
    const match = textUpToCursor.match(/@(\w*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") setMentionQuery(null);
  }

  function handleSelectMember(m: CourseMember) {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const textBefore = value.slice(0, cursor);
    const atIdx = textBefore.lastIndexOf("@");
    const newText =
      value.slice(0, atIdx) + `@${m.username} ` + value.slice(cursor);
    onChange(newText);
    const newIds = mentionedIds.includes(m.user_id)
      ? mentionedIds
      : [...mentionedIds, m.user_id];
    setMentionedIds(newIds);
    onMentionChange(newIds);
    setMentionQuery(null);
    setTimeout(() => {
      if (!ta) return;
      const pos = atIdx + m.username.length + 2;
      ta.setSelectionRange(pos, pos);
      ta.focus();
    }, 0);
  }

  // className 传给外层 div（处理 flex-1 等布局类），内层 textarea 始终 w-full
  return (
    <div className={cn("relative", className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-xl border border-[#c3c6d6]/40 bg-white px-4 py-3 text-sm text-[#1a1c1e] placeholder:text-[#737785] focus:outline-none focus:ring-2 focus:ring-[#0040a1]/30 focus:border-[#0040a1]/40 transition-all"
      />
      {mentionQuery !== null && (
        <MentionPicker
          members={members}
          query={mentionQuery}
          onSelect={handleSelectMember}
          anchorRef={textareaRef}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 回复卡片
// ---------------------------------------------------------------------------

function ReplyCard({
  reply,
  allReplies,
  currentUserId,
  currentUserRole,
  courseTeacherId,
  onDelete,
  onQuote,
}: {
  reply: CourseTopicReplyResponse;
  allReplies: CourseTopicReplyResponse[];
  currentUserId: string | null;
  currentUserRole: string | null;
  courseTeacherId: string;
  onDelete: (replyId: string) => void;
  onQuote: (reply: CourseTopicReplyResponse) => void;
}) {
  const canDelete =
    currentUserId === reply.author_id ||
    currentUserRole === "admin" ||
    currentUserId === courseTeacherId;

  const quotedReply = reply.reply_to_reply_id
    ? allReplies.find((r) => r.id === reply.reply_to_reply_id)
    : null;

  return (
    <div className="flex gap-3 group">
      <Avatar
        username={reply.author_username}
        avatarUrl={reply.author_avatar_url}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="text-sm font-bold text-[#1a1c1e]">
            {reply.author_real_name || reply.author_username}
          </span>
          <RoleBadge role={reply.author_role} />
          <span className="text-[11px] text-[#737785] ml-auto">{timeAgo(reply.created_at)}</span>
        </div>
        {quotedReply && (
          <div className="mb-2 pl-3 border-l-2 border-[#c3c6d6]/60 text-[11px] text-[#737785] italic truncate">
            <CornerDownRight size={10} className="inline mr-1" />
            回复 @{quotedReply.author_username}：{quotedReply.content.slice(0, 60)}
            {quotedReply.content.length > 60 ? "…" : ""}
          </div>
        )}
        <p className="text-sm text-[#424654] leading-relaxed whitespace-pre-wrap wrap-break-word">
          {reply.content}
        </p>
        <div className="flex items-center gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onQuote(reply)}
            className="text-[11px] text-[#0040a1] font-bold hover:underline flex items-center gap-1"
          >
            <CornerDownRight size={11} />
            回复
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(reply.id)}
              className="text-[11px] text-[#737785] hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={11} />
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 话题详情视图
// ---------------------------------------------------------------------------

function TopicDetailView({
  courseId,
  topic,
  courseTeacherId,
  token,
  user,
  onBack,
  onTopicDeleted,
}: {
  courseId: string;
  topic: CourseTopicResponse;
  courseTeacherId: string;
  token: string;
  user: UserInfo;
  onBack: () => void;
  onTopicDeleted: (topicId: string) => void;
}) {
  const [replies, setReplies] = useState<CourseTopicReplyResponse[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [nextCursorAt, setNextCursorAt] = useState<string | null>(null);
  const [nextCursorId, setNextCursorId] = useState<string | null>(null);
  const [members, setMembers] = useState<CourseMember[]>([]);

  const [replyContent, setReplyContent] = useState("");
  const [replyMentionIds, setReplyMentionIds] = useState<string[]>([]);
  const [quotingReply, setQuotingReply] = useState<CourseTopicReplyResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState("");

  const canDeleteTopic =
    user?.id === topic.author_id ||
    user?.role === "admin" ||
    user?.id === courseTeacherId;

  const loadReplies = useCallback(
    async (loadMore = false) => {
      if (!token) return;
      setLoadingReplies(!loadMore);
      try {
        const data = await fetchReplies(courseId, topic.id, token, {
          pageSize: 50,
          ...(loadMore && nextCursorAt && nextCursorId
            ? { cursorCreatedAt: nextCursorAt, cursorId: nextCursorId }
            : {}),
        });
        setReplies((prev) => (loadMore ? [...prev, ...data.items] : data.items));
        setHasMore(data.has_more);
        setNextCursorAt(data.next_cursor_created_at);
        setNextCursorId(data.next_cursor_id);
      } catch {
        // silently ignore
      } finally {
        setLoadingReplies(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [courseId, topic.id, token],
  );

  useEffect(() => {
    void loadReplies();
    if (token) {
      fetchCommunityMembers(courseId, token)
        .then(setMembers)
        .catch(() => {});
    }
  }, [courseId, token, loadReplies]);

  async function handleDeleteTopic() {
    if (!token || !confirm("确定删除该话题？删除后无法恢复，所有回复也将一并删除。")) return;
    try {
      await deleteTopic(courseId, topic.id, token);
      onTopicDeleted(topic.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function handleDeleteReply(replyId: string) {
    if (!token || !confirm("确定删除该回复？")) return;
    try {
      await deleteReply(courseId, topic.id, replyId, token);
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除回复失败");
    }
  }

  async function handleSubmitReply(e: FormEvent) {
    e.preventDefault();
    if (!token || !replyContent.trim()) return;
    setSubmitting(true);
    setReplyError("");
    try {
      const newReply = await createReply(courseId, topic.id, token, {
        content: replyContent.trim(),
        reply_to_reply_id: quotingReply?.id ?? null,
        mention_user_ids: replyMentionIds,
      });
      setReplies((prev) => [...prev, newReply]);
      setReplyContent("");
      setReplyMentionIds([]);
      setQuotingReply(null);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "发布回复失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 返回 */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-[#424654] hover:text-[#0040a1] transition-colors font-medium"
      >
        <ChevronLeft size={16} />
        返回话题列表
      </button>

      {/* 话题主体 */}
      <div className="bg-white rounded-2xl border border-[#c3c6d6]/20 shadow-sm p-6 md:p-8 space-y-5">
        <div className="flex items-start gap-3">
          <Avatar
            username={topic.author_username}
            avatarUrl={topic.author_avatar_url}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-bold text-[#1a1c1e]">
                {topic.author_real_name || topic.author_username}
              </span>
              <RoleBadge role={topic.author_role} />
              {topic.is_pinned && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 uppercase tracking-wide">
                  <Pin size={10} />
                  置顶
                </span>
              )}
              <span className="text-[11px] text-[#737785] ml-auto">{timeAgo(topic.created_at)}</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-[#1a1c1e] mt-2">{topic.title}</h2>
          </div>
        </div>
        <p className="text-[#424654] leading-relaxed whitespace-pre-wrap wrap-break-word text-sm md:text-base">
          {topic.content}
        </p>
        {canDeleteTopic && (
          <div className="flex justify-end pt-2 border-t border-[#f3f3f6]">
            <button
              type="button"
              onClick={handleDeleteTopic}
              className="flex items-center gap-1.5 text-xs text-[#737785] hover:text-red-500 transition-colors font-medium"
            >
              <Trash2 size={13} />
              删除话题
            </button>
          </div>
        )}
      </div>

      {/* 回复列表 */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-1 mb-3">
          <MessageSquare size={15} className="text-[#424654]" />
          <span className="text-sm font-bold text-[#424654]">
            {topic.reply_count} 条回复
          </span>
        </div>

        {loadingReplies ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#0040a1]/50" />
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center py-10 text-sm text-[#737785]">
            暂无回复，来发表第一条回复吧
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#c3c6d6]/20 shadow-sm divide-y divide-[#f3f3f6]">
            {replies.map((r) => (
              <div key={r.id} className="px-5 py-4">
                <ReplyCard
                  reply={r}
                  allReplies={replies}
                  currentUserId={user?.id ?? null}
                  currentUserRole={user?.role ?? null}
                  courseTeacherId={courseTeacherId}
                  onDelete={handleDeleteReply}
                  onQuote={setQuotingReply}
                />
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadReplies(true)}
              className="rounded-full border-[#c3c6d6] text-[#424654] text-xs gap-1"
            >
              <ChevronDown size={13} />
              加载更多回复
            </Button>
          </div>
        )}
      </div>

      {/* 发表回复 */}
      {token && user ? (
        <div className="bg-white rounded-2xl border border-[#c3c6d6]/20 shadow-sm p-5 space-y-4">
          {quotingReply && (
            <div className="flex items-center justify-between bg-[#f3f3f6] rounded-lg px-3 py-2 text-xs text-[#737785]">
              <span className="flex items-center gap-1.5 truncate">
                <CornerDownRight size={12} />
                回复 @{quotingReply.author_username}：
                <span className="italic truncate">{quotingReply.content.slice(0, 50)}</span>
              </span>
              <button
                type="button"
                onClick={() => setQuotingReply(null)}
                className="shrink-0 ml-2 text-[#737785] hover:text-[#1a1c1e] font-bold"
              >
                ✕
              </button>
            </div>
          )}
          <form onSubmit={handleSubmitReply} className="space-y-3">
            <div className="flex items-start gap-3">
              <Avatar
                username={user.username}
                avatarUrl={user.avatar_url}
                size="sm"
              />
              <MentionTextarea
                value={replyContent}
                onChange={setReplyContent}
                onMentionChange={setReplyMentionIds}
                members={members}
                placeholder={`发表回复，输入 @ 可提及课程成员…`}
                rows={3}
                className="flex-1"
              />
            </div>
            {replyError && (
              <p className="text-xs text-red-500">{replyError}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#737785] flex items-center gap-1">
                <AtSign size={11} />
                输入 @ 可提及他人
              </span>
              <Button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                size="sm"
                className="rounded-full bg-[#0040a1] hover:bg-[#0033a0] text-white gap-1.5 px-4"
              >
                {submitting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                发表回复
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-[#737785] bg-[#f9f9fc] rounded-xl border border-dashed border-[#c3c6d6]/50">
          请登录后参与讨论
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 话题卡片（列表中的单条）
// ---------------------------------------------------------------------------

function TopicCard({
  topic,
  onClick,
  currentUserId,
  currentUserRole,
  courseTeacherId,
  onDelete,
}: {
  topic: CourseTopicResponse;
  onClick: () => void;
  currentUserId: string | null;
  currentUserRole: string | null;
  courseTeacherId: string;
  onDelete: (topicId: string) => void;
}) {
  const canDelete =
    currentUserId === topic.author_id ||
    currentUserRole === "admin" ||
    currentUserId === courseTeacherId;

  return (
    <div className="group bg-white rounded-xl border border-[#c3c6d6]/20 hover:border-[#0040a1]/20 hover:shadow-md transition-all p-4 md:p-5">
      <div className="flex items-start gap-3">
        <Avatar
          username={topic.author_username}
          avatarUrl={topic.author_avatar_url}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className="text-xs font-bold text-[#1a1c1e]">
              {topic.author_real_name || topic.author_username}
            </span>
            <RoleBadge role={topic.author_role} />
            {topic.is_pinned && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600">
                <Pin size={10} />
                置顶
              </span>
            )}
            <span className="text-[10px] text-[#737785] ml-auto">
              {timeAgo(topic.created_at)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClick}
            className="text-left w-full"
          >
            <h3 className="font-bold text-[#1a1c1e] group-hover:text-[#0040a1] transition-colors text-sm md:text-base leading-snug mb-1">
              {topic.title}
            </h3>
            <p className="text-xs text-[#737785] line-clamp-2 leading-relaxed">
              {topic.content}
            </p>
          </button>
          <div className="flex items-center justify-between mt-3">
            <button
              type="button"
              onClick={onClick}
              className="flex items-center gap-1.5 text-xs text-[#737785] hover:text-[#0040a1] transition-colors"
            >
              <MessageSquare size={12} />
              {topic.reply_count} 条回复
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(topic.id);
                }}
                className="text-[11px] text-[#c3c6d6] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1"
              >
                <Trash2 size={11} />
                删除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 发布话题表单
// ---------------------------------------------------------------------------

function CreateTopicForm({
  courseId,
  token,
  members,
  onCreated,
  onCancel,
}: {
  courseId: string;
  token: string;
  members: CourseMember[];
  onCreated: (topic: CourseTopicResponse) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !title.trim() || !content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const topic = await createTopic(courseId, token, {
        title: title.trim(),
        content: content.trim(),
        mention_user_ids: mentionIds,
      });
      onCreated(topic);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#c3c6d6]/20 shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#1a1c1e] flex items-center gap-2">
          <BookOpen size={16} className="text-[#0040a1]" />
          发布新话题
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-[#737785] hover:text-[#1a1c1e] transition-colors"
        >
          取消
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="话题标题（必填）"
            maxLength={200}
            className="w-full rounded-xl border border-[#c3c6d6]/40 bg-white px-4 py-3 text-sm text-[#1a1c1e] placeholder:text-[#737785] focus:outline-none focus:ring-2 focus:ring-[#0040a1]/30 focus:border-[#0040a1]/40 transition-all font-bold"
          />
        </div>
        <MentionTextarea
          value={content}
          onChange={setContent}
          onMentionChange={setMentionIds}
          members={members}
          placeholder="详细描述你的问题或想法，输入 @ 可提及课程成员…"
          rows={5}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#737785] flex items-center gap-1">
            <AtSign size={11} />
            输入 @ 提及学员或讲师
          </span>
          <Button
            type="submit"
            disabled={submitting || !title.trim() || !content.trim()}
            className="rounded-full bg-[#0040a1] hover:bg-[#0033a0] text-white gap-1.5 px-5"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            发布话题
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 主组件：CourseCommunity
// ---------------------------------------------------------------------------

export default function CourseCommunity({
  courseId,
  courseTeacherId,
}: {
  courseId: string;
  courseTeacherId: string;
}) {
  // 延迟到 useEffect 读取 localStorage，保证 SSR 与客户端初始渲染一致（均为 null）
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);

  const [topics, setTopics] = useState<CourseTopicResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<TopicCursor | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [members, setMembers] = useState<CourseMember[]>([]);
  const [activeTopic, setActiveTopic] = useState<CourseTopicResponse | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [accessDenied, setAccessDenied] = useState(false);

  // 挂载后读取 auth（仅在客户端执行）
  useEffect(() => {
    setToken(getToken());
    setUser(getUser());
  }, []);

  const loadTopics = useCallback(
    async (loadMore = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (loadMore) setLoadingMore(true);
      else setLoading(true);
      try {
        const data = await fetchTopics(courseId, token, {
          pageSize: 20,
          cursor: loadMore && nextCursor ? nextCursor : undefined,
        });
        setTopics((prev) => (loadMore ? [...prev, ...data.items] : data.items));
        setHasMore(data.has_more);
        setNextCursor(data.next_cursor);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("403") || msg.includes("仅")) {
          setAccessDenied(true);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [courseId, token],
  );

  useEffect(() => {
    void loadTopics();
    if (token) {
      fetchCommunityMembers(courseId, token)
        .then(setMembers)
        .catch(() => {});
    }
  }, [courseId, token, loadTopics]);

  async function handleDeleteTopic(topicId: string) {
    if (!token || !confirm("确定删除该话题？")) return;
    try {
      await deleteTopic(courseId, topicId, token);
      setTopics((prev) => prev.filter((t) => t.id !== topicId));
      if (activeTopic?.id === topicId) setActiveTopic(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  }

  // 初始加载中（等待 useEffect 确定 auth 状态）
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={22} className="animate-spin text-[#0040a1]/50" />
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="rounded-2xl border border-dashed border-[#c3c6d6]/50 py-12 text-center bg-[#f9f9fc]">
        <MessageSquare size={32} className="mx-auto text-[#c3c6d6] mb-3" />
        <p className="text-sm text-[#737785] font-medium">登录后即可参与学习社区</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="rounded-2xl border border-dashed border-[#c3c6d6]/50 py-12 text-center bg-[#f9f9fc]">
        <MessageSquare size={32} className="mx-auto text-[#c3c6d6] mb-3" />
        <p className="text-sm text-[#737785] font-medium">选课后即可参与学习社区</p>
        <p className="text-xs text-[#737785] mt-1">只有课程教师和已选课学员可以访问社区</p>
      </div>
    );
  }

  // 话题详情视图
  if (activeTopic) {
    return (
      <TopicDetailView
        courseId={courseId}
        topic={activeTopic}
        courseTeacherId={courseTeacherId}
        token={token}
        user={user}
        onBack={() => setActiveTopic(null)}
        onTopicDeleted={(id) => {
          setTopics((prev) => prev.filter((t) => t.id !== id));
          setActiveTopic(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#424654]">
          <MessageSquare size={15} />
          <span className="font-bold">{topics.length} 个话题</span>
        </div>
        {!showCreateForm && (
          <Button
            onClick={() => setShowCreateForm(true)}
            size="sm"
            className="rounded-full bg-[#0040a1] hover:bg-[#0033a0] text-white gap-1.5 text-xs px-4"
          >
            <Plus size={13} />
            发布话题
          </Button>
        )}
      </div>

      {/* 发布话题表单 */}
      {showCreateForm && (
        <CreateTopicForm
          courseId={courseId}
          token={token}
          members={members}
          onCreated={(topic) => {
            setTopics((prev) => [topic, ...prev]);
            setShowCreateForm(false);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* 话题列表 */}
      {topics.length === 0 && !showCreateForm ? (
        <div className="rounded-2xl border border-dashed border-[#c3c6d6]/50 py-14 text-center bg-[#f9f9fc]">
          <MessageSquare size={36} className="mx-auto text-[#c3c6d6] mb-3" />
          <p className="text-sm font-bold text-[#424654]">还没有话题</p>
          <p className="text-xs text-[#737785] mt-1">抢先发表第一个话题，与大家一起交流吧</p>
          <Button
            onClick={() => setShowCreateForm(true)}
            size="sm"
            className="mt-4 rounded-full bg-[#0040a1] hover:bg-[#0033a0] text-white gap-1.5 text-xs px-4"
          >
            <Plus size={13} />
            发布话题
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              onClick={() => setActiveTopic(topic)}
              currentUserId={user.id ?? null}
              currentUserRole={user.role}
              courseTeacherId={courseTeacherId}
              onDelete={handleDeleteTopic}
            />
          ))}
        </div>
      )}

      {/* 加载更多 */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTopics(true)}
            disabled={loadingMore}
            className="rounded-full border-[#c3c6d6] text-[#424654] text-xs gap-1"
          >
            {loadingMore ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <ChevronDown size={13} />
            )}
            加载更多话题
          </Button>
        </div>
      )}
    </div>
  );
}
