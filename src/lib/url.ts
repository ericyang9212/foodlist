// 只允許 http/https 連結，擋掉 javascript:、data: 等危險 scheme。
// 因為餐廳連結 / 來源連結是使用者自由輸入、且資料在帳號間共用，
// 若不過濾，有人存入 javascript: 連結，另一人點到就會被執行 = stored XSS。
export function safeHttpUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    // 不是合法的絕對網址
  }
  return undefined;
}
