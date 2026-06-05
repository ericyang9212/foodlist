import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { FoodItem, Status } from '../types';

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
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function useStore() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 初始載入
  useEffect(() => {
    supabase
      .from('food_items')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setItems(data.map(fromRow));
        setLoading(false);
      });
  }, []);

  const addItem = useCallback(async (item: FoodItem) => {
    const { data, error } = await supabase
      .from('food_items')
      .insert(toRow(item))
      .select()
      .single();
    if (data && !error) {
      setItems(prev => [fromRow(data), ...prev]);
    }
  }, []);

  const updateItem = useCallback(async (updated: FoodItem) => {
    const { data, error } = await supabase
      .from('food_items')
      .update(toRow(updated))
      .eq('id', updated.id)
      .select()
      .single();
    if (data && !error) {
      setItems(prev => prev.map(i => i.id === updated.id ? fromRow(data) : i));
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await supabase.from('food_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateStatus = useCallback(async (id: string, status: Status) => {
    const now = new Date().toISOString();
    await supabase
      .from('food_items')
      .update({ status, updated_at: now })
      .eq('id', id);
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, status, updatedAt: now } : i
    ));
  }, []);

  return { items, loading, addItem, updateItem, deleteItem, updateStatus };
}
