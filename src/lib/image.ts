// 上傳前壓縮圖片：長邊縮到 maxEdge、優先輸出 WebP（比 JPEG 小 25-35%）
// 大幅降低每張照片大小，省 storage 額度與流量
export async function compressImage(
  file: File,
  opts: { maxEdge?: number; quality?: number } = {}
): Promise<File> {
  const { maxEdge = 1280, quality = 0.72 } = opts;

  // 非圖片或 gif（動圖壓了會壞）直接回傳原檔
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));

    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    // 優先嘗試 WebP，不支援則退回 JPEG
    let blob = await canvasToBlob(canvas, 'image/webp', quality);
    let type = 'image/webp';
    let ext = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      type = 'image/jpeg';
      ext = 'jpg';
    }
    if (!blob) return file;

    // 壓完反而更大就用原檔
    if (blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.' + ext;
    return new File([blob], newName, { type, lastModified: Date.now() });
  } catch (e) {
    console.warn('compressImage failed, using original', e);
    return file;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(b => resolve(b), type, quality));
}
