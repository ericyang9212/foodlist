import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Row = Record<string, unknown>;

// 用 realtime payload 就地增 / 改 / 刪本地列表，免去每次事件都整表重抓。
// 自己的寫入回聲也會走這裡，且為冪等（用 server 版本覆蓋同 id），不會造成多餘查詢。
export function patchList<T extends { id: string }>(
  list: T[],
  payload: RealtimePostgresChangesPayload<Row>,
  fromRow: (row: Row) => T,
  cmp: (a: T, b: T) => number,
): T[] {
  if (payload.eventType === 'DELETE') {
    const id = (payload.old as Row)?.id as string | undefined;
    return id ? list.filter(i => i.id !== id) : list;
  }
  if (!payload.new || typeof payload.new !== 'object') return list;
  const row = fromRow(payload.new as Row);
  return [row, ...list.filter(i => i.id !== row.id)].sort(cmp);
}

// 字串時間欄位的降冪比較（ISO 時間字串可直接字典序比較）
export function descByString<T>(key: (x: T) => string) {
  return (a: T, b: T) => {
    const av = key(a), bv = key(b);
    return av < bv ? 1 : av > bv ? -1 : 0;
  };
}
