"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Compass,
  BookOpen,
  Heart,
  History,
  Settings,
  GraduationCap,
  ChevronRight,
  Bell,
  User,
  LogIn,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getUser, getToken, saveUserInfo, type UserInfo } from "@/lib/auth";
import { fetchUserProfile } from "@/lib/users";

const navItems = [
  { icon: Home, label: "首页", href: "/", active: true },
  { icon: Compass, label: "发现", href: "/discover" },
  { icon: BookOpen, label: "我的课程", href: "/my-courses" },
  { icon: Heart, label: "收藏", href: "/favorites" },
  { icon: History, label: "学习记录", href: "/history" },
];

const categories = [
  { label: "编程开发", color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
  { label: "设计创意", color: "bg-rose-50 text-rose-600 hover:bg-rose-100" },
  { label: "商业管理", color: "bg-amber-50 text-amber-600 hover:bg-amber-100" },
  {
    label: "语言学习",
    color: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
  },
  { label: "数据科学", color: "bg-sky-50 text-sky-600 hover:bg-sky-100" },
];

const ROLE_LABEL: Record<string, string> = {
  Admin: "管理员",
  Teacher: "讲师",
  Student: "学员",
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState("首页");
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const redirectIfNeeded = (u: UserInfo | null) => {
      if (u?.password_reset_required && pathname !== "/change-password") {
        router.replace(
          `/change-password?next=${encodeURIComponent(pathname ?? "/")}`,
        );
      }
    };

    // 优先读本地缓存快速判断
    const cached = getUser();
    setUser(cached);
    redirectIfNeeded(cached);

    // 再从后端拉取最新状态，确保管理员重置密码后能及时感知
    const token = getToken();
    if (token && cached?.id) {
      fetchUserProfile(token, cached.id)
        .then((profile) => {
          const updated: UserInfo = {
            ...cached,
            password_reset_required: profile.password_reset_required,
          };
          // 只在字段有变化时才写入，避免不必要的重渲染
          if (profile.password_reset_required !== cached.password_reset_required) {
            saveUserInfo(updated);
            setUser(updated);
          }
          redirectIfNeeded(updated);
        })
        .catch(() => {
          // 静默失败，不影响正常使用
        });
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth_user") {
        const updated = e.newValue
          ? (JSON.parse(e.newValue) as UserInfo)
          : null;
        setUser(updated);
        redirectIfNeeded(updated);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- pathname 变化时重新检查
  }, [pathname]);

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-gray-100 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-sky-400 flex items-center justify-center shadow-sm">
          <GraduationCap size={17} className="text-white" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-bold text-gray-900 tracking-tight">
            微光智造
          </span>
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4 font-medium text-blue-600 bg-blue-50 border-0"
          >
            微课
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = activeItem === label;
          return (
            <a
              key={label}
              href={href}
              onClick={(e) => {
                e.preventDefault();
                setActiveItem(label);
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon
                size={17}
                className={cn(
                  isActive
                    ? "text-blue-600"
                    : "text-gray-400 group-hover:text-gray-500",
                )}
              />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight size={13} className="text-blue-400" />}
            </a>
          );
        })}

        {/* Categories */}
        <div className="pt-4 pb-1">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2.5">
            分类浏览
          </p>
          <div className="flex flex-wrap gap-1.5 px-1">
            {categories.map(({ label, color }) => (
              <button
                key={label}
                className={cn(
                  "text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer",
                  color,
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <Separator />

      {/* Bottom Actions */}
      <div className="px-3 py-3 space-y-0.5">
        <a
          href="/notifications"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
        >
          <Bell size={17} className="text-gray-400" />
          <span className="flex-1">消息通知</span>
          <Badge className="bg-red-500 text-white text-[10px] h-4 min-w-4 px-1 justify-center">
            3
          </Badge>
        </a>
        <a
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
        >
          <Settings size={17} className="text-gray-400" />
          <span>设置</span>
        </a>

        {/* User Profile */}
        {user ? (
          <a
            href="/profile"
            className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
              {(user.real_name ?? user.username)?.charAt(0) ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {user.real_name || user.username}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {ROLE_LABEL[user.role] ?? user.role}
              </p>
            </div>
          </a>
        ) : (
          <a
            href="/login"
            className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <LogIn size={14} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-700">登录 / 注册</p>
              <p className="text-xs text-blue-400">开始你的学习之旅</p>
            </div>
          </a>
        )}
      </div>
    </aside>
  );
}
