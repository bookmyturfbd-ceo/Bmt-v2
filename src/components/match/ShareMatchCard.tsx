'use client';

import { useCallback, useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShareCardData {
  outcome      : 'win' | 'loss' | 'draw';
  sportType    : string;
  sportLabel   : string;
  sportEmoji   : string;
  myTeamName   : string;
  oppTeamName  : string;
  myScore      : number;
  oppScore     : number;
  myWickets   ?: number | null;
  oppWickets  ?: number | null;
  myOvers     ?: number | null;
  oppOvers    ?: number | null;
  victoryString: string;
  matchDate   ?: string;
  // MMR progression (optional — rendered only when present)
  mmrDelta     ?: number | null;
  mmrRankBefore?: string | null;
  mmrRankAfter ?: string | null;
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, boxW: number, boxH: number,
) {
  const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
  const dw    = img.naturalWidth  * scale;
  const dh    = img.naturalHeight * scale;
  ctx.drawImage(img, x + (boxW - dw) / 2, y + (boxH - dh) / 2, dw, dh);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ─── Core image generator (Canvas API — no html2canvas) ───────────────────────

export async function generateShareImage(data: ShareCardData): Promise<Blob> {
  const SIZE   = 1080;
  const canvas = document.createElement('canvas');
  canvas.width  = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  const isCricket = data.sportType.includes('CRICKET');
  const today = data.matchDate ?? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const FONT  = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  // Outcome colours
  const PRIMARY  = data.outcome === 'win'  ? '#00ff41' : data.outcome === 'draw' ? '#4fa3ff' : '#ef4444';
  const GLOW_RGB = data.outcome === 'win'  ? '0,255,65' : data.outcome === 'draw' ? '79,163,255' : '239,68,68';
  const LABEL    = data.outcome === 'win'  ? 'VICTORY'  : data.outcome === 'draw' ? 'DRAW'       : 'DEFEAT';

  // Per-side alpha: winner full, loser dimmed, draw equal
  const myAlpha  = data.outcome === 'loss' ? 0.28 : 1.0;
  const oppAlpha = data.outcome === 'win'  ? 0.28 : 1.0;
  const isDraw   = data.outcome === 'draw';

  // ── Layout constants ───────────────────────────────────────────────────────
  const PAD       = 52;
  const BADGE_R   = 46;
  const BADGE_CY  = 270;
  const NAME_Y    = BADGE_CY + BADGE_R + 58;   // ~374
  const SCORE_Y   = isCricket ? 482 : 512;
  const SCORE_FSZ = isCricket ? 148 : 184;

  // ── 1. Base fill — eliminates transparent corner pixels ───────────────────
  ctx.fillStyle = '#05060c';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // ── 2. Clipping mask (rounded card) ───────────────────────────────────────
  const RADIUS = 60;
  roundedRect(ctx, 0, 0, SIZE, SIZE, RADIUS);
  ctx.clip();

  // ── 3. Background gradient ────────────────────────────────────────────────
  const bgGrad = ctx.createRadialGradient(SIZE / 2, SIZE * 0.3, 0, SIZE / 2, SIZE * 0.3, SIZE * 0.72);
  bgGrad.addColorStop(0,    `rgba(${GLOW_RGB},0.58)`);
  bgGrad.addColorStop(0.4,  `rgba(${GLOW_RGB},0.22)`);
  bgGrad.addColorStop(0.75, `rgba(${GLOW_RGB},0.06)`);
  bgGrad.addColorStop(1,    '#05060c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Vignette
  const vigGrad = ctx.createLinearGradient(0, SIZE * 0.72, 0, SIZE);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // ── 4. "BMT" watermark — faint block letters instead of giant logo ─────────
  ctx.save();
  ctx.globalAlpha   = 0.045;
  ctx.fillStyle     = '#ffffff';
  ctx.font          = `900 520px ${FONT}`;
  ctx.textAlign     = 'center';
  ctx.textBaseline  = 'middle';
  ctx.fillText('BMT', SIZE / 2, SIZE / 2 + 40);
  ctx.restore();

  // ── 5. Outer border ───────────────────────────────────────────────────────
  ctx.strokeStyle = `rgba(${GLOW_RGB},0.25)`;
  ctx.lineWidth   = 3;
  roundedRect(ctx, 1.5, 1.5, SIZE - 3, SIZE - 3, RADIUS);
  ctx.stroke();

  // ── 6. Top bar ────────────────────────────────────────────────────────────
  const lBox = 78;
  let logoLoaded = false;
  try {
    const logo = await loadImage('/bmt-logo.png');
    ctx.save();
    roundedRect(ctx, PAD, PAD, lBox, lBox, 16);
    ctx.clip();
    drawImageContain(ctx, logo, PAD, PAD, lBox, lBox);
    ctx.restore();
    ctx.fillStyle    = '#ffffff';
    ctx.font         = `800 38px ${FONT}`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('BookMyTurf', PAD + lBox + 18, PAD + 30);
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.font      = `700 22px ${FONT}`;
    ctx.fillText('BANGLADESH', PAD + lBox + 18, PAD + 62);
    logoLoaded = true;
  } catch { /* fallback */ }

  if (!logoLoaded) {
    ctx.fillStyle    = '#ffffff';
    ctx.font         = `800 44px ${FONT}`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('BookMyTurf', PAD, PAD + 52);
  }

  // Sport chip — always full label (e.g. "5-A-SIDE FUTSAL", "7-A-SIDE CRICKET")
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 23px ${FONT}`;
  const sportStr = data.sportLabel.toUpperCase();
  const chipTW   = ctx.measureText(sportStr).width;
  const chipPadX = 26;
  const chipW    = chipTW + chipPadX * 2;
  const chipH    = 48;
  const chipX    = SIZE - PAD - chipW;
  const chipY    = PAD + 8;

  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  roundedRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth   = 1.5;
  roundedRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'center';
  ctx.fillText(sportStr, chipX + chipW / 2, chipY + chipH / 2 + 9);
  ctx.textAlign = 'left';

  // ── 7. Team badges (circular initials) ───────────────────────────────────
  const drawBadge = (cx: number, name: string, isWinner: boolean) => {
    const initials = getInitials(name);
    const alpha    = isDraw ? 0.9 : isWinner ? 1.0 : 0.28;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (isWinner && !isDraw) { ctx.shadowColor = PRIMARY; ctx.shadowBlur = 40; }
    // Fill
    ctx.fillStyle = isWinner && !isDraw ? `rgba(${GLOW_RGB},0.20)` : 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.arc(cx, BADGE_CY, BADGE_R, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Border
    ctx.strokeStyle = isWinner && !isDraw ? `rgba(${GLOW_RGB},0.85)` : 'rgba(255,255,255,0.20)';
    ctx.lineWidth   = isWinner && !isDraw ? 2.5 : 1.5;
    ctx.beginPath(); ctx.arc(cx, BADGE_CY, BADGE_R, 0, Math.PI * 2); ctx.stroke();
    // Initials
    ctx.fillStyle    = isWinner && !isDraw ? PRIMARY : '#ffffff';
    ctx.font         = `900 ${initials.length === 1 ? 42 : 34}px ${FONT}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, cx, BADGE_CY + 2);
    ctx.restore();
  };

  drawBadge(SIZE * 0.25, data.myTeamName,  data.outcome === 'win');
  drawBadge(SIZE * 0.75, data.oppTeamName, data.outcome === 'loss');

  // ── 8. Team names ─────────────────────────────────────────────────────────
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 30px ${FONT}`;
  ctx.textAlign = 'center';

  const truncateName = (name: string, maxW: number) => {
    const u = name.toUpperCase();
    if (ctx.measureText(u).width <= maxW) return u;
    let t = u;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  };

  ctx.globalAlpha = myAlpha;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(truncateName(data.myTeamName, 320), SIZE * 0.25, NAME_Y);

  ctx.globalAlpha = oppAlpha;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(truncateName(data.oppTeamName, 320), SIZE * 0.75, NAME_Y);

  ctx.globalAlpha = 1;

  // ── 9. Vertical divider ───────────────────────────────────────────────────
  const scoreBottom = SCORE_Y + SCORE_FSZ * 0.72 + (isCricket ? 58 : 28);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(SIZE / 2, BADGE_CY - BADGE_R - 10);
  ctx.lineTo(SIZE / 2, scoreBottom);
  ctx.stroke();

  // VS
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font      = `800 28px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('VS', SIZE / 2, SCORE_Y - 38);

  // ── 10. Scores ────────────────────────────────────────────────────────────
  ctx.font      = `900 ${SCORE_FSZ}px ${FONT}`;
  ctx.textAlign = 'center';

  ctx.globalAlpha = myAlpha;
  ctx.fillStyle   = '#ffffff';
  ctx.fillText(String(data.myScore),  SIZE * 0.25, SCORE_Y + SCORE_FSZ * 0.72);

  ctx.globalAlpha = oppAlpha;
  ctx.fillStyle   = '#ffffff';
  ctx.fillText(String(data.oppScore), SIZE * 0.75, SCORE_Y + SCORE_FSZ * 0.72);

  ctx.globalAlpha = 1;

  // ── 11. Cricket: "X Ovs · Y wkt" on one line ──────────────────────────────
  if (isCricket) {
    const statsY = SCORE_Y + SCORE_FSZ * 0.72 + 52;
    ctx.font      = `600 28px ${FONT}`;
    ctx.textAlign = 'center';

    const myOvsWkt  = [data.myOvers  != null ? `${data.myOvers} Ovs`  : null, data.myWickets  != null ? `${data.myWickets} wkt`  : null].filter(Boolean).join(' · ');
    const oppOvsWkt = [data.oppOvers != null ? `${data.oppOvers} Ovs` : null, data.oppWickets != null ? `${data.oppWickets} wkt` : null].filter(Boolean).join(' · ');

    ctx.globalAlpha = myAlpha * 0.65;
    ctx.fillStyle   = '#ffffff';
    if (myOvsWkt)  ctx.fillText(myOvsWkt,  SIZE * 0.25, statsY);

    ctx.globalAlpha = oppAlpha * 0.65;
    if (oppOvsWkt) ctx.fillText(oppOvsWkt, SIZE * 0.75, statsY);

    ctx.globalAlpha = 1;
  }

  // ── 12. Outcome badge pill ─────────────────────────────────────────────────
  const badgePillTop = scoreBottom + 24;
  const badgeFontSz  = 52;
  ctx.font = `900 ${badgeFontSz}px ${FONT}`;
  const labW   = ctx.measureText(LABEL).width;
  const badgeW = labW + 120;
  const badgeH = 86;
  const badgeX = (SIZE - badgeW) / 2;

  ctx.shadowColor = PRIMARY; ctx.shadowBlur = 80;
  ctx.fillStyle   = `rgba(${GLOW_RGB},0.30)`;
  roundedRect(ctx, badgeX, badgePillTop, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.shadowBlur  = 0;

  ctx.strokeStyle = `rgba(${GLOW_RGB},0.70)`;
  ctx.lineWidth   = 2.5;
  roundedRect(ctx, badgeX, badgePillTop, badgeW, badgeH, badgeH / 2);
  ctx.stroke();

  ctx.fillStyle   = PRIMARY;
  ctx.shadowColor = PRIMARY; ctx.shadowBlur = 30;
  ctx.textAlign   = 'center';
  ctx.fillText(LABEL, SIZE / 2, badgePillTop + badgeFontSz + 14);
  ctx.shadowBlur  = 0;

  // ── 13. Victory string ────────────────────────────────────────────────────
  const vsY = badgePillTop + badgeH + 44;
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.font      = `600 27px ${FONT}`;
  ctx.textAlign = 'center';
  const vsLines = wrapText(ctx, data.victoryString.toUpperCase(), SIZE - PAD * 3);
  vsLines.forEach((line, i) => ctx.fillText(line, SIZE / 2, vsY + i * 38));

  // ── 14. MMR line ──────────────────────────────────────────────────────────
  const footY = SIZE - 48;
  if (data.mmrDelta != null) {
    const mmrY      = footY - 46;
    const deltaSign = data.mmrDelta >= 0 ? '+' : '';
    const deltaStr  = `${deltaSign}${data.mmrDelta} MMR`;
    const rankStr   = data.mmrRankBefore && data.mmrRankAfter
      ? ` · ${data.mmrRankBefore} → ${data.mmrRankAfter}`
      : '';
    const mmrColor = data.mmrDelta > 0 ? '#00ff41' : data.mmrDelta < 0 ? '#ef4444' : '#4fa3ff';

    // Pill bg
    ctx.font = `800 24px ${FONT}`;
    const fullStr  = deltaStr + rankStr;
    const pillW    = ctx.measureText(fullStr).width + 64;
    const pillH    = 44;
    const pillX    = (SIZE - pillW) / 2;
    const pillY    = mmrY - pillH / 2 - 10;

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${mmrColor === '#00ff41' ? '0,255,65' : mmrColor === '#ef4444' ? '239,68,68' : '79,163,255'},0.35)`;
    ctx.lineWidth   = 1.5;
    roundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.stroke();

    // MMR delta (colored)
    ctx.textAlign = 'center';
    ctx.fillStyle = mmrColor;
    ctx.fillText(deltaStr, SIZE / 2 - ctx.measureText(rankStr).width / 2, pillY + pillH / 2 + 9);

    // Rank progression (white/dim)
    if (rankStr) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      const rankX = SIZE / 2 + ctx.measureText(deltaStr).width / 2;
      ctx.fillText(rankStr, rankX, pillY + pillH / 2 + 9);
    }
  }

  // ── 15. Footer ────────────────────────────────────────────────────────────
  ctx.fillStyle    = 'rgba(255,255,255,0.18)';
  ctx.font         = `600 24px ${FONT}`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(today, PAD, footY);

  ctx.textAlign = 'right';
  ctx.font      = `800 24px ${FONT}`;
  ctx.fillText('BOOKMYTURFBD.COM', SIZE - PAD, footY);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
      'image/png',
    );
  });
}

// ─── Share text helper ────────────────────────────────────────────────────────

export function buildShareText(data: ShareCardData): string {
  const sport = data.sportLabel;
  if (data.outcome === 'win')  return `🏆 ${data.myTeamName} beat ${data.oppTeamName} (${data.myScore}–${data.oppScore}) in ${sport}! Played on BookMyTurf 🇧🇩\n\nbookmyturfbd.com`;
  if (data.outcome === 'draw') return `🤝 ${data.myTeamName} drew ${data.myScore}–${data.oppScore} with ${data.oppTeamName} in ${sport}! Played on BookMyTurf 🇧🇩\n\nbookmyturfbd.com`;
  return `💪 ${data.oppTeamName} beat ${data.myTeamName} (${data.oppScore}–${data.myScore}) in ${sport}. Played on BookMyTurf 🇧🇩\n\nbookmyturfbd.com`;
}

// ─── ShareActions — 2 buttons, image pre-generated on mount ─────────────────

interface ShareActionsProps {
  data        : ShareCardData;
  outcomeColor: string;
}

export function ShareActions({ data, outcomeColor }: ShareActionsProps) {
  const [dlState,    setDlState]    = useState<'idle' | 'loading' | 'done'>('idle');
  const [shState,    setShState]    = useState<'idle' | 'loading' | 'done'>('idle');
  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null);
  const [blobReady,  setBlobReady]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    generateShareImage(data).then(blob => {
      if (!cancelled) { setCachedBlob(blob); setBlobReady(true); }
    }).catch(() => { if (!cancelled) setBlobReady(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = useCallback(async () => {
    if (dlState !== 'idle') return;
    setDlState('loading');
    try {
      const blob = cachedBlob ?? await generateShareImage(data);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `bmt-match-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDlState('done');
      setTimeout(() => setDlState('idle'), 2500);
    } catch {
      setDlState('idle');
    }
  }, [data, dlState, cachedBlob]);

  const handleShare = useCallback(() => {
    if (shState !== 'idle') return;
    const text = buildShareText(data);

    if (!blobReady || !cachedBlob) {
      if (navigator.share) {
        navigator.share({ title: 'Match Result — BookMyTurf BD', text }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(text).catch(() => {});
      }
      return;
    }

    setShState('loading');
    const file = new File([cachedBlob], 'bmt-match.png', { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ title: 'Match Result — BookMyTurf BD', text, files: [file] })
        .catch(() => {}).finally(() => setShState('idle'));
    } else if (navigator.share) {
      navigator.share({ title: 'Match Result — BookMyTurf BD', text })
        .catch(() => {}).finally(() => setShState('idle'));
    } else {
      const url = URL.createObjectURL(cachedBlob);
      window.open(url, '_blank');
      setShState('idle');
    }
  }, [data, shState, cachedBlob, blobReady]);

  return (
    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
      <button
        onClick={handleDownload}
        disabled={dlState === 'loading'}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          padding: '13px 0', borderRadius: '14px',
          border: `1.5px solid ${outcomeColor}45`,
          background: `linear-gradient(135deg, ${outcomeColor}18, ${outcomeColor}0a)`,
          color: outcomeColor, fontWeight: 900, fontSize: '12px', letterSpacing: '0.06em',
          textTransform: 'uppercase', cursor: dlState === 'loading' ? 'not-allowed' : 'pointer',
          opacity: dlState === 'loading' ? 0.6 : 1, transition: 'all 0.15s', fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: '17px' }}>
          {dlState === 'loading' ? '⏳' : dlState === 'done' ? '✅' : '📥'}
        </span>
        {dlState === 'loading' ? 'Saving…' : dlState === 'done' ? 'Saved!' : 'Download'}
      </button>

      <button
        onClick={handleShare}
        disabled={shState === 'loading'}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
          padding: '13px 0', borderRadius: '14px',
          border: '1.5px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.07)',
          color: blobReady ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.4)',
          fontWeight: 900, fontSize: '12px', letterSpacing: '0.06em',
          textTransform: 'uppercase', cursor: shState === 'loading' ? 'not-allowed' : 'pointer',
          opacity: shState === 'loading' ? 0.6 : 1, transition: 'all 0.2s', fontFamily: 'inherit',
        }}
      >
        <span style={{ fontSize: '17px' }}>
          {shState === 'loading' ? '⏳' : blobReady ? '📤' : '⏳'}
        </span>
        {shState === 'loading' ? 'Sharing…' : blobReady ? 'Share' : 'Preparing…'}
      </button>
    </div>
  );
}

// ─── Default export (used in MatchResultModal only) ───────────────────────────

export default ShareActions;
