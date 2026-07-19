'use client';
import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Share2, Download, Loader2, X, Award } from 'lucide-react';

interface ShareCardProps {
  match: {
    id: string;
    teamA: { name: string; logoUrl?: string | null };
    teamB: { name: string; logoUrl?: string | null };
  };
  scoreA: number;
  scoreB: number;
  events: Array<{
    type: string;
    minute: number;
    teamId: string;
    playerId?: string | null;
    status: string;
  }>;
  players: any[]; // Combined members list
  badges: Array<{
    playerId: string;
    badgeKey: string;
  }>;
  onClose: () => void;
}

const BADGE_EMOJIS: Record<string, string> = {
  MVP: '⭐',
  THE_SNIPER: '🎯',
  THE_MAESTRO: '🪄',
  THE_WALL: '🛡️',
  OPP_RESPECT: '🤝',
  OPP_TOUGHEST: '🪨',
  OPP_KEEPER: '🧤',
};

const BADGE_LABELS: Record<string, string> = {
  MVP: 'MVP',
  THE_SNIPER: 'The Sniper',
  THE_MAESTRO: 'The Maestro',
  THE_WALL: 'The Wall',
  OPP_RESPECT: 'Respect',
  OPP_TOUGHEST: 'Toughest Opponent',
  OPP_KEEPER: 'Best Keeper',
};

export default function ShareCard({
  match, scoreA, scoreB, events, players, badges, onClose,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [shareErr, setShareErr] = useState('');

  // Extract scorer names and minutes
  const goalEvents = events.filter(e => 
    ['GOAL', 'PENALTY_SCORED', 'OWN_GOAL'].includes(e.type) && e.status === 'CONFIRMED'
  );

  const getPlayerName = (pId?: string | null) => {
    if (!pId) return 'Anonymous';
    const p = players.find(x => x.playerId === pId || x.player?.id === pId);
    return p?.player?.fullName || p?.fullName || 'Player';
  };

  const goalsA = goalEvents.filter(e => e.teamId === (match as any).teamA_Id || e.teamId === (match as any).teamA?.id);
  const goalsB = goalEvents.filter(e => e.teamId === (match as any).teamB_Id || e.teamId === (match as any).teamB?.id);

  const handleGenerateImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      setGenerating(true);
      // Clean target rendering options
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        scale: 2, // 2x resolution for premium crispness
        backgroundColor: '#08090f',
        logging: false,
      });
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    } catch (e: any) {
      console.error(e);
      setShareErr('Generation failed');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    const blob = await handleGenerateImage();
    if (!blob) return;
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `match-summary-${match.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setShareErr('Failed to download image');
    }
  };

  const handleShare = async () => {
    const blob = await handleGenerateImage();
    if (!blob) return;

    const file = new File([blob], `match-${match.id}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Match Summary',
          text: `Match Results: ${match.teamA.name} ${scoreA} - ${scoreB} ${match.teamB.name}`,
        });
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setShareErr('Share API error, downloading instead.');
          await handleSave();
        }
      }
    } else {
      // Fallback
      setShareErr('Web Share not supported, saving to files.');
      await handleSave();
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4">
      {/* Modal Box */}
      <div className="bg-[#111318] border border-[#1e2028] rounded-3xl p-5 w-full max-w-sm flex flex-col relative"
        style={{ animation: 'slideUpSheet 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Award size={16} className="text-[#00ff41]" /> Match Summary Card
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:scale-90 transition-transform">
            <X size={16} className="text-neutral-400" />
          </button>
        </div>

        {/* ── Visual 9:16 Card Container ── */}
        <div className="w-full flex items-center justify-center overflow-hidden rounded-2xl mb-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/5">
          {/* Card Element to be Rendered */}
          <div ref={cardRef} className="w-[324px] h-[576px] bg-[#08090f] p-6 flex flex-col justify-between relative text-white font-sans overflow-hidden">
            {/* Watermark Waterfalls / Glowing Accents */}
            <div className="absolute -top-[100px] -right-[100px] w-[250px] h-[250px] rounded-full bg-[#00ff41]/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-[100px] -left-[100px] w-[250px] h-[250px] rounded-full bg-[#00ff41]/5 blur-3xl pointer-events-none" />

            {/* Header branding */}
            <div className="flex items-center justify-between border-b border-[#00ff41]/10 pb-3 shrink-0">
              <span className="text-[9px] font-black tracking-widest text-[#00ff41] uppercase">Match Summary</span>
              <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">bookmyturf</span>
            </div>

            {/* Main Score Area */}
            <div className="flex flex-col items-center justify-center my-auto py-4">
              <div className="flex items-center justify-center gap-4 w-full">
                {/* Team A */}
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center p-2 mb-2">
                    {match.teamA.logoUrl ? (
                      <img src={match.teamA.logoUrl} className="w-full h-full object-contain" alt="" />
                    ) : (
                      <span className="text-lg font-black text-neutral-600">{match.teamA.name[0]}</span>
                    )}
                  </div>
                  <p className="text-xs font-black text-white truncate max-w-[85px]">{match.teamA.name}</p>
                </div>

                {/* Score */}
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-black text-[#00ff41] tracking-tighter">{scoreA}</span>
                  <span className="text-xs font-bold text-neutral-600">:</span>
                  <span className="text-4xl font-black text-[#00ff41] tracking-tighter">{scoreB}</span>
                </div>

                {/* Team B */}
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center p-2 mb-2">
                    {match.teamB.logoUrl ? (
                      <img src={match.teamB.logoUrl} className="w-full h-full object-contain" alt="" />
                    ) : (
                      <span className="text-lg font-black text-neutral-600">{match.teamB.name[0]}</span>
                    )}
                  </div>
                  <p className="text-xs font-black text-white truncate max-w-[85px]">{match.teamB.name}</p>
                </div>
              </div>
            </div>

            {/* Scorers / Stats (Timeline condensed) */}
            <div className="flex-1 min-h-0 flex flex-col justify-start border-t border-b border-white/5 py-4 my-1 overflow-hidden">
              <h4 className="text-[8px] font-black uppercase text-neutral-500 tracking-wider mb-2">Goal Scorers</h4>
              <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2.5">
                <div className="flex gap-4">
                  {/* Left Column (Team A Goals) */}
                  <div className="flex-1 flex flex-col gap-1 text-right border-r border-white/5 pr-2">
                    {goalsA.map((g, idx) => (
                      <p key={idx} className="text-[10px] text-neutral-400 font-bold truncate">
                        {getPlayerName(g.playerId)} <span className="text-neutral-600 font-mono">({g.minute}')</span> {g.type === 'OWN_GOAL' && <span className="text-red-500 text-[8px] uppercase">OG</span>}
                      </p>
                    ))}
                    {goalsA.length === 0 && <p className="text-[9px] text-neutral-600 italic">-</p>}
                  </div>

                  {/* Right Column (Team B Goals) */}
                  <div className="flex-1 flex flex-col gap-1 text-left pl-2">
                    {goalsB.map((g, idx) => (
                      <p key={idx} className="text-[10px] text-neutral-400 font-bold truncate">
                        {g.type === 'OWN_GOAL' && <span className="text-red-500 text-[8px] uppercase">OG</span>} {getPlayerName(g.playerId)} <span className="text-neutral-600 font-mono">({g.minute}')</span>
                      </p>
                    ))}
                    {goalsB.length === 0 && <p className="text-[9px] text-neutral-600 italic">-</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Badges Awarded */}
            <div className="shrink-0 pt-3 pb-2">
              <h4 className="text-[8px] font-black uppercase text-neutral-500 tracking-wider mb-2">Match Awards</h4>
              <div className="grid grid-cols-2 gap-2">
                {badges.slice(0, 4).map((b, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 p-1.5 bg-neutral-900/50 border border-white/5 rounded-xl">
                    <span className="text-sm shrink-0">{BADGE_EMOJIS[b.badgeKey] || '🏅'}</span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-white truncate">{getPlayerName(b.playerId)}</p>
                      <p className="text-[7px] text-[#00ff41] font-bold uppercase tracking-wider">{BADGE_LABELS[b.badgeKey] || 'Award'}</p>
                    </div>
                  </div>
                ))}
                {badges.length === 0 && (
                  <p className="text-[9px] text-neutral-600 italic col-span-2 text-center py-1">No badges awarded</p>
                )}
              </div>
            </div>

            {/* Footer Branding watermark */}
            <div className="flex items-center justify-between pt-3 border-t border-[#00ff41]/10 shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-white">BMT</span>
              </div>
              <span className="text-[7px] text-neutral-600 tracking-wide font-mono">bookmyturfbd.com</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 shrink-0">
          {shareErr && <p className="text-red-400 text-[10px] font-bold text-center">{shareErr}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={generating}
              className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all">
              <Download size={14} /> Save
            </button>
            <button onClick={handleShare} disabled={generating}
              className="flex-[2] py-3 bg-[#00ff41] hover:bg-[#00e038] text-black rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,65,0.2)]">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <><Share2 size={14} /> Share Story</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
