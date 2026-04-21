'use client';
import { useState, useEffect, useCallback } from 'react';

export interface BmtEntity { id: string; }

export function useApiEntity<T extends BmtEntity>(entity: string) {
  const [items, setItems]   = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/bmt/${entity}?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setItems(Array.isArray(json) ? json : []);
      }
    } finally { setLoading(false); }
  }, [entity]);

  useEffect(() => { 
    load(); 
    const handleFocus = () => load();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [load]);

  const add = useCallback(async (data: Omit<T, 'id'>) => {
    const res = await fetch(`/api/bmt/${entity}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) { 
      const item = await res.json(); 
      setItems(prev => [...prev, item]); 
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown Error' }));
      alert('Failed to add: ' + (err.error || 'Server error'));
    }
  }, [entity]);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/bmt/${entity}/${id}`, { method: 'DELETE' });
    if (res.ok) setItems(prev => prev.filter(i => i.id !== id));
  }, [entity]);

  const update = useCallback(async (id: string, patch: Partial<T>) => {
    const res = await fetch(`/api/bmt/${entity}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }, [entity]);

  return { items, loading, add, remove, update, reload: load };
}
