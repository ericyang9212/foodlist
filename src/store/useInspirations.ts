import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Inspiration } from '../types';

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function fromRow(row: Record<string, unknown>): Inspiration {
  return {
    id: row.id as string,
    imageUrl: (row.image_url as string) ?? undefined,
    sourceUrl: (row.source_url as string) ?? undefined,
    platform: (row.platform as string) ?? undefined,
    note: (row.note as string) ?? undefined,
    convertedFoodId: (row.converted_food_id as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

function toRow(item: Inspiration) {
  return {
    id: item.id,
    image_url: item.imageUrl ?? null,
    source_url: item.sourceUrl ?? null,
    platform: item.platform ?? null,
    note: item.note ?? null,
    converted_food_id: item.convertedFoodId ?? null,
    created_at: item.createdAt,
  };
}

export function useInspirations() {
  const [items, setItems] = useState<Inspiration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('inspirations')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setItems(data.map(fromRow));
        setLoading(false);
      });
  }, []);

  // 上傳一張圖到 Supabase Storage，回傳 public URL
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${makeId()}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('inspirations')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('inspirations').getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const addInspiration = useCallback(async (input: Omit<Inspiration, 'id' | 'createdAt'>) => {
    const newItem: Inspiration = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    const { data, error } = await supabase
      .from('inspirations')
      .insert(toRow(newItem))
      .select()
      .single();
    if (data && !error) {
      const inserted = fromRow(data);
      setItems(prev => [inserted, ...prev]);
      return inserted;
    }
    throw error;
  }, []);

  const updateInspiration = useCallback(async (updated: Inspiration) => {
    const { data, error } = await supabase
      .from('inspirations')
      .update(toRow(updated))
      .eq('id', updated.id)
      .select()
      .single();
    if (data && !error) {
      setItems(prev => prev.map(i => i.id === updated.id ? fromRow(data) : i));
    }
  }, []);

  const deleteInspiration = useCallback(async (id: string) => {
    await supabase.from('inspirations').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  return { items, loading, uploadImage, addInspiration, updateInspiration, deleteInspiration };
}
