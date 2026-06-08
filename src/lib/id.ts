// 產生唯一 ID。這些 ID 會直接當資料庫主鍵與 storage 檔名，
// 用 Math.random() 太短（約 41 bits）容易碰撞、也可被猜測，
// 因此優先使用密碼學安全的 randomUUID，舊環境才退回 random+timestamp。
export function makeId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore，往下退回
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
