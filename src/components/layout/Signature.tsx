'use client';
import { useEffect } from 'react';

/**
 * 🔒 Hidden Signature — Not visible anywhere on the site.
 * This runs silently in the browser console only.
 * A tradition as old as the web itself.
 */
export default function Signature() {
  useEffect(() => {
    console.log(
      '%c' +
      ' ____   __  __  _____ \n' +
      '| __ ) |  \\/  ||_   _|\n' +
      '|  _ \\ | |\\/| |  | |  \n' +
      '| |_) || |  | |  | |  \n' +
      '|____/ |_|  |_|  |_|  \n',
      'color: #00ff41; font-family: monospace; font-size: 13px; line-height: 1.4;'
    );
    console.log(
      '%cBook My Turf — বাংলাদেশ',
      'color: #00ff41; font-size: 20px; font-weight: 900; font-family: sans-serif; letter-spacing: 2px;'
    );
    console.log(
      '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'color: #00ff41; font-size: 10px;'
    );
    console.log(
      '%cConceived & Directed By',
      'color: #888; font-size: 11px; font-weight: 600; letter-spacing: 1px;'
    );
    console.log(
      '%c✦  Moshiul Haque Fahim',
      'color: #ffffff; font-size: 18px; font-weight: 900; letter-spacing: 1px;'
    );
    console.log(
      '%cA Student of Business. A Mind of Vision.\n%cNo CS degree. No prior coding experience.\n%cOnly creativity, deep thinking, and the mercy of Allah SWT.',
      'color: #aaa; font-size: 12px; font-style: italic;',
      'color: #aaa; font-size: 12px;',
      'color: #aaa; font-size: 12px;'
    );
    console.log(
      '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'color: #444; font-size: 10px;'
    );
    console.log(
      '%cPersonal AI Assistant',
      'color: #888; font-size: 10px; font-weight: 600; letter-spacing: 1px;'
    );
    console.log(
      '%c⚡  Antigravity  — by Google DeepMind',
      'color: #00ff41; font-size: 13px; font-weight: 900; letter-spacing: 1px;'
    );
    console.log(
      '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'color: #00ff41; font-size: 10px;'
    );
    console.log(
      '%c🇧🇩  Proudly Made in Bangladesh  ♥',
      'color: #e63946; font-size: 13px; font-weight: 900; letter-spacing: 1px;'
    );
    console.log(
      '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n',
      'color: #00ff41; font-size: 10px;'
    );
  }, []);

  return null; // renders nothing — completely invisible
}
