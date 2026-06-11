import { supabase } from './supabase';
import { compressImage } from './image';

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

// 刪除一張圖的實體檔（含同名 -thumb 縮圖，避免 storage 孤兒洩漏）。
// 失敗只記 log，不擋主流程。
export async function deleteImageByUrl(url?: string | null): Promise<void> {
  if (!url) return;
  const parsed = parseStorageUrl(url);
  if (!parsed) return;
  const paths = [parsed.path];
  const m = parsed.path.match(/^(.*)(\.[A-Za-z0-9]+)$/);
  if (m) paths.push(`${m[1]}-thumb${m[2]}`);
  try {
    await supabase.storage.from(parsed.bucket).remove(paths);
  } catch (e) {
    console.warn('deleteImageByUrl failed', e);
  }
}

// 上傳列表用縮圖（~320px，與主圖同名 + -thumb 後綴）。
// 縮圖只是加速列表，失敗或不適用（gif、極小圖）就跳過，UI 會退回主圖。
export async function uploadThumb(bucket: string, base: string, mainExt: string, original: File): Promise<void> {
  try {
    const thumb = await compressImage(original, { maxEdge: 320, quality: 0.6 });
    if (thumb === original) return; // 沒壓成（gif / 非圖片 / 本來就小），不值得多存一份
    const thumbExt = thumb.type === 'image/webp' ? 'webp' : thumb.type === 'image/jpeg' ? 'jpg' : null;
    // 副檔名要跟主圖一致，縮圖 URL 才推導得出來
    if (!thumbExt || thumbExt !== mainExt) return;
    await supabase.storage
      .from(bucket)
      .upload(`${base}-thumb.${thumbExt}`, thumb, { contentType: thumb.type, upsert: false });
  } catch (e) {
    console.warn('uploadThumb failed (non-fatal)', e);
  }
}
