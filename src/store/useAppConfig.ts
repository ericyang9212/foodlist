import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface AppConfig {
  ready: boolean;
  maintenance: boolean;
  message?: string;
}

// 全站設定（目前只有維護旗標）。讀取失敗時 fail-open：當作正常營運，
// 不因一次網路抖動就把使用者鎖在維護畫面外。
export function useAppConfig(): AppConfig {
  const [state, setState] = useState<AppConfig>({ ready: false, maintenance: false });

  const apply = (row: { maintenance?: boolean; maintenance_message?: string | null } | null) => {
    setState({
      ready: true,
      maintenance: !!row?.maintenance,
      message: row?.maintenance_message ?? undefined,
    });
  };

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('app_config')
      .select('maintenance, maintenance_message')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (!cancelled) apply(data);
      });
    return () => { cancelled = true; };
  }, []);

  // 即時同步：旗標一翻，已開著的 client 立刻反應
  useEffect(() => {
    const ch = supabase
      .channel('rt-app-config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, payload => {
        apply(payload.new as { maintenance?: boolean; maintenance_message?: string | null });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return state;
}
