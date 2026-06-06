import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { readCache, writeCache } from '../lib/cache';
import { compressImage } from '../lib/image';
import { toast } from '../lib/toast';
import type { Foodprint } from '../types';

const CACHE_KEY = 'cache_foodprints';

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function fromRow(row: Record<string, unknown>): Foodprint {
  return {
    id: row.id as string,
    foodId: row.food_id as string,
    foodName: row.food_name as string,
    cuisineType: (row.cuisine_type as string) ?? undefined,
    restaurantName: (row.restaurant_name as string) ?? undefined,
    restaurantCity: (row.restaurant_city as string) ?? undefined,
    restaurantArea: (row.restaurant_area as string) ?? undefined,
    restaurantAddress: (row.restaurant_address as string) ?? undefined,
    restaurantLat: (row.restaurant_lat as number) ?? undefined,
    restaurantLng: (row.restaurant_lng as number) ?? undefined,
    restaurantMapsUrl: (row.restaurant_maps_url as string) ?? undefined,
    ateAt: row.ate_at as string,
    photoUrl: (row.photo_url as string) ?? undefined,
    note: (row.note as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

function toRow(p: Foodprint) {
  return {
    id: p.id,
    food_id: p.foodId,
    food_name: p.foodName,
    cuisine_type: p.cuisineType ?? null,
    restaurant_name: p.restaurantName ?? null,
    restaurant_city: p.restaurantCity ?? null,
    restaurant_area: p.restaurantArea ?? null,
    restaurant_address: p.restaurantAddress ?? null,
    restaurant_lat: p.restaurantLat ?? null,
    restaurant_lng: p.restaurantLng ?? null,
    restaurant_maps_url: p.restaurantMapsUrl ?? null,
    ate_at: p.ateAt,
    photo_url: p.photoUrl ?? null,
    note: p.note ?? null,
    created_at: p.createdAt,
  };
}

export function useFoodprints() {
  const cached = readCache<Foodprint[]>(CACHE_KEY, []);
  const [items, setItemsRaw] = useState<Foodprint[]>(cached);
  const [loading, setLoading] = useState(cached.length === 0);

  const setItems = useCallback((updater: Foodprint[] | ((p: Foodprint[]) => Foodprint[])) => {
    setItemsRaw(prev => {
      const next = typeof updater === 'function' ? (updater as (p: Foodprint[]) => Foodprint[])(prev) : updater;
      writeCache(CACHE_KEY, next);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('foodprints')
      .select('*')
      .order('ate_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          const mapped = data.map(fromRow);
          setItemsRaw(mapped);
          writeCache(CACHE_KEY, mapped);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadPhoto = useCallback(async (file: File): Promise<string> => {
    const compressed = await compressImage(file);
    const path = `${makeId()}-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from('foodprints')
      .upload(path, compressed, { contentType: compressed.type, upsert: false });
    if (error) {
      toast.error('照片上傳失敗');
      throw error;
    }
    const { data } = supabase.storage.from('foodprints').getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const addFoodprint = useCallback(async (input: Omit<Foodprint, 'id' | 'createdAt'>) => {
    const newOne: Foodprint = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    setItems(prev => [newOne, ...prev]); // optimistic
    const { data, error } = await supabase
      .from('foodprints')
      .insert(toRow(newOne))
      .select()
      .single();
    if (error || !data) {
      setItems(prev => prev.filter(i => i.id !== newOne.id)); // rollback
      toast.error('足跡記錄失敗，請再試一次');
      return null;
    }
    const inserted = fromRow(data);
    setItems(prev => prev.map(i => i.id === newOne.id ? inserted : i));
    return inserted;
  }, [setItems]);

  const deleteFoodprint = useCallback(async (id: string) => {
    const before = items;
    setItems(prev => prev.filter(i => i.id !== id));
    const { error } = await supabase.from('foodprints').delete().eq('id', id);
    if (error) {
      setItems(before);
      toast.error('刪除失敗');
    }
  }, [items, setItems]);

  return { items, loading, uploadPhoto, addFoodprint, deleteFoodprint };
}
