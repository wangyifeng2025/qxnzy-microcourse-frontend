"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, startTransition, type ReactNode } from "react";
import { Search, Bell, Bookmark, User, LogOut } from "lucide-react";
import { getUser, logout, userHasAnyRole, type UserInfo } from "@/lib/auth";
import { cn } from "@/lib/utils";

export type AppSiteHeaderActive = "home" | "courses" | "community" | "my-learning" | null;

export type AppSiteHeaderProps = {
  active: AppSiteHeaderActive;
  /** 与旧首页顶栏一致：课程筛选搜索 */
  embeddedSearch?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** 回车同步 URL 的路径前缀，默认 `/`（与旧首页行为一致） */
    routerBasePath?: string;
  };
  /** 例如社区页讲师「发布话题」 */
  primaryAction?: ReactNode;
  /**
   * 是否在顶栏下增加 h-20 占位（原 TopNav 行为）。
   * 社区等整页使用 `pt-20` 包裹主内容时请设为 false。
   */
  layoutSpacer?: boolean;
};

const primaryGrad = "linear-gradient(135deg, #0040a1 0%, #0056d2 100%)";

function NavItem({
  href,
  kind,
  active,
  children,
}: {
  href: string;
  kind: Exclude<AppSiteHeaderActive, null>;
  active: AppSiteHeaderActive;
  children: ReactNode;
}) {
  const isActive = active === kind;
  if (isActive) {
    return (
      <span className="border-b-2 border-[#0056d2] pb-1 font-bold tracking-tight text-[#0056d2]">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="pb-1 font-bold tracking-tight text-[#424654] transition-colors hover:text-[#0056d2]"
    >
      {children}
    </Link>
  );
}

function UserAvatarMenu({ user }: { user: UserInfo }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const label = user.real_name?.trim() || user.username;
  const initial = label.charAt(0) || "U";

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#3b82f6_0%,#38bdf8_100%)] text-sm font-bold text-white shadow-sm ring-2 ring-white/80 transition-opacity hover:opacity-90 md:size-10"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="账户菜单"
      >
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="" className="size-full object-cover" />
        ) : (
          initial.toUpperCase()
        )}
      </button>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-60"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full z-70 mt-2 w-56 overflow-hidden rounded-xl border border-[#e2e2e5] bg-white shadow-lg"
            role="menu"
          >
            <div className="border-b border-[#eeeef0] px-4 py-3">
              <p className="truncate text-sm font-semibold text-[#1a1c1e]">{label}</p>
              {user.email ? (
                <p className="mt-0.5 truncate text-xs text-[#737785]">{user.email}</p>
              ) : null}
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#424654]/80">
                {userHasAnyRole(user.role, "admin")
                  ? "管理员"
                  : userHasAnyRole(user.role, "teacher")
                    ? "讲师"
                    : "学员"}
              </p>
            </div>
            <div className="py-1">
              <Link
                href="/profile"
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#424654] transition-colors hover:bg-[#f3f3f6]"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <User size={15} className="shrink-0 text-[#737785]" />
                个人中心
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  logout();
                  setOpen(false);
                  router.push("/login");
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut size={15} className="shrink-0 text-red-400" />
                退出登录
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function AppSiteHeader({
  active,
  embeddedSearch,
  primaryAction,
  layoutSpacer = false,
}: AppSiteHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mounted, setMounted] = useState(false);

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
    if (!embeddedSearch) return;
    const q = embeddedSearch.value.trim();
    const base = embeddedSearch.routerBasePath ?? "/";
    if (q) router.push(`${base}?q=${encodeURIComponent(q)}`);
    else router.push(base);
  };

  if (!mounted) {
    return (
      <>
        <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-[#c3c6d6]/15 bg-[#f9f9fc]/80 px-4 backdrop-blur-xl md:px-8 lg:px-16">
          <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-8">
            <span className="shrink-0 text-lg font-black italic tracking-tight text-[#0040a1] md:text-2xl">
              微光智造
            </span>
            <nav className="hidden items-center gap-6 md:flex">
              <span className="cursor-default pb-1 font-bold tracking-tight text-[#424654]">首页</span>
              <span className="cursor-default pb-1 font-bold tracking-tight text-[#424654]">课程</span>
              <span className="cursor-default pb-1 font-bold tracking-tight text-[#424654]">
                学习社区
              </span>
              <span className="cursor-default pb-1 font-bold tracking-tight text-[#424654]">
                我的学习
              </span>
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="h-9 w-16 rounded-full bg-[#e8e8ea]/80" aria-hidden />
            <div className="h-9 w-9 rounded-full bg-[#e8e8ea]/80" aria-hidden />
          </div>
        </header>
        {layoutSpacer ? <div className="h-20 w-full shrink-0" aria-hidden /> : null}
      </>
    );
  }

  return (
    <>
      <header className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b border-[#c3c6d6]/15 bg-[#f9f9fc]/80 px-4 backdrop-blur-xl md:px-8 lg:px-16">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-8">
          <Link
            href="/"
            className="shrink-0 text-lg font-black italic tracking-tight text-[#0040a1] md:text-2xl"
          >
            微光智造
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <NavItem href="/" kind="home" active={active}>
              首页
            </NavItem>
            <NavItem href="/courses" kind="courses" active={active}>
              课程
            </NavItem>
            <NavItem href="/community" kind="community" active={active}>
              学习社区
            </NavItem>
            <NavItem href="/my-learning" kind="my-learning" active={active}>
              我的学习
            </NavItem>
          </nav>
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-2 md:gap-4">
          {embeddedSearch ? (
            <div className="relative min-w-0 max-w-[min(10rem,38vw)] sm:max-w-xs md:max-w-56">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-[#424654]"
                aria-hidden
              />
              <input
                type="search"
                value={embeddedSearch.value}
                onChange={(e) => embeddedSearch.onChange(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder={embeddedSearch.placeholder ?? "搜索课程大纲、关键词…"}
                className={cn(
                  "w-full rounded-full border-none bg-[#e8e8ea] py-2 pl-10 pr-3 text-sm",
                  "text-[#1a1c1e] placeholder:text-[#424654]/70",
                  "transition-all focus:outline-none focus:ring-2 focus:ring-[#0040a1]",
                )}
              />
            </div>
          ) : null}

          <button
            type="button"
            className="hidden rounded-full p-2 text-[#424654] transition-colors hover:bg-[#f3f3f6] sm:inline-flex"
            aria-label="通知"
          >
            <Bell size={22} strokeWidth={1.75} />
          </button>
          <Link
            href="/my-learning"
            className="hidden rounded-full p-2 text-[#424654] transition-colors hover:bg-[#f3f3f6] sm:inline-flex"
            aria-label="我的学习"
          >
            <Bookmark size={22} strokeWidth={1.75} />
          </Link>

          {!user ? (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="whitespace-nowrap text-sm font-bold text-[#424654] transition-colors hover:text-[#0056d2]"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] sm:px-5 md:px-6"
                style={{ background: primaryGrad }}
              >
                注册
              </Link>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {userHasAnyRole(user.role, "admin") ? (
                <Link
                  href="/admin"
                  className="hidden whitespace-nowrap text-sm font-bold text-[#424654] transition-colors hover:text-[#0056d2] sm:inline"
                >
                  管理后台
                </Link>
              ) : null}
              {userHasAnyRole(user.role, "teacher") ? (
                <Link
                  href="/teacher"
                  className="hidden whitespace-nowrap text-sm font-bold text-[#424654] transition-colors hover:text-[#0056d2] md:inline"
                >
                  课程管理
                </Link>
              ) : null}
              {primaryAction ? <div className="shrink-0">{primaryAction}</div> : null}
              <UserAvatarMenu user={user} />
            </div>
          )}
        </div>
      </header>
      {layoutSpacer ? <div className="h-20 w-full shrink-0" aria-hidden /> : null}
    </>
  );
}
