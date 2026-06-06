import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Foodprint } from '../types';

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
  const [items, setItems] = useState<Foodprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('foodprints')
      .select('*')
      .order('ate_at', { ascending: false })
      .then(({ data }) => {
        if (data) setItems(data.map(fromRow));
        setLoading(false);
      });
  }, []);

  const uploadPhoto = useCallback(async (file: File): Promise<string> => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${makeId()}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('foodprints')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('foodprints').getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const addFoodprint = useCallback(async (input: Omit<Foodprint, 'id' | 'createdAt'>) => {
    const newOne: Foodprint = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    const { data, error } = await supabase
      .from('foodprints')
      .insert(toRow(newOne))
      .select()
      .single();
    if (data && !error) {
      const inserted = fromRow(data);
      setItems(prev => [inserted, ...prev]);
      return inserted;
    }
    throw error;
  }, []);

  const deleteFoodprint = useCallback(async (id: string) => {
    await supabase.from('foodprints').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  return { items, loading, uploadPhoto, addFoodprint, deleteFoodprint };
}
