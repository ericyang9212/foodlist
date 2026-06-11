import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface MarqueeData {
  text: string;
  speed: number; // 秒，跑完一圈所需時間（越小越快）
}

export function useMarquee() {
  const [data, setData] = useState<MarqueeData>({ text: '', speed: 30 });
  const [loading, setLoading] = useState(true);

  const fetchOne = useCallback(async () => {
    const { data } = await supabase
      .from('marquee')
      .select('text, speed_seconds')
      .eq('id', 1)
      .single();
    if (data) {
      setData({
        text: (data.text as string) ?? '',
        speed: (data.speed_seconds as number) ?? 30,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  // 即時同步：對方改了跑馬燈馬上看到
  useEffect(() => {
    const ch = supabase
      .channel('rt-marquee')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marquee' }, () => {
        fetchOne();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchOne]);

  const update = useCallback(async (next: MarqueeData) => {
    setData(next);
    await supabase
      .from('marquee')
      .update({
        text: next.text,
        speed_seconds: next.speed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
  }, []);

  return { data, loading, update };
}
