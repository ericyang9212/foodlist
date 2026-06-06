// 上傳前壓縮圖片：長邊縮到 maxEdge、輸出 JPEG，大幅降低檔案大小
export async function compressImage(
  file: File,
  opts: { maxEdge?: number; quality?: number } = {}
): Promise<File> {
  const { maxEdge = 1600, quality = 0.82 } = opts;

  // 非圖片或 gif（動圖壓了會壞）直接回傳原檔
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));

    // 已經夠小且非高品質格式就不重壓
    if (scale === 1 && file.size < 600 * 1024) {
      bitmap.close?.();
      return file;
    }

    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob: Blob | null = await new Promise(resolve =>
      canvas.toBlob(b => resolve(b), 'image/jpeg', quality)
    );
    if (!blob) return file;

    // 壓完反而更大就用原檔
    if (blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (e) {
    console.warn('compressImage failed, using original', e);
    return file;
  }
}
