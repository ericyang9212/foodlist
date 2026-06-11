import { useEffect, useState } from 'react';
import { thumbUrlFor } from '../lib/image';

// 列表縮圖：先載小圖（-thumb 檔，流量省 80%+），沒有縮圖（舊圖）就退回主圖
export function Thumb({ src, alt = '', className }: { src: string; alt?: string; className?: string }) {
  const small = thumbUrlFor(src);
  const [current, setCurrent] = useState(small ?? src);

  useEffect(() => {
    setCurrent(small ?? src);
  }, [small, src]);

  return (
    <img
      src={current}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => { if (current !== src) setCurrent(src); }}
    />
  );
}
