'use client';
import { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
export type Division  = { id: string; name: string };
export type City      = { id: string; name: string; divisionId: string };
export type Sport     = { id: string; name: string };
export type Amenity   = { id: string; name: string };
export type TurfStatus = 'pending' | 'published' | 'rejected';
export type RevenueModel = { type: 'percentage' | 'monthly'; value: number };

export type Turf = {
  id: string;
  name: string;
  divisionId: string;
  cityId: string;
  area: string;
  sportIds: string[];
  amenityIds: string[];
  logoUrl: string;
  imageUrls: string[];
  mapLink: string;
  ownerId: string;
  ownerName: string;
  status: TurfStatus;
  revenueModel?: RevenueModel;
  createdAt: string;
};

export type Owner = { id: string; name: string; email: string; phone: string; joinedAt: string };

// ── Storage keys ───────────────────────────────────────────────────────────────
const KEYS = {
  divisions: 'bmt_divisions',
  cities:    'bmt_cities',
  sports:    'bmt_sports',
  amenities: 'bmt_amenities',
  turfs:     'bmt_turfs',
  owners:    'bmt_owners',
};

// ── Seeds ──────────────────────────────────────────────────────────────────────
const SEED_DIVISIONS: Division[]  = [];
const SEED_CITIES:    City[]      = [];
const SEED_SPORTS:    Sport[]     = [];
const SEED_AMENITIES: Amenity[]   = [];
const SEED_OWNERS: Owner[] = [];

function read<T>(key: string, seed: T[]): T[] {
  if (typeof window === 'undefined') return seed;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : seed;
  } catch { return seed; }
}
function write<T>(key: string, value: T[]) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ── Generic CRUD hook ──────────────────────────────────────────────────────────
function useCRUD<T extends { id: string }>(key: string, seed: T[]) {
  // Lazy initializer: reads localStorage synchronously on the client,
  // returns seed on server (Next.js SSR). This avoids the flash from useEffect.
  const [items, setItems] = useState<T[]>(() => read(key, seed));

  useEffect(() => {
    // Re-read on mount in case SSR returned stale empty seed
    setItems(read(key, seed));

    // Cross-tab sync: update if another tab writes the same key
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key) {
        setItems(e.newValue ? (JSON.parse(e.newValue) as T[]) : seed);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const add = useCallback((item: Omit<T, 'id'>) => {
    setItems(prev => {
      const next = [...prev, { ...item, id: uid() } as T];
      write(key, next);
      return next;
    });
  }, [key]);

  const remove = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      write(key, next);
      return next;
    });
  }, [key]);

  const update = useCallback((id: string, patch: Partial<T>) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...patch } : i);
      write(key, next);
      return next;
    });
  }, [key]);

  return { items, add, remove, update };
}

// ── Public hooks ──────────────────────────────────────────────────────────────
export const useDivisions = () => useCRUD<Division>(KEYS.divisions, SEED_DIVISIONS);
export const useCities    = () => useCRUD<City>(KEYS.cities, SEED_CITIES);
export const useSports    = () => useCRUD<Sport>(KEYS.sports, SEED_SPORTS);
export const useAmenities = () => useCRUD<Amenity>(KEYS.amenities, SEED_AMENITIES);
export const useOwners    = () => useCRUD<Owner>(KEYS.owners, SEED_OWNERS);
export const useTurfs     = () => useCRUD<Turf>(KEYS.turfs, []);
