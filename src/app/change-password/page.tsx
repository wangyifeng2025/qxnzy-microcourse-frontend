"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { GraduationCap, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  getToken,
  getUser,
  clearPasswordResetRequired,
  logout,
} from "@/lib/auth";
import { changePassword } from "@/lib/users";

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function ChangePasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    if (!user.password_reset_required) {
      // 密码无需重置，跳回对应首页
      const role = String(user.role ?? "").toLowerCase();
      router.replace(role === "admin" ? "/admin" : "/");
      return;
    }
    setIsReady(true);
  }, [router]);

  const form = useForm({
    defaultValues: {
      old_password: "",
      new_password: "",
      confirm_password: "",
    },
    onSubmit: async ({ value }) => {
      const token = getToken();
      const user = getUser();
      if (!token || !user?.id) {
        setServerError("登录状态已失效，请重新登录");
        logout();
        router.replace("/login");
        return;
      }
      if (value.new_password !== value.confirm_password) {
        setServerError("两次输入的新密码不一致");
        return;
      }
      setServerError(null);
      try {
        await changePassword({
          token,
          userId: user.id,
          oldPassword: value.old_password,
          newPassword: value.new_password,
        });
        clearPasswordResetRequired();
        const next = safeNextPath(searchParams.get("next"));
        if (next) {
          router.push(next);
          return;
        }
        const role = String(user.role ?? "").toLowerCase();
        router.push(role === "admin" ? "/admin" : "/");
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : "修改密码失败，请稍后重试",
        );
      }
    },
  });

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/70">
        <Loader2 className="size-6 animate-spin text-[#0040a1]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50/70 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-100/40 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-sky-400 flex items-center justify-center shadow-md">
            <GraduationCap size={22} className="text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900">微光智造</span>
            <span className="ml-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
              微课平台
            </span>
          </div>
        </div>

        {/* 安全提示 */}
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <ShieldAlert
            size={18}
            className="mt-0.5 shrink-0 text-amber-600"
            aria-hidden
          />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">您的密码已由管理员重置</p>
            <p className="mt-0.5 text-amber-700">
              为保障账号安全，请立即设置新密码后再继续使用。
            </p>
          </div>
        </div>

        <Card className="border-gray-100 shadow-lg shadow-gray-100/50">
          <CardHeader className="pb-4 pt-6 px-8">
            <h1 className="text-xl font-bold text-gray-900">修改密码</h1>
            <p className="text-sm text-gray-500 mt-1">
              请输入管理员设置的临时密码，然后设置您的新密码
            </p>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-5"
            >
              {/* 当前密码 */}
              <form.Field
                name="old_password"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "请输入管理员重置后的当前密码"
                      : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="old_password"
                      className="text-sm font-medium text-gray-700"
                    >
                      当前密码（管理员重置后的密码）
                    </Label>
                    <div className="relative">
                      <Input
                        id="old_password"
                        name={field.name}
                        type={showOld ? "text" : "password"}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="输入管理员设置的临时密码"
                        autoComplete="current-password"
                        className={`h-10 pr-10 ${
                          field.state.meta.errors.length > 0
                            ? "border-red-400 focus-visible:ring-red-200"
                            : "focus-visible:ring-blue-200 focus-visible:border-blue-400"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowOld((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={showOld ? "隐藏密码" : "显示密码"}
                      >
                        {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-red-500">
                        {field.state.meta.errors[0]?.toString()}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* 新密码 */}
              <form.Field
                name="new_password"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "请输入新密码"
                      : value.length < 6
                        ? "密码至少 6 位"
                        : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="new_password"
                      className="text-sm font-medium text-gray-700"
                    >
                      新密码
                    </Label>
                    <div className="relative">
                      <Input
                        id="new_password"
                        name={field.name}
                        type={showNew ? "text" : "password"}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="至少 6 位"
                        autoComplete="new-password"
                        className={`h-10 pr-10 ${
                          field.state.meta.errors.length > 0
                            ? "border-red-400 focus-visible:ring-red-200"
                            : "focus-visible:ring-blue-200 focus-visible:border-blue-400"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={showNew ? "隐藏密码" : "显示密码"}
                      >
                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-red-500">
                        {field.state.meta.errors[0]?.toString()}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* 确认新密码 */}
              <form.Field
                name="confirm_password"
                validators={{
                  onChange: ({ value }) =>
                    !value ? "请再次输入新密码" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="confirm_password"
                      className="text-sm font-medium text-gray-700"
                    >
                      确认新密码
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm_password"
                        name={field.name}
                        type={showConfirm ? "text" : "password"}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="再次输入新密码"
                        autoComplete="new-password"
                        className={`h-10 pr-10 ${
                          field.state.meta.errors.length > 0
                            ? "border-red-400 focus-visible:ring-red-200"
                            : "focus-visible:ring-blue-200 focus-visible:border-blue-400"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label={showConfirm ? "隐藏密码" : "显示密码"}
                      >
                        {showConfirm ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                    </div>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-red-500">
                        {field.state.meta.errors[0]?.toString()}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {serverError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {serverError}
                </div>
              )}

              <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    disabled={!canSubmit || !!isSubmitting}
                    className="mt-2 h-10 w-full rounded-lg bg-[#0040a1] font-medium text-white shadow-sm hover:bg-[#0040a1]/90"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={15} className="mr-2 animate-spin" />
                        修改中...
                      </>
                    ) : (
                      "确认修改密码"
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-gray-400">
          如有问题，请联系管理员
        </p>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50/70">
          <Loader2 className="size-6 animate-spin text-[#0040a1]" />
        </div>
      }
    >
      <ChangePasswordInner />
    </Suspense>
  );
}
