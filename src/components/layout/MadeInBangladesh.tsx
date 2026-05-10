'use client';

/**
 * MadeInBangladesh — slim fixed strip, always visible at the very top of the app.
 * Rendered directly from layout.tsx so it appears on every page.
 */
export default function MadeInBangladesh() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        background: '#001800',
        userSelect: 'none',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#00ff41',
          lineHeight: 1,
        }}
      >
        🇧🇩 Proudly Made in Bangladesh
      </span>
      <span
        style={{
          fontSize: '10px',
          color: '#ff4455',
          lineHeight: 1,
          animation: 'bmt-heart-beat 1.2s ease-in-out infinite',
          display: 'inline-block',
        }}
      >
        ♥
      </span>
    </div>
  );
}
