export interface LoginPayload {
  username: string;
  password: string;
}

/** 公开注册页固定为 Student；Teacher/Admin 由管理员在后台创建或调整角色 */
export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role: string;
  real_name: string;
}

export interface UserInfo {
  id?: string;
  username: string;
  email?: string;
  role: string;
  real_name: string;
  avatar_url?: string | null;
  /** 管理员重置密码后为 true，用户自行修改后清除为 false */
  password_reset_required?: boolean;
}

export interface AuthResponse {
  token?: string;
  token_type?: string;
  expires_at?: number;
  user?: UserInfo;
  message?: string;
  [key: string]: unknown;
}

export async function loginApi(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message ?? `登录失败 (${res.status})`);
  }
  return data;
}

export async function registerApi(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message ?? `注册失败 (${res.status})`);
  }
  return data;
}

export function saveAuthResponse(res: AuthResponse) {
  if (res.token) {
    localStorage.setItem("auth_token", res.token);
  }
  if (res.user) {
    localStorage.setItem("auth_user", JSON.stringify(res.user));
  }
}

// Keep for backward compat
export function saveToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function getUser(): UserInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/**
 * 将从后端拉取的最新 profile 写回 localStorage 并广播 storage 事件，
 * 确保所有组件（Sidebar 等）能感知到字段变化。
 */
export function saveUserInfo(user: UserInfo) {
  if (typeof window === "undefined") return;
  localStorage.setItem("auth_user", JSON.stringify(user));
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "auth_user",
      newValue: JSON.stringify(user),
    }),
  );
}

/**
 * 用户自行修改密码成功后调用，清除本地缓存的 password_reset_required 标记。
 */
export function clearPasswordResetRequired() {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem("auth_user");
  if (!raw) return;
  try {
    const user = JSON.parse(raw) as UserInfo;
    user.password_reset_required = false;
    saveUserInfo(user);
  } catch {
    // ignore
  }
}

export function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}
