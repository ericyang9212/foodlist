import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { readCache, writeCache } from '../lib/cache';
import { patchList, descByString } from '../lib/realtime';
import { toast } from '../lib/toast';
import { makeId } from '../lib/id';
import type { Wish } from '../types';

const CACHE_KEY = 'cache_wishes';
const byCreatedDesc = descByString<Wish>(w => w.createdAt);

function fromRow(row: Record<string, unknown>): Wish {
  return {
    id: row.id as string,
    text: (row.text as string) ?? '',
    fulfilledAt: (row.fulfilled_at as string) ?? undefined,
    fulfilledNote: (row.fulfilled_note as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

// 許願池。跟留言板一樣是「一則一列」的單表，所以沿用同一套骨架：
// 樂觀更新 → 失敗回滾 + toast → 成功後用 server 回傳覆蓋，每個寫入都回傳成功與否。
// 願望不刪除也不過期——舊的留著就是你們的願望史。
export function useWishes() {
  const [items, setItemsRaw] = useState<Wish[]>(() => readCache<Wish[]>(CACHE_KEY, []));
  const [loading, setLoading] = useState(items.length === 0);

  const setItems = useCallback((updater: Wish[] | ((p: Wish[]) => Wish[])) => {
    setItemsRaw(prev => {
      const next = typeof updater === 'function' ? (updater as (p: Wish[]) => Wish[])(prev) : updater;
      writeCache(CACHE_KEY, next);
      return next;
    });
  }, []);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('wishes')
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

  // 即時同步：對方許的願立刻出現；斷線重連時補抓一次
  useEffect(() => {
    const subbedOnce = { v: false };
    const ch = supabase
      .channel('rt-wishes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wishes' }, payload => {
        setItems(prev => patchList(prev, payload, fromRow, byCreatedDesc));
      })
      .subscribe(status => {
        if (status !== 'SUBSCRIBED') return;
        if (subbedOnce.v) fetchAll();
        else subbedOnce.v = true;
      });
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll, setItems]);

  // 回傳成功與否：失敗時輸入框要留住內容讓使用者重送，不能假裝許成功了
  const addWish = useCallback(async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const newOne: Wish = { id: makeId(), text: trimmed, createdAt: new Date().toISOString() };
    setItems(prev => [newOne, ...prev]); // optimistic
    const { data, error } = await supabase
      .from('wishes')
      .insert({ id: newOne.id, text: newOne.text, created_at: newOne.createdAt })
      .select()
      .single();
    if (error || !data) {
      setItems(prev => prev.filter(w => w.id !== newOne.id)); // rollback
      toast.error('許願失敗，請再試一次');
      return false;
    }
    const inserted = fromRow(data);
    // 樂觀列可能已被並發的 realtime 重抓洗掉 → 不在就補回
    setItems(prev => prev.some(w => w.id === newOne.id)
      ? prev.map(w => w.id === newOne.id ? inserted : w)
      : [inserted, ...prev].sort(byCreatedDesc));
    return true;
  }, [setItems]);

  const deleteWish = useCallback(async (id: string): Promise<boolean> => {
    let removed: Wish | undefined;
    setItems(prev => {
      removed = prev.find(w => w.id === id);
      return prev.filter(w => w.id !== id);
    });
    const { error } = await supabase.from('wishes').delete().eq('id', id);
    if (error) {
      if (removed) setItems(prev => [removed!, ...prev].sort(byCreatedDesc)); // rollback
      toast.error('刪除願望失敗，請再試一次');
      return false;
    }
    return true;
  }, [setItems]);

  // 標記實現。足跡是另外寫的（見 App.tsx 的 handleFulfillWish），這裡只動願望本身，
  // 好讓呼叫端能在足跡寫入失敗時單獨回滾這一步。
  const fulfillWish = useCallback(async (
    id: string, fulfilledAt: string, note?: string
  ): Promise<boolean> => {
    let before: Wish | undefined;
    setItems(prev => {
      before = prev.find(w => w.id === id);
      return prev.map(w => w.id === id ? { ...w, fulfilledAt, fulfilledNote: note } : w);
    });
    const { data, error } = await supabase
      .from('wishes')
      .update({ fulfilled_at: fulfilledAt, fulfilled_note: note ?? null })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) {
      if (before) setItems(prev => prev.map(w => w.id === id ? before! : w)); // rollback
      toast.error('標記實現失敗，請再試一次');
      return false;
    }
    const updated = fromRow(data);
    setItems(prev => prev.map(w => w.id === id ? updated : w));
    return true;
  }, [setItems]);

  // 反悔：只解除願望的實現狀態。已經產生的足跡不刪——那是真的發生過的事，
  // 要刪得去足跡那邊自己刪。
  const unfulfillWish = useCallback(async (id: string): Promise<boolean> => {
    let before: Wish | undefined;
    setItems(prev => {
      before = prev.find(w => w.id === id);
      return prev.map(w => w.id === id ? { ...w, fulfilledAt: undefined, fulfilledNote: undefined } : w);
    });
    const { data, error } = await supabase
      .from('wishes')
      .update({ fulfilled_at: null, fulfilled_note: null })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) {
      if (before) setItems(prev => prev.map(w => w.id === id ? before! : w)); // rollback
      toast.error('取消實現失敗，請再試一次');
      return false;
    }
    const updated = fromRow(data);
    setItems(prev => prev.map(w => w.id === id ? updated : w));
    return true;
  }, [setItems]);

  return { items, loading, addWish, deleteWish, fulfillWish, unfulfillWish };
}
