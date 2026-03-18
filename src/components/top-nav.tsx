"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, ChevronDown, User, LogOut } from "lucide-react";
import { getUser, logout, type UserInfo } from "@/lib/auth";

export default function TopNav() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getUser());
    const handler = (e: StorageEvent) => {
      if (e.key === "auth_user")
        setUser(e.newValue ? (JSON.parse(e.newValue) as UserInfo) : null);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 h-[57px]">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-sky-400 flex items-center justify-center shadow-sm">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-gray-900 tracking-tight">
            趣学内卷
          </span>
          <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
            微课
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="flex items-center gap-0 ml-2">
          <NavItem href="/">探索课程</NavItem>
          <NavItem href="#">会员</NavItem>
          <button className="flex items-center gap-1 px-3.5 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50">
            社区
            <ChevronDown size={13} className="text-gray-400" />
          </button>
        </nav>

        {/* Right */}
        <div className="ml-auto flex items-center gap-2">
          {mounted && user ? (
            <>
              <NavItem href="#">我的学习</NavItem>
              <div className="relative ml-1">
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity"
                >
                  {(user.real_name ?? user.username)?.charAt(0) ?? "U"}
                </button>
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-gray-100 shadow-lg z-40 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user.real_name || user.username}
                        </p>
                        {user.email && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
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
                          onClick={() => {
                            logout();
                            setUser(null);
                            setDropdownOpen(false);
                            router.push("/login");
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut size={14} className="text-red-400" />
                          退出登录
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : mounted ? (
            <>
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
              >
                登录
              </button>
              <button
                onClick={() => router.push("/register")}
                className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm shadow-blue-200"
              >
                免费注册
              </button>
            </>
          ) : (
            <div className="w-36 h-8" />
          )}
        </div>
      </div>
    </header>
  );
}

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
      className="px-3.5 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium"
    >
      {children}
    </a>
  );
}
