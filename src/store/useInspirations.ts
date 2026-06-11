import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { readCache, writeCache } from '../lib/cache';
import { compressImage } from '../lib/image';
import { deleteImageByUrl, uploadThumb } from '../lib/storage';
import { toast } from '../lib/toast';
import { makeId } from '../lib/id';
import type { Inspiration } from '../types';

const CACHE_KEY = 'cache_inspirations';

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
  const cached = readCache<Inspiration[]>(CACHE_KEY, []);
  const [items, setItemsRaw] = useState<Inspiration[]>(cached);
  const [loading, setLoading] = useState(cached.length === 0);

  const setItems = useCallback((updater: Inspiration[] | ((p: Inspiration[]) => Inspiration[])) => {
    setItemsRaw(prev => {
      const next = typeof updater === 'function' ? (updater as (p: Inspiration[]) => Inspiration[])(prev) : updater;
      writeCache(CACHE_KEY, next);
      return next;
    });
  }, []);

  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('inspirations')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = data.map(fromRow);
      setItemsRaw(mapped);
      writeCache(CACHE_KEY, mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // 即時同步：對方改了靈感（新增截圖、整理、刪除）就重新抓
  useEffect(() => {
    const ch = supabase
      .channel('rt-inspirations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspirations' }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  // 上傳一張圖（先壓縮）到 Supabase Storage；同時存一張 -thumb 縮圖給列表用
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const compressed = await compressImage(file);
    const ext = compressed.type === 'image/webp' ? 'webp' : compressed.type === 'image/jpeg' ? 'jpg' : (compressed.name.split('.').pop() || 'jpg');
    const base = `${makeId()}-${Date.now()}`;
    const path = `${base}.${ext}`;
    const { error } = await supabase.storage
      .from('inspirations')
      .upload(path, compressed, { contentType: compressed.type, upsert: false });
    if (error) {
      toast.error('圖片上傳失敗');
      throw error;
    }
    await uploadThumb('inspirations', base, ext, file);
    const { data } = supabase.storage.from('inspirations').getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const addInspiration = useCallback(async (input: Omit<Inspiration, 'id' | 'createdAt'>) => {
    const newItem: Inspiration = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    setItems(prev => [newItem, ...prev]); // optimistic
    const { data, error } = await supabase
      .from('inspirations')
      .insert(toRow(newItem))
      .select()
      .single();
    if (error || !data) {
      setItems(prev => prev.filter(i => i.id !== newItem.id)); // rollback
      toast.error('靈感收藏失敗，請再試一次');
      return null;
    }
    const inserted = fromRow(data);
    setItems(prev => prev.map(i => i.id === newItem.id ? inserted : i));
    return inserted;
  }, [setItems]);

  const updateInspiration = useCallback(async (updated: Inspiration) => {
    const before = items.find(i => i.id === updated.id);
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    const { data, error } = await supabase
      .from('inspirations')
      .update(toRow(updated))
      .eq('id', updated.id)
      .select()
      .single();
    if (error || !data) {
      if (before) setItems(prev => prev.map(i => i.id === updated.id ? before : i));
      toast.error('更新失敗');
      return;
    }
    setItems(prev => prev.map(i => i.id === updated.id ? fromRow(data) : i));
  }, [items, setItems]);

  const deleteInspiration = useCallback(async (id: string) => {
    const before = items;
    const target = items.find(i => i.id === id);
    setItems(prev => prev.filter(i => i.id !== id));
    const { error } = await supabase.from('inspirations').delete().eq('id', id);
    if (error) {
      setItems(before);
      toast.error('刪除失敗');
      return;
    }
    // 連 storage 的圖檔一起刪，避免孤兒佔額度
    await deleteImageByUrl(target?.imageUrl);
  }, [items, setItems]);

  return { items, loading, uploadImage, addInspiration, updateInspiration, deleteInspiration };
}
