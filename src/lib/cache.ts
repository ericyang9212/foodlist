// 輕量 localStorage 快取：冷啟動先顯示上次資料，再背景同步
export function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 配額滿或無法寫入時靜默略過（快取非必要）
  }
}
