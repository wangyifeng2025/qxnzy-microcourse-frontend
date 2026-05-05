/** 与 CommunityPage 的「已加入」话题 id 缓存一致（含 localStorage） */

const COMMUNITY_JOINED_STORAGE_KEY = "community_joined_topic_ids";

export function readStoredJoinedTopicIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(COMMUNITY_JOINED_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function writeStoredJoinedTopicIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMMUNITY_JOINED_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export function addStoredJoinedTopicId(topicId: string): void {
  const s = readStoredJoinedTopicIds();
  s.add(topicId);
  writeStoredJoinedTopicIds(s);
}

export function removeStoredJoinedTopicId(topicId: string): void {
  const s = readStoredJoinedTopicIds();
  s.delete(topicId);
  writeStoredJoinedTopicIds(s);
}
