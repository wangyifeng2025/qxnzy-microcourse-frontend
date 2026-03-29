"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  GraduationCap,
  Search,
  Bell,
  HelpCircle,
  Settings,
  LogOut,
} from "lucide-react";
import { logout, type UserInfo } from "@/lib/auth";
import { cn } from "@/lib/utils";

export type AdminNavKey = "users" | "majors";

export default function AdminShell({
  children,
  activeNav,
  topSearchPlaceholder = "搜索…",
  currentUser,
}: {
  children: React.ReactNode;
  activeNav: AdminNavKey;
  topSearchPlaceholder?: string;
  currentUser: UserInfo;
}) {
  const router = useRouter();

  const navClass = (key: AdminNavKey) =>
    cn(
      "flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors duration-200",
      activeNav === key
        ? "border-r-2 border-blue-700 bg-white/80 font-bold text-blue-700"
        : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900",
    );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f9f9fc] text-[#1a1c1e]">
      <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-100 bg-slate-50 py-8 pl-3 pr-2">
        <div className="mb-10 px-3">
          <Link
            href="/"
            className="text-xl font-bold tracking-tighter text-blue-900 hover:text-blue-700"
          >
            趣学内卷
          </Link>
          <p className="mt-1 text-xs text-slate-500">管理后台</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          <Link href="/admin" className={navClass("users")}>
            <Users size={20} strokeWidth={activeNav === "users" ? 2.5 : 2} />
            用户管理
          </Link>
          <Link href="/admin/majors" className={navClass("majors")}>
            <GraduationCap
              size={20}
              strokeWidth={activeNav === "majors" ? 2.5 : 2}
            />
            专业方向
          </Link>
        </nav>

        <div className="mt-auto space-y-2 pt-6">
          <Link
            href="/teacher/courses/new"
            className="flex w-full items-center justify-center rounded-full bg-linear-to-br from-[#0040a1] to-[#0056d2] py-3 text-xs font-bold uppercase tracking-wide text-white shadow-md transition-opacity hover:opacity-90"
          >
            创建新课程
          </Link>
          <div className="space-y-1 border-t border-slate-200 pt-6">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-900"
            >
              <Settings size={18} />
              设置
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-900"
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              <LogOut size={18} />
              退出登录
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3 px-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e2e2e5] text-sm font-bold text-blue-900">
              {(currentUser.real_name ?? currentUser.username)?.charAt(0) ?? "A"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">
                {currentUser.real_name || currentUser.username}
              </p>
              <p className="truncate text-[10px] text-slate-500">
                {currentUser.email ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-[#f9f9fc]">
        <header className="sticky top-0 z-50 flex h-20 w-full shrink-0 items-center justify-between border-b border-slate-100/80 bg-white/80 px-6 backdrop-blur-xl md:px-10 lg:px-16">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder={topSearchPlaceholder}
              className="w-full rounded-full border-0 bg-[#e8e8ea] py-2 pl-10 pr-4 text-sm text-[#1a1c1e] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="ml-4 flex items-center gap-2 md:gap-4">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:text-blue-600"
              aria-label="通知"
            >
              <Bell size={20} />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:text-blue-600"
              aria-label="帮助"
            >
              <HelpCircle size={20} />
            </button>
            <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
            <Link
              href="/"
              className="hidden text-sm font-bold text-blue-700 hover:text-blue-600 sm:inline"
            >
              返回前台
            </Link>
          </div>
        </header>

        <div className="hide-scrollbar flex-1 overflow-y-auto px-4 py-10 md:px-10 lg:px-16">
          {children}
        </div>
      </main>
    </div>
  );
}
