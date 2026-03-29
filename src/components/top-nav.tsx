"use client";

import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, User, LogOut } from "lucide-react";
import { getUser, logout, type UserInfo } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** 与 stitch/code.html 顶栏一致：固定、毛玻璃、圆角搜索、渐变注册按钮 */
export type TopNavProps = {
  /** 首页传入时可与课程列表联动；其他页为本地输入，回车跳转 `/?q=` */
  embeddedSearch?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
};

export default function TopNav({ embeddedSearch }: TopNavProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");

  const searchValue = embeddedSearch ? embeddedSearch.value : localSearch;
  const setSearchValue = embeddedSearch
    ? embeddedSearch.onChange
    : setLocalSearch;

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
      setUser(getUser());
    });
    const handler = (e: StorageEvent) => {
      if (e.key === "auth_user")
        setUser(e.newValue ? (JSON.parse(e.newValue) as UserInfo) : null);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const q = searchValue.trim();
    if (q) router.push(`/?q=${encodeURIComponent(q)}`);
    else router.push("/");
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          "bg-white/80 backdrop-blur-md shadow-sm",
          "dark:bg-slate-900/80 dark:shadow-none",
        )}
      >
        <div className="mx-auto flex h-20 w-full max-w-screen-2xl items-center justify-between px-4 md:px-8 lg:px-16">
          {/* 左侧：Logo + 导航（stitch: space-x-12） */}
          <div className="flex min-w-0 items-center gap-8 md:gap-12">
            <Link
              href="/"
              className="shrink-0 text-xl font-extrabold tracking-tighter text-blue-800 dark:text-blue-200"
            >
              微光智造
            </Link>
            <nav className="hidden items-center gap-8 font-bold tracking-tight md:flex">
              <StitchNavLink href="/">课程</StitchNavLink>
              <StitchNavLink href="#">分类</StitchNavLink>
              <StitchNavLink href="#">社区</StitchNavLink>
            </nav>
          </div>

          {/* 右侧：搜索 + 登录/注册 或 已登录 */}
          <div className="flex shrink-0 items-center gap-4 sm:gap-6">
            <div className="relative min-w-0 max-w-[min(11rem,36vw)] sm:max-w-none sm:w-52 md:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-[#424654]"
                aria-hidden
              />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder={
                  embeddedSearch?.placeholder ?? "搜索课程大纲、关键词…"
                }
                className={cn(
                  "w-full rounded-full border-none bg-[#e8e8ea] py-2 pl-10 pr-3 text-sm sm:pr-4",
                  "text-[#1a1c1e] placeholder:text-[#424654]/70",
                  "transition-all focus:outline-none focus:ring-2 focus:ring-[#0040a1]",
                )}
              />
            </div>

            {mounted && user ? (
              <div className="flex items-center gap-3">
                {String(user.role).toLowerCase() === "admin" && (
                  <Link
                    href="/admin"
                    className="hidden font-bold text-slate-600 transition-colors hover:text-blue-600 sm:inline dark:text-slate-400"
                  >
                    管理后台
                  </Link>
                )}
                {String(user.role).toLowerCase() === "teacher" && (
                  <Link
                    href="/teacher"
                    className="hidden font-bold text-slate-600 transition-colors hover:text-blue-600 sm:inline dark:text-slate-400"
                  >
                    课程管理
                  </Link>
                )}
                {String(user.role).toLowerCase() !== "admin" && (
                  <Link
                    href="/my-learning"
                    className="hidden font-bold text-slate-600 transition-colors hover:text-blue-600 lg:inline dark:text-slate-400"
                  >
                    我的学习
                  </Link>
                )}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex size-9 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-sky-400 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                  >
                    {(user.real_name ?? user.username)?.charAt(0) ?? "U"}
                  </button>
                  {dropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-60"
                        aria-hidden
                        onClick={() => setDropdownOpen(false)}
                      />
                      <div className="absolute right-0 top-full z-70 mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                        <div className="border-b border-gray-50 px-4 py-3">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {user.real_name || user.username}
                          </p>
                          {user.email && (
                            <p className="mt-0.5 truncate text-xs text-gray-400">
                              {user.email}
                            </p>
                          )}
                        </div>
                        <div className="py-1">
                          <a
                            href="/profile"
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <User size={14} className="text-gray-400" />
                            个人中心
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              logout();
                              setUser(null);
                              setDropdownOpen(false);
                              router.push("/login");
                            }}
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut size={14} className="text-red-400" />
                            退出登录
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : mounted ? (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="font-bold text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-400"
                >
                  登录
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/register")}
                  className="rounded-full px-6 py-2 text-sm font-bold text-white shadow-sm transition-transform duration-200 ease-in-out hover:scale-95"
                  style={{
                    background:
                      "linear-gradient(135deg, #0040a1 0%, #0056d2 100%)",
                  }}
                >
                  注册
                </button>
              </>
            ) : (
              <div className="h-9 w-40" aria-hidden />
            )}
          </div>
        </div>
      </header>
      {/* 占位，避免 fixed 遮挡内容（等同 stitch main pt-24 效果） */}
      <div className="h-20 w-full shrink-0" aria-hidden />
    </>
  );
}

function StitchNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-400"
    >
      {children}
    </Link>
  );
}

/** @deprecated 保留兼容旧用法，样式已对齐 stitch */
export function NavItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
    >
      {children}
    </a>
  );
}
