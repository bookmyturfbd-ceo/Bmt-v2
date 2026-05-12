'use client';

import { useState, useEffect, useRef } from 'react';
import { useMatchResult } from '@/context/MatchResultContext';
import { generateShareImage, ShareActions } from '@/components/match/ShareMatchCard';
import type { ShareCardData } from '@/components/match/ShareMatchCard';

// ─── Static mock data for all card variants ──────────────────────────────────

const CARDS: Array<ShareCardData & { id: string }> = [
  {
    id: 'football-win', outcome: 'win',
    sportType: 'FOOTBALL_FULL', sportLabel: 'Football', sportEmoji: '⚽',
    myTeamName: 'Dhaka FC', oppTeamName: 'Chittagong XI', myScore: 3, oppScore: 1,
    victoryString: 'Dhaka FC won by 2 goals',
    mmrDelta: 80, mmrRankBefore: 'Silver II', mmrRankAfter: 'Silver III',
  },
  {
    id: 'football-draw', outcome: 'draw',
    sportType: 'FOOTBALL_FULL', sportLabel: 'Football', sportEmoji: '⚽',
    myTeamName: 'Sylhet Stars', oppTeamName: 'Rajshahi Rovers', myScore: 1, oppScore: 1,
    victoryString: 'Match tied — Honours even',
    mmrDelta: 20, mmrRankBefore: 'Bronze I', mmrRankAfter: 'Bronze I',
  },
  {
    id: 'football-loss', outcome: 'loss',
    sportType: 'FOOTBALL_FULL', sportLabel: 'Football', sportEmoji: '⚽',
    myTeamName: 'Khulna United', oppTeamName: 'Barishal Bullets', myScore: 0, oppScore: 2,
    victoryString: 'Barishal Bullets won by 2 goals',
    mmrDelta: -40, mmrRankBefore: 'Gold I', mmrRankAfter: 'Silver III',
  },
  {
    id: 'futsal5-win', outcome: 'win',
    sportType: 'FUTSAL_5', sportLabel: '5-a-side Futsal', sportEmoji: '⚽',
    myTeamName: 'Ura Dhura', oppTeamName: 'Danger FC', myScore: 7, oppScore: 4,
    victoryString: 'Ura Dhura won by 3 goals',
    mmrDelta: 65, mmrRankBefore: 'Gold II', mmrRankAfter: 'Gold II',
  },
  {
    id: 'futsal5-loss', outcome: 'loss',
    sportType: 'FUTSAL_5', sportLabel: '5-a-side Futsal', sportEmoji: '⚽',
    myTeamName: 'Fire Ballers', oppTeamName: 'Night Owls', myScore: 2, oppScore: 5,
    victoryString: 'Night Owls won by 3 goals',
    mmrDelta: -35, mmrRankBefore: 'Silver I', mmrRankAfter: 'Bronze III',
  },
  {
    id: 'futsal7-win', outcome: 'win',
    sportType: 'FUTSAL_7', sportLabel: '7-a-side Futsal', sportEmoji: '⚽',
    myTeamName: 'Rapid Strikers', oppTeamName: 'Iron Wall', myScore: 4, oppScore: 2,
    victoryString: 'Rapid Strikers won by 2 goals',
    mmrDelta: 55, mmrRankBefore: 'Platinum I', mmrRankAfter: 'Platinum I',
  },
  {
    id: 'cricket7-win', outcome: 'win',
    sportType: 'CRICKET_7', sportLabel: '7-a-side Cricket', sportEmoji: '🏏',
    myTeamName: 'Ura Dhura CC', oppTeamName: 'Danger Cricket',
    myScore: 87, oppScore: 74, myWickets: 4, oppWickets: 10, myOvers: 7.0, oppOvers: 6.4,
    victoryString: 'Ura Dhura CC won by 4 wickets',
    mmrDelta: 90, mmrRankBefore: 'Silver III', mmrRankAfter: 'Gold I',
  },
  {
    id: 'cricket7-draw', outcome: 'draw',
    sportType: 'CRICKET_7', sportLabel: '7-a-side Cricket', sportEmoji: '🏏',
    myTeamName: 'Galaxy XI', oppTeamName: 'Storm Riders',
    myScore: 62, oppScore: 62, myWickets: 7, oppWickets: 7, myOvers: 7.0, oppOvers: 7.0,
    victoryString: 'Match tied — Super Over result',
    mmrDelta: 15, mmrRankBefore: 'Bronze II', mmrRankAfter: 'Bronze II',
  },
  {
    id: 'cricket7-loss', outcome: 'loss',
    sportType: 'CRICKET_7', sportLabel: '7-a-side Cricket', sportEmoji: '🏏',
    myTeamName: 'Comilla Kings', oppTeamName: 'Narayanganj Tigers',
    myScore: 55, oppScore: 78, myWickets: 10, oppWickets: 3, myOvers: 6.2, oppOvers: 7.0,
    victoryString: 'Narayanganj Tigers won by 23 runs',
    mmrDelta: -50, mmrRankBefore: 'Gold II', mmrRankAfter: 'Gold I',
  },
  {
    id: 'cricket-full-win', outcome: 'win',
    sportType: 'CRICKET_FULL', sportLabel: 'Cricket', sportEmoji: '🏏',
    myTeamName: 'Dhaka Dynamites', oppTeamName: 'Sylhet Strikers',
    myScore: 182, oppScore: 161, myWickets: 6, oppWickets: 10, myOvers: 20.0, oppOvers: 19.3,
    victoryString: 'Dhaka Dynamites won by 21 runs',
    mmrDelta: 100, mmrRankBefore: 'Diamond I', mmrRankAfter: 'Diamond I',
  },
];

// ─── Canvas preview — renders once and shows as <img> ────────────────────────

function CanvasPreviewCard({ data }: { data: ShareCardData & { id: string } }) {
  const [imgSrc, setImgSrc]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const outcomeColor = data.outcome === 'win' ? '#00ff41' : data.outcome === 'draw' ? '#4fa3ff' : '#ef4444';

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    generateShareImage(data)
      .then(blob => {
        if (!mountedRef.current) return;
        setImgSrc(URL.createObjectURL(blob));
        setLoading(false);
      })
      .catch(() => { if (mountedRef.current) setLoading(false); });
    return () => { mountedRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', borderRadius: '20px',
      border: `1px solid ${outcomeColor}22`, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Canvas image preview */}
      <div style={{
        aspectRatio: '1 / 1', position: 'relative',
        background: '#07080e', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {loading && (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 700 }}>Rendering…</div>
        )}
        {imgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt="Match card preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: loading ? 'none' : 'block' }} />
        )}
      </div>

      {/* Label bar */}
      <div style={{
        padding: '10px 16px', borderTop: `1px solid ${outcomeColor}18`,
        background: `${outcomeColor}07`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {data.sportEmoji} {data.sportLabel}
        </span>
        <span style={{
          color: outcomeColor, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '0.1em', padding: '4px 10px', borderRadius: '999px',
          background: `${outcomeColor}18`, border: `1px solid ${outcomeColor}35`,
        }}>
          {data.outcome === 'win' ? '🏆 Win' : data.outcome === 'draw' ? '🤝 Draw' : '💀 Loss'}
        </span>
      </div>

      {/* Share actions */}
      <div style={{ padding: '12px 16px 16px' }}>
        <ShareActions data={data} outcomeColor={outcomeColor} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestModalPage() {
  const { showMatchResult } = useMatchResult();
  const [activeTab, setActiveTab] = useState<'cards' | 'trigger'>('cards');

  const fire = (outcome: 'win' | 'loss' | 'draw', sportType: string) => {
    const isCricket = sportType.includes('CRICKET');
    const mmrDelta  = outcome === 'win' ? 80 : outcome === 'loss' ? -40 : 40;
    showMatchResult({
      outcome, sportType,
      victoryString: outcome === 'draw'
        ? 'Match tied — MMR split equally'
        : outcome === 'win'
          ? isCricket ? 'Ura Dhura CC won by 3 wickets' : 'Ura Dhura won 3–1'
          : isCricket ? 'Danger Cricket won by 12 runs' : 'Danger FC won 2–0',
      myTeamName  : 'Ura Dhura',
      oppTeamName : isCricket ? 'Danger Cricket' : 'Danger FC',
      myScore     : isCricket ? 45 : 3,
      oppScore    : isCricket ? (outcome === 'win' ? 33 : outcome === 'draw' ? 45 : 52) : (outcome === 'win' ? 1 : 2),
      myWickets   : isCricket ? 3  : null,
      oppWickets  : isCricket ? 10 : null,
      myOvers     : isCricket ? 6.0 : null,
      oppOvers    : isCricket ? 5.2 : null,
      mmrDelta, currentMmr: 1000 + mmrDelta,
      matchId: 'test-match',
    });
  };

  const sports = [
    { label: '🏏 Cricket 7s',      value: 'CRICKET_7'    },
    { label: '🏏 Cricket Full',    value: 'CRICKET_FULL'  },
    { label: '⚽ Futsal 5-a-side', value: 'FUTSAL_5'      },
    { label: '⚽ Futsal 7-a-side', value: 'FUTSAL_7'      },
    { label: '⚽ Football 11v11',  value: 'FOOTBALL_FULL' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#07080e', color: '#fff', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '24px 24px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontWeight: 900, fontSize: '22px', letterSpacing: '-0.02em', margin: 0 }}>
                🎨 Match Card Inspector
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '4px 0 0', fontWeight: 600 }}>
                Canvas-rendered previews — pixel-perfect at 1080×1080
              </p>
            </div>
            <a href="/en/interact" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', textDecoration: 'none', fontWeight: 700, letterSpacing: '0.06em' }}>
              ← ARENA
            </a>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {([
              { id: 'cards',   label: '🖼️  Share Cards' },
              { id: 'trigger', label: '▶  Trigger Modal' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px', borderRadius: '10px 10px 0 0',
                  border: 'none', cursor: 'pointer',
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.35)',
                  fontWeight: 800, fontSize: '12px', letterSpacing: '0.06em',
                  borderBottom: activeTab === tab.id ? '2px solid #00ff41' : '2px solid transparent',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab: Share Cards ──────────────────────────────────────────────── */}
      {activeTab === 'cards' && (
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>
            {CARDS.length} variants — actual canvas output, same as what users will download / share
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {CARDS.map(card => <CanvasPreviewCard key={card.id} data={card} />)}
          </div>
        </div>
      )}

      {/* ── Tab: Trigger Modal ────────────────────────────────────────────── */}
      {activeTab === 'trigger' && (
        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '48px 24px' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '32px', textAlign: 'center' }}>
            Fire the full-screen match result modal
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {sports.map(sport => (
              <div key={sport.value}>
                <p style={{
                  color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 900,
                  textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px', textAlign: 'center',
                }}>{sport.label}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {([
                    { label: 'Victory', outcome: 'win'  as const, color: '#00ff41' },
                    { label: 'Defeat',  outcome: 'loss' as const, color: '#ef4444' },
                    { label: 'Draw',    outcome: 'draw' as const, color: '#4fa3ff' },
                  ]).map(btn => (
                    <button
                      key={btn.outcome}
                      onClick={() => fire(btn.outcome, sport.value)}
                      style={{
                        flex: 1, padding: '12px 0', borderRadius: '14px',
                        border: `1.5px solid ${btn.color}40`,
                        background: `${btn.color}12`,
                        color: btn.color, fontWeight: 900, fontSize: '12px',
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
