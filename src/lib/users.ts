export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  real_name: string;
  avatar_url: string | null;
}

const API_BASE =
  typeof window === "undefined" ? "http://127.0.0.1:8080" : "";

export async function fetchUser(id: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    next: { revalidate: 300 }, // cache user info for 5min
  });
  if (res.status === 404) throw new Error("USER_NOT_FOUND");
  if (!res.ok) throw new Error(`获取用户信息失败: ${res.status}`);
  return res.json() as Promise<UserProfile>;
}
