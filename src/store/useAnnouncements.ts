import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export interface Announcement {
  id: string;
  title: string;
  body?: string;
  priority: number;
  createdAt: string;
}

const READ_KEY = 'announcements_read_ids';

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids)));
}

function fromRow(row: Record<string, unknown>): Announcement {
  return {
    id: row.id as string,
    title: row.title as string,
    body: (row.body as string) ?? undefined,
    priority: (row.priority as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

export function useAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);

  useEffect(() => {
    supabase
      .from('announcements')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setItems(data.map(fromRow));
      });
  }, []);

  const unreadCount = useMemo(
    () => items.filter(i => !readIds.has(i.id)).length,
    [items, readIds]
  );

  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      items.forEach(i => next.add(i.id));
      saveReadIds(next);
      return next;
    });
  }, [items]);

  return { items, readIds, unreadCount, markRead, markAllRead };
}
