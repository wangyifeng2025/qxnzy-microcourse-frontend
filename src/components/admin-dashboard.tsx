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
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { getUser, getToken, logout, type UserInfo } from "@/lib/auth";
import AdminShell from "@/components/admin-shell";
import { cn } from "@/lib/utils";
import {
  createUserAsAdmin,
  deleteUserAsAdmin,
  fetchUsersList,
  updateUserAsAdmin,
  type CreateUserPayload,
  type UserListItem,
} from "@/lib/users";
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

/** 表格行（由接口 UserListItem 映射） */
export type AdminUserRow = {
  id: string;
  username: string;
  real_name: string;
  displayName: string;
  subtitle: string;
  email: string;
  role: string;
  joinDate: string;
  status: "active" | "suspended";
  avatar_url: string | null;
};

const columnHelper = createColumnHelper<AdminUserRow>();

function mapUserListItemToRow(item: UserListItem): AdminUserRow {
  const displayName = item.real_name?.trim() || item.username || "—";
  return {
    id: item.id,
    username: item.username,
    real_name: item.real_name ?? "",
    displayName,
    subtitle: `@${item.username}`,
    email: item.email,
    role: item.role,
    joinDate: item.created_at,
    status: item.is_active ? "active" : "suspended",
    avatar_url: item.avatar_url,
  };
}

function normalizeRoleForForm(
  role: string,
): CreateUserPayload["role"] {
  const r = role.toLowerCase();
  if (r === "admin") return "Admin";
  if (r === "teacher") return "Teacher";
  return "Student";
}

function roleBadgeClass(role: string) {
  const r = role.toLowerCase();
  if (r === "admin") return "bg-[#e8e8ea] text-[#1a1c1e]";
  if (r === "teacher") return "bg-[#0040a1]/10 text-[#0040a1]";
  return "bg-[#872200]/10 text-[#872200]";
}

function roleLabelZh(role: string) {
  const r = role.toLowerCase();
  if (r === "admin") return "管理员";
  if (r === "teacher") return "讲师";
  if (r === "student") return "学员";
  return role;
}

const emptyInviteForm = (): {
  username: string;
  email: string;
  password: string;
  role: CreateUserPayload["role"];
  real_name: string;
} => ({
  username: "",
  email: "",
  password: "",
  role: "Student",
  real_name: "",
});

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<{
    created_at: string;
    id: string;
  } | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState(emptyInviteForm);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [editForm, setEditForm] = useState({
    email: "",
    role: "Student" as CreateUserPayload["role"],
    real_name: "",
    is_active: true,
    password: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u || String(u.role).toLowerCase() !== "admin") {
      router.replace("/");
      return;
    }
    setCurrentUser(u);
  }, [router]);

  const refreshUserList = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setListError("未找到登录凭证，请重新登录");
      setUsers([]);
      return;
    }
    setIsLoadingList(true);
    setListError(null);
    try {
      const res = await fetchUsersList({ token, pageSize: 20 });
      setUsers(res.items.map(mapUserListItemToRow));
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
        e instanceof Error ? e.message : "加载用户列表失败，请稍后重试";
      setListError(msg);
      setUsers([]);
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
    void refreshUserList();
  }, [currentUser, refreshUserList]);

  const closeInviteModal = () => {
    setInviteOpen(false);
    setInviteForm(emptyInviteForm());
    setInviteError(null);
  };

  const onInviteOpenChange = (open: boolean) => {
    if (open) {
      setInviteOpen(true);
      setInviteError(null);
      return;
    }
    if (isCreating) return;
    closeInviteModal();
  };

  const handleInviteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      setInviteError("请先登录后再创建用户");
      return;
    }
    const u = inviteForm.username.trim();
    const em = inviteForm.email.trim();
    const rn = inviteForm.real_name.trim();
    if (!u || !em || !inviteForm.password || !rn) {
      setInviteError("请填写用户名、邮箱、密码与真实姓名");
      return;
    }
    setIsCreating(true);
    setInviteError(null);
    try {
      const payload: CreateUserPayload = {
        username: u,
        email: em,
        password: inviteForm.password,
        role: inviteForm.role,
        real_name: rn,
      };
      await createUserAsAdmin({ token, payload });
      closeInviteModal();
      await refreshUserList();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "创建用户失败，请稍后重试";
      setInviteError(msg);
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

  useEffect(() => {
    if (!editingUser) return;
    setEditForm({
      email: editingUser.email,
      role: normalizeRoleForForm(editingUser.role),
      real_name: editingUser.real_name?.trim() || editingUser.displayName,
      is_active: editingUser.status === "active",
      password: "",
    });
    setEditError(null);
  }, [editingUser]);

  const closeEditModal = () => {
    setEditingUser(null);
    setEditError(null);
  };

  const onEditOpenChange = (open: boolean) => {
    if (open) return;
    if (isSavingEdit) return;
    closeEditModal();
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    const token = getToken();
    if (!token) {
      setEditError("请先登录后再保存");
      return;
    }
    const em = editForm.email.trim();
    const rn = editForm.real_name.trim();
    if (!em || !rn) {
      setEditError("请填写邮箱与真实姓名");
      return;
    }
    setIsSavingEdit(true);
    setEditError(null);
    try {
      await updateUserAsAdmin({
        token,
        userId: editingUser.id,
        payload: {
          email: em,
          role: editForm.role,
          real_name: rn,
          is_active: editForm.is_active,
          password: editForm.password.trim() || undefined,
        },
      });
      closeEditModal();
      await refreshUserList();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "更新用户失败，请稍后重试";
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
      await deleteUserAsAdmin({ token, userId: deleteTarget.id });
      setDeleteTarget(null);
      await refreshUserList();
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

  const loadMore = () => {
    const token = getToken();
    if (!token || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setListError(null);
    fetchUsersList({ token, pageSize: 20, cursor: nextCursor })
      .then((res) => {
        setUsers((prev) => [...prev, ...res.items.map(mapUserListItemToRow)]);
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
        const msg = e instanceof Error ? e.message : "加载更多失败，请稍后重试";
        setListError(msg);
      })
      .finally(() => setIsLoadingMore(false));
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("displayName", {
        header: "姓名",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.original.avatar_url}
                alt=""
                className="size-10 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#0040a1]/10 text-sm font-bold text-[#0040a1]">
                {(row.original.displayName || "?").charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-[#1a1c1e]">
                {row.original.displayName}
              </p>
              <p className="text-xs text-[#424654]">{row.original.subtitle}</p>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor("email", {
        header: "邮箱",
        cell: (info) => (
          <span className="text-[#424654]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("role", {
        header: "角色",
        cell: (info) => (
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-xs font-bold",
              roleBadgeClass(info.getValue()),
            )}
          >
            {roleLabelZh(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("joinDate", {
        header: "加入时间",
        cell: (info) => (
          <span className="text-[#424654]">
            {new Date(info.getValue()).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: () => <div className="text-right">状态</div>,
        cell: (info) => {
          const s = info.getValue();
          return (
            <div className="text-right">
              {s === "active" ? (
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  正常
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-red-700">
                  已停用
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">操作</div>,
        cell: ({ row }) => {
          const u = row.original;
          const isSelf =
            !!currentUser?.id && String(currentUser.id) === String(u.id);
          return (
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-slate-500 hover:bg-[#0040a1]/10 hover:text-[#0040a1]"
                aria-label={`编辑 ${u.displayName}`}
                onClick={() => setEditingUser(u)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isSelf}
                title={isSelf ? "不能删除当前登录账号" : "删除用户"}
                className="text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                aria-label={`删除 ${u.displayName}`}
                onClick={() => {
                  if (!isSelf) setDeleteTarget(u);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        },
      }),
    ],
    [currentUser?.id],
  );

  const table = useReactTable({
    data: users,
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
      activeNav="users"
      currentUser={currentUser}
      topSearchPlaceholder="搜索用户、邮箱…"
    >
      <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-[#1a1c1e] md:text-4xl lg:text-5xl">
            用户管理
          </h1>
          <p className="text-lg text-[#424654]">
            学者、讲师与学员目录（来自管理端接口，支持游标分页加载更多）。
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={onInviteOpenChange}>
          <DialogTrigger asChild>
            <Button
              type="button"
              className="h-auto shrink-0 rounded-full bg-linear-to-br from-[#0040a1] to-[#0056d2] px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:scale-[1.02] hover:opacity-95"
            >
              <UserPlus size={20} />
              邀请用户
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
            <form onSubmit={handleInviteSubmit}>
              <DialogHeader>
                <DialogTitle>邀请用户</DialogTitle>
                <DialogDescription>
                  填写信息后将通过{" "}
                  <code className="rounded bg-[#f3f3f6] px-1 text-xs">
                    POST /api/users
                  </code>{" "}
                  创建新账号。
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                {inviteError ? (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                    role="alert"
                  >
                    {inviteError}
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <Label htmlFor="invite-username">用户名</Label>
                  <Input
                    id="invite-username"
                    name="username"
                    autoComplete="username"
                    value={inviteForm.username}
                    onChange={(e) =>
                      setInviteForm((f) => ({ ...f, username: e.target.value }))
                    }
                    disabled={isCreating}
                    placeholder="newstudent"
                    className="h-10 border-[#e8e8ea] bg-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-email">邮箱</Label>
                  <Input
                    id="invite-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={inviteForm.email}
                    onChange={(e) =>
                      setInviteForm((f) => ({ ...f, email: e.target.value }))
                    }
                    disabled={isCreating}
                    placeholder="user@example.com"
                    className="h-10 border-[#e8e8ea] bg-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-password">密码</Label>
                  <Input
                    id="invite-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={inviteForm.password}
                    onChange={(e) =>
                      setInviteForm((f) => ({ ...f, password: e.target.value }))
                    }
                    disabled={isCreating}
                    placeholder="至少 6 位"
                    className="h-10 border-[#e8e8ea] bg-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-role">角色</Label>
                  <select
                    id="invite-role"
                    value={inviteForm.role}
                    onChange={(e) =>
                      setInviteForm((f) => ({
                        ...f,
                        role: e.target.value as CreateUserPayload["role"],
                      }))
                    }
                    disabled={isCreating}
                    className="h-10 w-full rounded-lg border border-[#e8e8ea] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#0040a1]/30 disabled:opacity-50"
                  >
                    <option value="Student">学员</option>
                    <option value="Teacher">讲师</option>
                    <option value="Admin">管理员</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="invite-realname">真实姓名</Label>
                  <Input
                    id="invite-realname"
                    name="real_name"
                    autoComplete="name"
                    value={inviteForm.real_name}
                    onChange={(e) =>
                      setInviteForm((f) => ({ ...f, real_name: e.target.value }))
                    }
                    disabled={isCreating}
                    placeholder="新学生"
                    className="h-10 border-[#e8e8ea] bg-white"
                  />
                </div>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isCreating}
                  >
                    取消
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      创建中…
                    </>
                  ) : (
                    "创建用户"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingUser} onOpenChange={onEditOpenChange}>
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
                <DialogTitle>编辑用户</DialogTitle>
                <DialogDescription>
                  修改邮箱、角色、姓名与账号状态；留空「新密码」则不修改密码。
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
                  <Label htmlFor="edit-username">用户名</Label>
                  <Input
                    id="edit-username"
                    value={editingUser?.username ?? ""}
                    disabled
                    readOnly
                    className="h-10 border-[#e8e8ea] bg-[#f3f3f6] text-[#424654]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-email">邮箱</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    autoComplete="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, email: e.target.value }))
                    }
                    disabled={isSavingEdit}
                    className="h-10 border-[#e8e8ea] bg-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">角色</Label>
                  <select
                    id="edit-role"
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        role: e.target.value as CreateUserPayload["role"],
                      }))
                    }
                    disabled={isSavingEdit}
                    className="h-10 w-full rounded-lg border border-[#e8e8ea] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#0040a1]/30 disabled:opacity-50"
                  >
                    <option value="Student">学员</option>
                    <option value="Teacher">讲师</option>
                    <option value="Admin">管理员</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-realname">真实姓名</Label>
                  <Input
                    id="edit-realname"
                    autoComplete="name"
                    value={editForm.real_name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, real_name: e.target.value }))
                    }
                    disabled={isSavingEdit}
                    className="h-10 border-[#e8e8ea] bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="edit-active"
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        is_active: e.target.checked,
                      }))
                    }
                    disabled={isSavingEdit}
                    className="size-4 rounded border-[#e8e8ea] accent-[#0040a1]"
                  />
                  <Label htmlFor="edit-active" className="font-normal">
                    账号启用
                  </Label>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-password">新密码（可选）</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    autoComplete="new-password"
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, password: e.target.value }))
                    }
                    disabled={isSavingEdit}
                    placeholder="不修改请留空"
                    className="h-10 border-[#e8e8ea] bg-white"
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
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      保存中…
                    </>
                  ) : (
                    "保存"
                  )}
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
                确定要删除用户「{deleteTarget?.displayName}」
                （{deleteTarget?.email}）吗？此操作不可撤销。
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
      </div>

      {/* Bento 统计 — 占位数字 */}
      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="rounded-xl bg-white p-8 shadow-sm md:col-span-4">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#424654]">
            注册用户
          </p>
          <h3 className="text-4xl font-extrabold text-[#0040a1]">
            {isLoadingList ? "…" : users.length}
          </h3>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[#e8e8ea]">
            <div
              className="h-full bg-[#0040a1] transition-all"
              style={{
                width:
                  users.length === 0
                    ? "0%"
                    : `${Math.min(100, (users.length / 50) * 100)}%`,
              }}
            />
          </div>
        </div>
        <div className="rounded-xl bg-[#f3f3f6] p-8 md:col-span-4">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-[#424654]">
            系统可用性
          </p>
          <h3 className="text-4xl font-extrabold text-[#1a1c1e]">—</h3>
          <p className="mt-2 text-xs text-[#424654]">待监控接口</p>
        </div>
        <div className="rounded-xl bg-[#0040a1] p-8 text-white md:col-span-4">
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-white/80">
            待审核
          </p>
          <h3 className="text-4xl font-extrabold">—</h3>
          <p className="mt-2 text-xs text-white/80">待业务接口</p>
        </div>
      </div>

      {listError ? (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {listError}
        </div>
      ) : null}

      {/* react-table */}
      <div className="relative overflow-hidden rounded-xl bg-white shadow-sm">
        {isLoadingList ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
            <Loader2
              className="size-8 animate-spin text-[#0040a1]"
              aria-hidden
            />
            <span className="sr-only">加载用户列表</span>
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
              {!isLoadingList && users.length === 0 && !listError ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-[#424654]"
                  >
                    暂无用户数据
                  </td>
                </tr>
              ) : null}
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-[#f3f3f6]/80"
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
            {Math.max(1, table.getPageCount())} 页 · 已加载 {users.length} 条
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
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full bg-[#0040a1] text-xs font-bold text-white"
            >
              {table.getState().pagination.pageIndex + 1}
            </button>
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
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-[#c3c6d6] px-4 py-2 text-sm font-bold text-[#0040a1] transition-colors hover:bg-[#f3f3f6] disabled:opacity-50"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              加载更多
            </button>
          </div>
        ) : null}
      </div>

      <footer className="mt-16 flex flex-col justify-between gap-4 border-t border-slate-100 pt-8 text-xs text-slate-400 md:flex-row">
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
      </footer>
    </AdminShell>
  );
}
