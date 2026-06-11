// 「冷宮」：想吃清單躺超過這個天數還沒吃，視為冷宮（要嘛吃、要嘛放生）
export const STALE_DAYS = 90;

export function staleDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

export function isStale(createdAt: string): boolean {
  return staleDays(createdAt) >= STALE_DAYS;
}

// 躺了多久的標籤；未達冷宮門檻回傳 null
export function staleLabel(createdAt: string): string | null {
  const days = staleDays(createdAt);
  if (days < STALE_DAYS) return null;
  if (days >= 365) return `${Math.floor(days / 365)} 年`;
  return `${Math.floor(days / 30)} 個月`;
}
