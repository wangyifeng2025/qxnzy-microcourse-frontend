"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUser, logout, type UserInfo } from "@/lib/auth";

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  Admin: { label: "管理员", color: "bg-amber-50 text-amber-600 border-amber-200" },
  Teacher: { label: "讲师", color: "bg-green-50 text-green-600 border-green-200" },
  Student: { label: "学员", color: "bg-blue-50 text-blue-600 border-blue-200" },
};

export default function UserNav() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getUser());

    // Listen for storage events so other tabs can sync auth state
    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth_user") {
        setUser(e.newValue ? (JSON.parse(e.newValue) as UserInfo) : null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Avoid hydration mismatch
  if (!mounted) return <div className="w-40 h-9" />;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-4 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-sm"
          onClick={() => router.push("/login")}
        >
          登录
        </Button>
        <Button
          size="sm"
          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm shadow-sm shadow-blue-100"
          onClick={() => router.push("/register")}
        >
          免费注册
        </Button>
      </div>
    );
  }

  const roleInfo = ROLE_LABEL[user.role] ?? ROLE_LABEL.Student;
  const initials = user.real_name?.charAt(0) ?? user.username?.charAt(0) ?? "U";

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
          {initials}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-800 leading-none">
            {user.real_name || user.username}
          </p>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-4 mt-0.5 font-medium border ${roleInfo.color}`}
          >
            {roleInfo.label}
          </Badge>
        </div>
        <ChevronDown
          size={13}
          className={`text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-gray-100 shadow-lg shadow-gray-100/80 z-40 overflow-hidden">
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
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} className="text-red-400" />
                退出登录
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
