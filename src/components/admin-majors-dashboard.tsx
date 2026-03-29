"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Search,
  PlusCircle,
  BarChart3,
  Star,
  Sparkles,
  Filter,
  ArrowUpDown,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { getUser, getToken, logout, type UserInfo } from "@/lib/auth";
import AdminShell from "@/components/admin-shell";
import {
  fetchMajorsList,
  createMajor,
  updateMajor,
  deleteMajor,
  type MajorListItem,
} from "@/lib/majors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** 表格行，与接口 MajorListItem 一致 */
export type AdminMajorRow = MajorListItem;

const majorColumnHelper = createColumnHelper<AdminMajorRow>();

const emptyCreateForm = () => ({
  name: "",
  code: "",
  description: "",
  sort_order: 0,
});

export default function AdminMajorsDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [majors, setMajors] = useState<AdminMajorRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<{
    created_at: string;
    id: string;
  } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingMajor, setEditingMajor] = useState<AdminMajorRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    sort_order: 0,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminMajorRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u || String(u.role).toLowerCase() !== "admin") {
      router.replace("/");
      return;
    }
    setCurrentUser(u);
  }, [router]);

  const refreshMajorsList = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setListError("未找到登录凭证，请重新登录");
      setMajors([]);
      return;
    }
    setIsLoadingList(true);
    setListError(null);
    try {
      const res = await fetchMajorsList({ token, pageSize: 20 });
      setMajors(res.items);
      setHasMore(res.has_more);
      setNextCursor(
        res.next_cursor_created_at && res.next_cursor_id
          ? {
              created_at: res.next_cursor_created_at,
              id: res.next_cursor_id,
            }
          : null,
      );
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "加载专业列表失败，请稍后重试";
      setListError(msg);
      setMajors([]);
      setHasMore(false);
      setNextCursor(null);
      if (
        typeof msg === "string" &&
        (msg.includes(" 401") || msg.includes(": 401"))
      ) {
        logout();
        router.replace("/login");
      }
    } finally {
      setIsLoadingList(false);
    }
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;
    void refreshMajorsList();
  }, [currentUser, refreshMajorsList]);

  useEffect(() => {
    if (!editingMajor) return;
    setEditForm({
      name: editingMajor.name,
      description: editingMajor.description,
      sort_order: editingMajor.sort_order,
    });
    setEditError(null);
  }, [editingMajor]);

  const loadMore = () => {
    const token = getToken();
    if (!token || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setListError(null);
    fetchMajorsList({ token, pageSize: 20, cursor: nextCursor })
      .then((res) => {
        setMajors((prev) => [...prev, ...res.items]);
        setHasMore(res.has_more);
        setNextCursor(
          res.next_cursor_created_at && res.next_cursor_id
            ? {
                created_at: res.next_cursor_created_at,
                id: res.next_cursor_id,
              }
            : null,
        );
      })
      .catch((e: unknown) => {
        setListError(
          e instanceof Error ? e.message : "加载更多失败，请稍后重试",
        );
      })
      .finally(() => setIsLoadingMore(false));
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setCreateForm(emptyCreateForm());
    setCreateError(null);
  };

  const onCreateOpenChange = (open: boolean) => {
    if (open) {
      setCreateOpen(true);
      setCreateError(null);
      return;
    }
    if (isCreating) return;
    closeCreateModal();
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      setCreateError("请先登录");
      return;
    }
    const name = createForm.name.trim();
    const code = createForm.code.trim();
    const description = createForm.description.trim();
    if (!name || !code) {
      setCreateError("请填写专业名称与代码");
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      await createMajor({
        token,
        payload: {
          name,
          code,
          description,
          sort_order: Number.isFinite(createForm.sort_order)
            ? Math.floor(createForm.sort_order)
            : 0,
        },
      });
      closeCreateModal();
      await refreshMajorsList();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "创建专业失败，请稍后重试";
      setCreateError(msg);
      if (
        typeof msg === "string" &&
        (msg.includes(" 401") || msg.includes(": 401"))
      ) {
        logout();
        router.replace("/login");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const closeEditModal = () => {
    setEditingMajor(null);
    setEditError(null);
  };

  const onEditOpenChange = (open: boolean) => {
    if (open) return;
    if (isSavingEdit) return;
    closeEditModal();
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMajor) return;
    const token = getToken();
    if (!token) {
      setEditError("请先登录");
      return;
    }
    const name = editForm.name.trim();
    const description = editForm.description.trim();
    if (!name) {
      setEditError("请填写专业名称");
      return;
    }
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await updateMajor({
        token,
        majorId: editingMajor.id,
        payload: {
          name,
          description,
          sort_order: Math.floor(editForm.sort_order),
        },
      });
      closeEditModal();
      await refreshMajorsList();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "更新专业失败，请稍后重试";
      setEditError(msg);
      if (
        typeof msg === "string" &&
        (msg.includes(" 401") || msg.includes(": 401"))
      ) {
        logout();
        router.replace("/login");
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const onDeleteOpenChange = (open: boolean) => {
    if (!open && !isDeleting) setDeleteTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const token = getToken();
    if (!token) {
      setListError("未找到登录凭证，请重新登录");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteMajor({ token, majorId: deleteTarget.id });
      setDeleteTarget(null);
      await refreshMajorsList();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "删除失败，请稍后重试";
      setListError(msg);
      if (
        typeof msg === "string" &&
        (msg.includes(" 401") || msg.includes(": 401"))
      ) {
        logout();
        router.replace("/login");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      majorColumnHelper.accessor("name", {
        header: "专业名称",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-bold text-[#1a1c1e]">{row.original.name}</p>
            <p className="text-sm text-[#424654]">{row.original.description}</p>
          </div>
        ),
      }),
      majorColumnHelper.accessor("code", {
        header: () => <div className="text-center">代码</div>,
        cell: (info) => (
          <div className="text-center font-mono text-sm font-medium text-[#1a1c1e]">
            {info.getValue()}
          </div>
        ),
      }),
      majorColumnHelper.accessor("sort_order", {
        header: () => <div className="text-center">排序</div>,
        cell: (info) => (
          <div className="text-center tabular-nums text-[#1a1c1e]">
            {info.getValue()}
          </div>
        ),
      }),
      majorColumnHelper.accessor(
        (row) => row.course_count ?? 0,
        {
          id: "course_count",
          header: () => <div className="text-center">课程数</div>,
          cell: (info) => (
            <div className="text-center font-bold tabular-nums text-[#1a1c1e]">
              {info.getValue()}
            </div>
          ),
        },
      ),
      majorColumnHelper.accessor(
        (row) => row.enrolled_learner_count ?? 0,
        {
          id: "enrolled_learner_count",
          header: () => <div className="text-center">学习人数</div>,
          cell: (info) => (
            <div className="text-center font-bold tabular-nums text-[#1a1c1e]">
              {info.getValue().toLocaleString("zh-CN")}
            </div>
          ),
        },
      ),
      majorColumnHelper.accessor(
        (row) => row.total_video_views ?? 0,
        {
          id: "total_video_views",
          header: () => <div className="text-center">视频播放</div>,
          cell: (info) => (
            <div className="text-center tabular-nums text-[#424654]">
              {info.getValue().toLocaleString("zh-CN")}
            </div>
          ),
        },
      ),
      majorColumnHelper.display({
        id: "actions",
        header: () => <div className="text-right">操作</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1 md:opacity-0 md:group-hover:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-slate-500 hover:bg-[#0040a1]/10 hover:text-[#0040a1]"
              aria-label="编辑"
              onClick={() => setEditingMajor(row.original)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-slate-500 hover:bg-red-50 hover:text-red-600"
              aria-label="删除"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: majors,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f9f9fc] text-[#424654]">
        校验权限中…
      </div>
    );
  }

  return (
    <AdminShell
      activeNav="majors"
      currentUser={currentUser}
      topSearchPlaceholder="搜索专业名称、关键词…"
    >
      <section className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[#1a1c1e] md:text-4xl lg:text-5xl">
            专业方向
          </h1>
          <p className="text-lg text-[#424654]">
            维护学科分类与展示顺序（已对接 /api/majors）。
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={onCreateOpenChange}>
          <DialogTrigger asChild>
            <Button
              type="button"
              className="h-auto shrink-0 rounded-full bg-linear-to-br from-[#0040a1] to-[#0056d2] px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:opacity-90"
            >
              <PlusCircle size={20} />
              新增专业
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[425px]"
            onPointerDownOutside={(ev) => {
              if (isCreating) ev.preventDefault();
            }}
            onEscapeKeyDown={(ev) => {
              if (isCreating) ev.preventDefault();
            }}
          >
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle>新增专业</DialogTitle>
                <DialogDescription>
                  调用 <code className="rounded bg-[#f3f3f6] px-1 text-xs">POST /api/majors</code>{" "}
                  创建专业。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                {createError ? (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                    role="alert"
                  >
                    {createError}
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Label htmlFor="major-name">名称</Label>
                  <Input
                    id="major-name"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, name: e.target.value }))
                    }
                    disabled={isCreating}
                    placeholder="计算机科学"
                    className="h-10 border-[#e8e8ea]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="major-code">代码</Label>
                  <Input
                    id="major-code"
                    value={createForm.code}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, code: e.target.value }))
                    }
                    disabled={isCreating}
                    placeholder="CS"
                    className="h-10 border-[#e8e8ea] font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="major-desc">描述</Label>
                  <Input
                    id="major-desc"
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    disabled={isCreating}
                    placeholder="计算机科学与技术专业"
                    className="h-10 border-[#e8e8ea]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="major-sort">排序</Label>
                  <Input
                    id="major-sort"
                    type="number"
                    value={createForm.sort_order}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        sort_order: Number(e.target.value) || 0,
                      }))
                    }
                    disabled={isCreating}
                    className="h-10 border-[#e8e8ea]"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isCreating}>
                    取消
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2"
                >
                  {isCreating ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  创建
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </section>

      <Dialog open={!!editingMajor} onOpenChange={onEditOpenChange}>
        <DialogContent
          className="sm:max-w-[425px]"
          onPointerDownOutside={(ev) => {
            if (isSavingEdit) ev.preventDefault();
          }}
          onEscapeKeyDown={(ev) => {
            if (isSavingEdit) ev.preventDefault();
          }}
        >
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>编辑专业</DialogTitle>
              <DialogDescription>
                <code className="rounded bg-[#f3f3f6] px-1 text-xs">PUT /api/majors/{editingMajor?.id}</code>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              {editError ? (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                  role="alert"
                >
                  {editError}
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label>代码</Label>
                <Input
                  value={editingMajor?.code ?? ""}
                  disabled
                  readOnly
                  className="h-10 border-[#e8e8ea] bg-[#f3f3f6] font-mono text-[#424654]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-major-name">名称</Label>
                <Input
                  id="edit-major-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  disabled={isSavingEdit}
                  className="h-10 border-[#e8e8ea]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-major-desc">描述</Label>
                <Input
                  id="edit-major-desc"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, description: e.target.value }))
                  }
                  disabled={isSavingEdit}
                  className="h-10 border-[#e8e8ea]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-major-sort">排序</Label>
                <Input
                  id="edit-major-sort"
                  type="number"
                  value={editForm.sort_order}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      sort_order: Number(e.target.value) || 0,
                    }))
                  }
                  disabled={isSavingEdit}
                  className="h-10 border-[#e8e8ea]"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSavingEdit}>
                  取消
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSavingEdit}
                className="inline-flex items-center gap-2"
              >
                {isSavingEdit ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={onDeleteOpenChange}>
        <DialogContent
          className="sm:max-w-[425px]"
          onPointerDownOutside={(ev) => {
            if (isDeleting) ev.preventDefault();
          }}
          onEscapeKeyDown={(ev) => {
            if (isDeleting) ev.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定删除专业「{deleteTarget?.name}」（{deleteTarget?.code}）吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              className="inline-flex items-center gap-2"
              onClick={() => void handleDeleteConfirm()}
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bento */}
      <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        <div className="relative overflow-hidden rounded-xl bg-white p-8 shadow-[0_24px_48px_-12px_rgba(26,28,30,0.06)]">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <BarChart3 className="size-16 text-[#0040a1]" />
          </div>
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#424654]">
            专业总数
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-[#0040a1]">
              {isLoadingList ? "…" : majors.length}
            </span>
            <span className="flex items-center gap-0.5 text-sm font-bold text-emerald-600">
              <TrendingUp size={14} />
              已加载
            </span>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-white p-8 shadow-[0_24px_48px_-12px_rgba(26,28,30,0.06)]">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <Star className="size-16 text-amber-500" />
          </div>
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#424654]">
            热门方向
          </p>
          <h3 className="mb-1 text-2xl font-bold text-[#1a1c1e]">—</h3>
          <p className="text-sm font-medium text-[#424654]">待统计选课人数</p>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-white p-8 shadow-[0_24px_48px_-12px_rgba(26,28,30,0.06)]">
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <Sparkles className="size-16 text-[#872200]" />
          </div>
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#424654]">
            本季度新增
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-[#872200]">—</span>
            <span className="text-sm font-medium text-[#424654]">待统计</span>
          </div>
        </div>
      </section>

      {listError ? (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {listError}
        </div>
      ) : null}

      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 px-1">
        <h2 className="text-xl font-bold text-[#1a1c1e]">专业目录</h2>
        <div className="flex items-center gap-4 text-sm font-medium text-[#424654]">
          <button
            type="button"
            className="flex items-center gap-1 transition-colors hover:text-[#0040a1]"
          >
            <Filter size={16} />
            筛选
          </button>
          <button
            type="button"
            className="flex items-center gap-1 transition-colors hover:text-[#0040a1]"
          >
            <ArrowUpDown size={16} />
            排序
          </button>
        </div>
      </section>

      <div className="relative overflow-hidden rounded-xl bg-white shadow-[0_24px_48px_-12px_rgba(26,28,30,0.06)]">
        {isLoadingList ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
            <Loader2 className="size-8 animate-spin text-[#0040a1]" aria-hidden />
            <span className="sr-only">加载中</span>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="bg-[#f3f3f6]">
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#424654] md:px-8 md:py-5"
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[#eeeef0]">
              {!isLoadingList && majors.length === 0 && !listError ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-[#424654]"
                  >
                    暂无专业数据
                  </td>
                </tr>
              ) : null}
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="group transition-colors hover:bg-[#f3f3f6]/60"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-5 align-middle md:px-8 md:py-6"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#eeeef0] px-6 py-5 md:px-8">
          <p className="text-xs text-[#424654]">
            第 {table.getState().pagination.pageIndex + 1} /{" "}
            {Math.max(1, table.getPageCount())} 页 · 已加载 {majors.length} 条
            {hasMore ? "（后端还有更多）" : ""}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full border border-[#c3c6d6] text-[#424654] transition-colors hover:bg-[#f3f3f6] disabled:opacity-40"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="上一页"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="flex size-8 items-center justify-center rounded-full bg-[#0040a1] text-xs font-bold text-white">
              {table.getState().pagination.pageIndex + 1}
            </span>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full border border-[#c3c6d6] text-[#424654] transition-colors hover:bg-[#f3f3f6] disabled:opacity-40"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="下一页"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        {hasMore ? (
          <div className="border-t border-[#eeeef0] px-6 py-4 md:px-8">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#c3c6d6] font-bold text-[#0040a1]"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              加载更多
            </Button>
          </div>
        ) : null}
      </div>

      <footer className="mt-20 border-t border-[#c3c6d6]/20 pt-12">
        <div className="mx-auto max-w-2xl text-center">
          <h5 className="mb-4 text-2xl font-bold italic text-blue-900">
            「结构清晰，知识才好落地。」
          </h5>
          <p className="text-sm text-[#424654]">
            课程归属与统计可在对接业务接口后展示。
          </p>
          <button
            type="button"
            className="mx-auto mt-6 flex items-center gap-2 text-sm font-bold text-[#0040a1] hover:underline"
          >
            查看组织架构（占位）
            <Search className="size-4 -rotate-90" />
          </button>
        </div>
      </footer>

      <div className="mt-12 flex flex-col justify-between gap-4 border-t border-slate-100 pt-8 text-xs text-slate-400 md:flex-row">
        <p>© {new Date().getFullYear()} 趣学内卷 · 管理端</p>
        <div className="flex flex-wrap gap-6">
          <a href="#" className="hover:text-[#0040a1]">
            系统状态
          </a>
          <a href="#" className="hover:text-[#0040a1]">
            合规说明
          </a>
          <a href="#" className="hover:text-[#0040a1]">
            审计日志
          </a>
        </div>
      </div>
    </AdminShell>
  );
}
