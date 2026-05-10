'use client';
import { useEffect, useState } from 'react';

/**
 * Reads the bmt_auth cookie to determine if the user is logged in.
 * Returns `null` while hydrating (SSR), then `true`/`false` on the client.
 */
export function useAuth(): boolean | null {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const has = document.cookie.split(';').some(c => c.trim().startsWith('bmt_auth='));
    setIsAuthed(has);
  }, []);

  return isAuthed;
}
