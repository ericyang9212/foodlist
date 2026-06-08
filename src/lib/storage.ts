import { supabase } from './supabase';

// 從 Supabase public URL 反推 bucket + path
// 格式：https://xxx.supabase.co/storage/v1/object/public/{bucket}/{path}
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const marker = '/storage/v1/object/public/';
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const rest = url.slice(i + marker.length);
  const slash = rest.indexOf('/');
  if (slash === -1) return null;
  return {
    bucket: rest.slice(0, slash),
    path: decodeURIComponent(rest.slice(slash + 1)),
  };
}

// 刪除一張圖的實體檔（避免 storage 孤兒洩漏）。失敗只記 log，不擋主流程。
export async function deleteImageByUrl(url?: string | null): Promise<void> {
  if (!url) return;
  const parsed = parseStorageUrl(url);
  if (!parsed) return;
  try {
    await supabase.storage.from(parsed.bucket).remove([parsed.path]);
  } catch (e) {
    console.warn('deleteImageByUrl failed', e);
  }
}
