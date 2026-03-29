/**
 * 课程封面：与 MinIO 管理路径 course-covers/ 对齐，cover_image_url 存 object key。
 */

export function looksLikeHttpUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

/**
 * 提交到后端的 cover_image_url：应为 object key（course-covers/…）。
 * 若误粘贴完整 URL，仅当路径中含 course-covers/ 时解析为 key；否则返回 null。
 */
export function normalizeCoverImageUrlForSave(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (looksLikeHttpUrl(v)) {
    try {
      const u = new URL(v);
      const path = u.pathname.replace(/^\/+/, "");
      const idx = path.indexOf("course-covers/");
      if (idx >= 0) return path.slice(idx);
    } catch {
      return null;
    }
    return null;
  }
  return v.replace(/^\/+/, "");
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

type UploadUrlResponse = {
  upload_url?: string;
  object_key?: string;
  message?: string;
};

/**
 * 预签名上传：PUT → confirm，用于创建课程后或已有课程 id。
 */
export async function uploadCourseCoverViaPresign(
  courseId: string,
  file: File,
  token: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const urlRes = await fetch(`/api/courses/${courseId}/cover/upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ filename: file.name }),
  });
  const urlBody = (await safeJson(urlRes)) as UploadUrlResponse;
  if (!urlRes.ok) {
    throw new Error(
      urlBody?.message ?? `申请封面上传地址失败 (${urlRes.status})`,
    );
  }
  const uploadUrl = urlBody.upload_url;
  const objectKey = urlBody.object_key;
  if (!uploadUrl || !objectKey) {
    throw new Error("申请封面上传地址成功但返回数据不完整");
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !onProgress) return;
      onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`上传封面到对象存储失败 (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("上传封面失败（网络错误）"));
    xhr.send(file);
  });

  const confirmRes = await fetch(`/api/courses/${courseId}/cover/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ object_key: objectKey }),
  });
  const confirmBody = await safeJson(confirmRes);
  if (!confirmRes.ok) {
    throw new Error(
      (confirmBody as { message?: string })?.message ??
        `确认封面失败 (${confirmRes.status})`,
    );
  }
}

/** 删除 MinIO 中 course-covers/ 下封面并清空库字段 */
export async function deleteCourseCover(
  courseId: string,
  token: string,
): Promise<void> {
  const res = await fetch(`/api/courses/${courseId}/cover`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await safeJson(res);
  if (!res.ok && res.status !== 404) {
    throw new Error(
      (body as { message?: string })?.message ??
        `删除封面失败 (${res.status})`,
    );
  }
}
