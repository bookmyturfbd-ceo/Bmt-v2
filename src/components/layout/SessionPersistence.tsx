'use client';

import { useEffect } from 'react';

export default function SessionPersistence() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return undefined;
    };

    let hasAuth = !!getCookie('bmt_auth') || !!getCookie('org_token');
    let role = getCookie('bmt_role');
    const hadCookiesInitially = hasAuth;

    // 1. Recover session if cookies are missing but backup exists
    if (!hasAuth) {
      const rememberMe = localStorage.getItem('bmt_remember_me');
      const backupStr = localStorage.getItem('bmt_session_backup');
      
      if (rememberMe === 'true' && backupStr) {
        try {
          const backup = JSON.parse(backupStr);
          const hasPlayerAuth = backup.bmt_auth && backup.bmt_player_id;
          const hasOwnerAuth = backup.bmt_auth && backup.bmt_owner_id;
          const hasOrgAuth = backup.org_token;

          if (hasPlayerAuth || hasOwnerAuth || hasOrgAuth) {
            // Restore cookies
            const maxAge = 30 * 24 * 60 * 60; // 30 days
            const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
            
            Object.entries(backup).forEach(([key, val]) => {
              document.cookie = `${key}=${val}; path=/; max-age=${maxAge}; expires=${expires}; SameSite=Lax; secure`;
            });
            
            hasAuth = true;
            role = backup.bmt_role;
          }
        } catch (e) {
          console.error('Session persistence restoration failed:', e);
        }
      }
    }

    // 2. Redirect away from /login page if authenticated, or reload if recovered on a protected page
    const pathname = window.location.pathname;
    const isLoginPage = pathname.endsWith('/login');

    if (hasAuth) {
      if (isLoginPage) {
        const searchParams = new URLSearchParams(window.location.search);
        const next = searchParams.get('next');
        if (next) {
          window.location.href = window.location.origin + next;
        } else {
          const locale = pathname.split('/')[1] || 'en';
          if (role === 'admin' || role === 'shop_manager') {
            window.location.href = `${window.location.origin}/${locale}/admin`;
          } else if (role === 'organizer') {
            window.location.href = `${window.location.origin}/${locale}/organizer/dashboard`;
          } else {
            window.location.href = `${window.location.origin}/${locale}`;
          }
        }
      } else if (!hadCookiesInitially) {
        // Only reload if we actually performed a session recovery (restored missing cookies) on a regular page
        window.location.reload();
      }
    }
  }, []);

  return null;
}
