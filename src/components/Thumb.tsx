import { useState } from 'react';
import { thumbUrlFor } from '../lib/image';

// 列表縮圖：先載小圖（-thumb 檔，流量省 80%+），沒有縮圖（舊圖）就退回主圖。
// 顯示的 URL 用推導的（不靠 effect 同步）：記住「哪個 src 的縮圖載失敗」，
// src 換了自然重新嘗試縮圖。
export function Thumb({ src, alt = '', className }: { src: string; alt?: string; className?: string }) {
  const small = thumbUrlFor(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const useSmall = small != null && failedSrc !== src;
  const current = useSmall ? small : src;

  return (
    <img
      src={current}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => { if (useSmall) setFailedSrc(src); }}
    />
  );
}
