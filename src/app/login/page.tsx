"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { loginApi, saveAuthResponse } from "@/lib/auth";

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        const res = await loginApi(value);
        saveAuthResponse(res);
        // 通知同 tab 内其他组件用户状态已更新
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "auth_user",
            newValue: localStorage.getItem("auth_user"),
          }),
        );

        // 管理员重置密码后强制修改
        if (res.user?.password_reset_required) {
          const next = safeNextPath(
            searchParams.get("next") ?? searchParams.get("redirect"),
          );
          router.push(
            `/change-password${next ? `?next=${encodeURIComponent(next)}` : ""}`,
          );
          return;
        }

        const next = safeNextPath(
          searchParams.get("next") ?? searchParams.get("redirect"),
        );
        if (next) {
          router.push(next);
          return;
        }
        const role = String(res.user?.role ?? "").toLowerCase();
        if (role === "admin") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      } catch (err) {
        setServerError(
          err instanceof Error ? err.message : "登录失败，请稍后重试",
        );
      }
    },
  });

  return (
    <div className="min-h-screen bg-gray-50/70 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-100/40 rounded-full blur-3xl" />
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

        <Card className="border-gray-100 shadow-lg shadow-gray-100/50">
          <CardHeader className="pb-4 pt-6 px-8">
            <h1 className="text-xl font-bold text-gray-900">欢迎回来</h1>
            <p className="text-sm text-gray-500 mt-1">
              登录你的账号，继续学习之旅
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
              {/* Username */}
              <form.Field
                name="username"
                validators={{
                  onChange: ({ value }) =>
                    !value.trim() ? "请输入用户名" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={field.name}
                      className="text-sm font-medium text-gray-700"
                    >
                      用户名
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="请输入用户名"
                      autoComplete="username"
                      className={`h-10 ${field.state.meta.errors.length > 0 ? "border-red-400 focus-visible:ring-red-200" : "focus-visible:ring-blue-200 focus-visible:border-blue-400"}`}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-red-500">
                        {field.state.meta.errors[0]?.toString()}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Password */}
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) =>
                    !value
                      ? "请输入密码"
                      : value.length < 6
                        ? "密码至少 6 位"
                        : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={field.name}
                        className="text-sm font-medium text-gray-700"
                      >
                        密码
                      </Label>
                      <a
                        href="#"
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        忘记密码？
                      </a>
                    </div>
                    <div className="relative">
                      <Input
                        id={field.name}
                        name={field.name}
                        type={showPassword ? "text" : "password"}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="请输入密码"
                        autoComplete="current-password"
                        className={`h-10 pr-10 ${field.state.meta.errors.length > 0 ? "border-red-400 focus-visible:ring-red-200" : "focus-visible:ring-blue-200 focus-visible:border-blue-400"}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
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

              {/* Server Error */}
              {serverError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                  {serverError}
                </div>
              )}

              {/* Submit */}
              <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    disabled={!canSubmit || !!isSubmitting}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm shadow-blue-100 mt-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin mr-2" />
                        登录中...
                      </>
                    ) : (
                      "登 录"
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              还没有账号？{" "}
              <a
                href="/register"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                立即注册
              </a>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          登录即表示你同意我们的{" "}
          <a href="#" className="text-blue-500 hover:underline">
            服务条款
          </a>{" "}
          和{" "}
          <a href="#" className="text-blue-500 hover:underline">
            隐私政策
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50/70 text-[#424654]">
          加载中…
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
