import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { readCache, writeCache } from '../lib/cache';
import { patchList, descByString } from '../lib/realtime';
import { toast } from '../lib/toast';
import type { FoodItem, Status } from '../types';

const byCreatedDesc = descByString<FoodItem>(i => i.createdAt);

const CACHE_KEY = 'cache_food_items';

// 把 DB row 轉成 app 用的格式
function fromRow(row: Record<string, unknown>): FoodItem {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    status: row.status as Status,
    cuisineType: row.cuisine_type as string | undefined,
    occasions: (row.occasions as FoodItem['occasions']) ?? [],
    restaurants: (row.restaurants as FoodItem['restaurants']) ?? [],
    mustOrder: (row.must_order as string[]) ?? [],
    notes: row.notes as string | undefined,
    waitTime: row.wait_time as string | undefined,
    rating: row.rating as FoodItem['rating'],
    inspirationIds: (row.inspiration_ids as string[]) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// 把 app 格式轉成 DB row
function toRow(item: FoodItem) {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    status: item.status,
    cuisine_type: item.cuisineType ?? null,
    occasions: item.occasions,
    restaurants: item.restaurants,
    must_order: item.mustOrder,
    notes: item.notes ?? null,
    wait_time: item.waitTime ?? null,
    rating: item.rating ?? null,
    inspiration_ids: item.inspirationIds ?? null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function useStore() {
  // 冷啟動先用快取資料，畫面立即可見（惰性初始化：只在掛載時讀一次 localStorage）
  const [items, setItemsRaw] = useState<FoodItem[]>(() => readCache<FoodItem[]>(CACHE_KEY, []));
  const [loading, setLoading] = useState(items.length === 0);
  const hadCache = useRef(items.length > 0);

  // 統一更新並寫快取
  const setItems = useCallback((updater: FoodItem[] | ((prev: FoodItem[]) => FoodItem[])) => {
    setItemsRaw(prev => {
      const next = typeof updater === 'function' ? (updater as (p: FoodItem[]) => FoodItem[])(prev) : updater;
      writeCache(CACHE_KEY, next);
      return next;
    });
  }, []);

  // 從 server 抓最新（初次載入與 realtime 事件共用）
  const fetchAll = useCallback(async (opts?: { silent?: boolean }) => {
    const { data, error } = await supabase
      .from('food_items')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      // 有快取就靜默用快取；完全沒資料才提示
      if (!opts?.silent && !hadCache.current) toast.error('載入失敗，請檢查網路後重新整理');
    } else if (data) {
      const mapped = data.map(fromRow);
      setItemsRaw(mapped);
      writeCache(CACHE_KEY, mapped);
    }
    setLoading(false);
  }, []);

  // 背景同步
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // 即時同步：用 payload 就地 patch（不整表重抓）；斷線重連時補抓一次以免漏接
  useEffect(() => {
    const subbedOnce = { v: false };
    const ch = supabase
      .channel('rt-food-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_items' }, payload => {
        setItems(prev => patchList(prev, payload, fromRow, byCreatedDesc));
      })
      .subscribe(status => {
        if (status !== 'SUBSCRIBED') return;
        if (subbedOnce.v) fetchAll({ silent: true });
        else subbedOnce.v = true;
      });
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll, setItems]);

  const addItem = useCallback(async (item: FoodItem): Promise<boolean> => {
    // optimistic
    setItems(prev => [item, ...prev]);
    const { data, error } = await supabase
      .from('food_items')
      .insert(toRow(item))
      .select()
      .single();
    if (error || !data) {
      setItems(prev => prev.filter(i => i.id !== item.id)); // rollback
      toast.error('新增失敗，請再試一次');
      return false;
    }
    // 若樂觀列已被並發的 realtime 重抓洗掉，map 會找不到 → 直接補回，避免新項目從畫面消失
    setItems(prev => prev.some(i => i.id === item.id)
      ? prev.map(i => i.id === item.id ? fromRow(data) : i)
      : [fromRow(data), ...prev]);
    return true;
  }, [setItems]);

  const updateItem = useCallback(async (updated: FoodItem): Promise<boolean> => {
    const before = items.find(i => i.id === updated.id);
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i)); // optimistic
    const { data, error } = await supabase
      .from('food_items')
      .update(toRow(updated))
      .eq('id', updated.id)
      .select()
      .single();
    if (error || !data) {
      if (before) setItems(prev => prev.map(i => i.id === updated.id ? before : i)); // rollback
      toast.error('儲存失敗，請再試一次');
      return false;
    }
    setItems(prev => prev.map(i => i.id === updated.id ? fromRow(data) : i));
    return true;
  }, [items, setItems]);

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    const before = items;
    setItems(prev => prev.filter(i => i.id !== id)); // optimistic
    const { error } = await supabase.from('food_items').delete().eq('id', id);
    if (error) {
      setItems(before); // rollback
      toast.error('刪除失敗，請再試一次');
      return false;
    }
    return true;
  }, [items, setItems]);

  const updateStatus = useCallback(async (id: string, status: Status): Promise<boolean> => {
    const before = items.find(i => i.id === id);
    const now = new Date().toISOString();
    setItems(prev => prev.map(i => i.id === id ? { ...i, status, updatedAt: now } : i));
    const { error } = await supabase
      .from('food_items')
      .update({ status, updated_at: now })
      .eq('id', id);
    if (error) {
      if (before) setItems(prev => prev.map(i => i.id === id ? before : i));
      toast.error('狀態更新失敗');
      return false;
    }
    return true;
  }, [items, setItems]);

  return { items, loading, addItem, updateItem, deleteItem, updateStatus };
}
