import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { readCache, writeCache } from '../lib/cache';
import { patchList, descByString } from '../lib/realtime';
import { toast } from '../lib/toast';
import { makeId } from '../lib/id';

export interface MarqueeMessage {
  id: string;
  text: string;
  createdAt: string;
}

const CACHE_KEY = 'cache_marquee_messages';
const byCreatedDesc = descByString<MarqueeMessage>(m => m.createdAt);

function fromRow(row: Record<string, unknown>): MarqueeMessage {
  return {
    id: row.id as string,
    text: (row.text as string) ?? '',
    createdAt: row.created_at as string,
  };
}

// 跑馬燈留言板。原本是 marquee 單一列裡的多行文字，兩人同時編輯會互相蓋掉；
// 改成一則一列之後，各自新增互不干擾，刪掉一則也不影響其他則。
export function useMarqueeMessages() {
  const [items, setItemsRaw] = useState<MarqueeMessage[]>(() => readCache<MarqueeMessage[]>(CACHE_KEY, []));
  const [loading, setLoading] = useState(items.length === 0);

  const setItems = useCallback((updater: MarqueeMessage[] | ((p: MarqueeMessage[]) => MarqueeMessage[])) => {
    setItemsRaw(prev => {
      const next = typeof updater === 'function' ? (updater as (p: MarqueeMessage[]) => MarqueeMessage[])(prev) : updater;
      writeCache(CACHE_KEY, next);
      return next;
    });
  }, []);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('marquee_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = data.map(fromRow);
      setItemsRaw(mapped);
      writeCache(CACHE_KEY, mapped);
    }
    setLoading(false);
  }, []);

  // 首載抓資料（setState 發生在 await 之後，非同步、不會同步串聯 render）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  // 即時同步：對方留言立刻出現在你的跑馬燈上；斷線重連時補抓一次
  useEffect(() => {
    const subbedOnce = { v: false };
    const ch = supabase
      .channel('rt-marquee-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marquee_messages' }, payload => {
        setItems(prev => patchList(prev, payload, fromRow, byCreatedDesc));
      })
      .subscribe(status => {
        if (status !== 'SUBSCRIBED') return;
        if (subbedOnce.v) fetchAll();
        else subbedOnce.v = true;
      });
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll, setItems]);

  // 回傳成功與否：失敗時輸入框要留住內容讓使用者重送，不能假裝送出去了
  const addMessage = useCallback(async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const newItem: MarqueeMessage = { id: makeId(), text: trimmed, createdAt: new Date().toISOString() };
    setItems(prev => [newItem, ...prev]); // optimistic
    const { data, error } = await supabase
      .from('marquee_messages')
      .insert({ id: newItem.id, text: newItem.text, created_at: newItem.createdAt })
      .select()
      .single();
    if (error || !data) {
      setItems(prev => prev.filter(i => i.id !== newItem.id)); // rollback
      toast.error('留言送出失敗，請再試一次');
      return false;
    }
    const inserted = fromRow(data);
    // 樂觀列可能已被並發的 realtime 重抓洗掉 → 不在就補回
    setItems(prev => prev.some(i => i.id === newItem.id)
      ? prev.map(i => i.id === newItem.id ? inserted : i)
      : [inserted, ...prev].sort(byCreatedDesc));
    return true;
  }, [setItems]);

  const deleteMessage = useCallback(async (id: string): Promise<boolean> => {
    let removed: MarqueeMessage | undefined;
    setItems(prev => {
      removed = prev.find(i => i.id === id);
      return prev.filter(i => i.id !== id);
    });
    const { error } = await supabase.from('marquee_messages').delete().eq('id', id);
    if (error) {
      if (removed) setItems(prev => [removed!, ...prev].sort(byCreatedDesc)); // rollback
      toast.error('刪除留言失敗，請再試一次');
      return false;
    }
    return true;
  }, [setItems]);

  return { items, loading, addMessage, deleteMessage };
}
