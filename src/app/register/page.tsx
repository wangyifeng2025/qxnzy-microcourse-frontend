"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { GraduationCap, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { registerApi } from "@/lib/auth";

const ROLES = [
  { value: "Student", label: "学生" },
  { value: "Teacher", label: "讲师" },
  { value: "Admin", label: "管理员" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "Student",
      real_name: "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await registerApi(value);
        setSuccess(true);
        setTimeout(() => router.push("/login"), 1800);
      } catch (err) {
        setServerError(err instanceof Error ? err.message : "注册失败，请稍后重试");
      }
    },
  });

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50/70 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">注册成功！</h2>
          <p className="text-sm text-gray-500">正在跳转到登录页面...</p>
        </div>
      </div>
    );
  }

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
            <span className="text-xl font-bold text-gray-900">趣学内卷</span>
            <span className="ml-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">微课平台</span>
          </div>
        </div>

        <Card className="border-gray-100 shadow-lg shadow-gray-100/50">
          <CardHeader className="pb-4 pt-6 px-8">
            <h1 className="text-xl font-bold text-gray-900">创建账号</h1>
            <p className="text-sm text-gray-500 mt-1">加入我们，开启你的学习之旅</p>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              {/* Username */}
              <form.Field
                name="username"
                validators={{
                  onChange: ({ value }) =>
                    !value.trim()
                      ? "请输入用户名"
                      : value.length < 3
                      ? "用户名至少 3 个字符"
                      : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
                      用户名 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="请输入用户名（至少 3 位）"
                      autoComplete="username"
                      className={`h-10 ${field.state.meta.errors.length > 0 ? "border-red-400 focus-visible:ring-red-200" : "focus-visible:ring-blue-200 focus-visible:border-blue-400"}`}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-red-500">{field.state.meta.errors[0]?.toString()}</p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Real Name */}
              <form.Field
                name="real_name"
                validators={{
                  onChange: ({ value }) => (!value.trim() ? "请输入真实姓名" : undefined),
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
                      真实姓名 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="请输入真实姓名"
                      autoComplete="name"
                      className={`h-10 ${field.state.meta.errors.length > 0 ? "border-red-400 focus-visible:ring-red-200" : "focus-visible:ring-blue-200 focus-visible:border-blue-400"}`}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-red-500">{field.state.meta.errors[0]?.toString()}</p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Email */}
              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    if (!value.trim()) return "请输入邮箱地址";
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "请输入有效的邮箱地址";
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
                      邮箱 <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="请输入邮箱地址"
                      autoComplete="email"
                      className={`h-10 ${field.state.meta.errors.length > 0 ? "border-red-400 focus-visible:ring-red-200" : "focus-visible:ring-blue-200 focus-visible:border-blue-400"}`}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-red-500">{field.state.meta.errors[0]?.toString()}</p>
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
                    <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
                      密码 <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id={field.name}
                        name={field.name}
                        type={showPassword ? "text" : "password"}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="请输入密码（至少 6 位）"
                        autoComplete="new-password"
                        className={`h-10 pr-10 ${field.state.meta.errors.length > 0 ? "border-red-400 focus-visible:ring-red-200" : "focus-visible:ring-blue-200 focus-visible:border-blue-400"}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-red-500">{field.state.meta.errors[0]?.toString()}</p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Role */}
              <form.Field name="role">
                {(field) => (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">角色</Label>
                    <div className="flex gap-2">
                      {ROLES.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => field.handleChange(value)}
                          className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                            field.state.value === value
                              ? "bg-blue-50 border-blue-400 text-blue-700"
                              : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
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
                        注册中...
                      </>
                    ) : (
                      "立即注册"
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              已有账号？{" "}
              <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                立即登录
              </a>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          注册即表示你同意我们的{" "}
          <a href="#" className="text-blue-500 hover:underline">服务条款</a>{" "}
          和{" "}
          <a href="#" className="text-blue-500 hover:underline">隐私政策</a>
        </p>
      </div>
    </div>
  );
}
