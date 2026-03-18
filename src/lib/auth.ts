export interface LoginPayload {
  username: string;
  password: string;
}

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

export function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}
