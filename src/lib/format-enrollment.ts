/** 选课人数展示：不足 1000 显示确切整数；≥1000 使用 xk / x.xk（去掉多余 .0） */

function formatKThousands(n: number): string {
  const k = n / 1000;
  const rounded = Math.round(k * 10) / 10;
  if (Number.isInteger(rounded)) return `${rounded}k`;
  return `${rounded.toFixed(1).replace(/\.0$/, "")}k`;
}

export function formatStudyingCount(count: number): string {
  const n = Math.max(0, Math.floor(count));
  if (n < 1000) return `${n}人正在学`;
  return `${formatKThousands(n)}人正在学`;
}

export function formatStudentBadgeCount(count: number): string {
  const n = Math.max(0, Math.floor(count));
  if (n < 1000) return `${n} 名学员`;
  return `${formatKThousands(n)} 名学员`;
}
