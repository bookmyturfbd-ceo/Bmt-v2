import { ImageResponse } from 'next/og';
import prisma from '@/lib/prisma';
import { getRankData, isProvisional } from '@/lib/rankUtils';
import { computePlayerFacets } from '@/lib/playerFacets';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const format = searchParams.get('format') || 'square'; // 'square' (1080x1080) or 'story' (1080x1920)
    const sport = searchParams.get('sport') || 'football'; // 'football' or 'cricket'

    if (!code) {
      return new Response('Missing player code', { status: 400 });
    }

    const player = await prisma.player.findUnique({
      where: { playerCode: code },
      select: {
        id: true,
        fullName: true,
        playerCode: true,
        avatarUrl: true,
        position: true,
        footballMmr: true,
        cricketMmr: true,
        matchStats: {
          where: { match: { status: 'COMPLETED' } },
          select: { id: true, match: { select: { sportType: true } } },
        },
      },
    });

    if (!player) {
      return new Response('Player not found', { status: 404 });
    }

    const isCricket = sport === 'cricket';
    const playerMmr = isCricket ? (player.cricketMmr ?? 1000) : (player.footballMmr ?? 1000);
    const rankData = getRankData(playerMmr);

    const matchStats = player.matchStats.filter(s =>
      isCricket
        ? s.match?.sportType?.includes('CRICKET')
        : s.match?.sportType && !s.match.sportType.includes('CRICKET')
    );
    const matchCount = matchStats.length;
    const isProv = isProvisional(matchCount);

    const facets = await computePlayerFacets(player.id, isCricket ? 'cricket' : 'football', playerMmr);

    const origin = new URL(req.url).origin;
    const rankIconUrl = rankData.icon ? `${origin}${rankData.icon}` : '';
    const avatarUrl = player.avatarUrl || '';

    // Color definitions based on tier
    let borderColor = '#3b3b3b';
    let cardBg = 'linear-gradient(135deg, #111 0%, #1c1c1c 100%)';
    let textColor = '#888888';
    let nameBg = 'rgba(255,255,255,0.03)';

    if (!isProv) {
      switch (rankData.tier) {
        case 'Bronze':
          borderColor = '#cd7f32';
          cardBg = 'linear-gradient(135deg, #2a1a0a 0%, #3d2510 50%, #1a0e06 100%)';
          textColor = '#cd7f32';
          nameBg = 'rgba(205,127,50,0.12)';
          break;
        case 'Silver':
          borderColor = '#c0c0c0';
          cardBg = 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #111111 100%)';
          textColor = '#c0c0c0';
          nameBg = 'rgba(192,192,192,0.08)';
          break;
        case 'Gold':
          borderColor = '#ffd700';
          cardBg = 'linear-gradient(135deg, #1a1400 0%, #2d2400 50%, #0f0d00 100%)';
          textColor = '#ffd700';
          nameBg = 'rgba(255,215,0,0.10)';
          break;
        case 'Platinum':
          borderColor = '#00e5ff';
          cardBg = 'linear-gradient(135deg, #001a1f 0%, #002530 50%, #000d10 100%)';
          textColor = '#00e5ff';
          nameBg = 'rgba(0,229,255,0.08)';
          break;
        case 'Legend':
          borderColor = '#ff00ff';
          cardBg = 'linear-gradient(135deg, #1a001a 0%, #280028 50%, #0d000d 100%)';
          textColor = '#ff00ff';
          nameBg = 'rgba(255,0,255,0.10)';
          break;
      }
    }

    const width = format === 'story' ? 1080 : 1080;
    const height = format === 'story' ? 1920 : 1080;

    const displayFacets = isCricket
      ? [
          { label: 'BAT', val: facets.ATT },
          { label: 'FRM', val: facets.FRM },
          { label: 'BWL', val: facets.PLY },
          { label: 'WIN', val: facets.WIN },
          { label: 'REL', val: facets.REL },
          { label: 'EXP', val: facets.EXP },
        ]
      : [
          { label: 'ATT', val: facets.ATT },
          { label: 'FRM', val: facets.FRM },
          { label: 'PLY', val: facets.PLY },
          { label: 'WIN', val: facets.WIN },
          { label: 'REL', val: facets.REL },
          { label: 'EXP', val: facets.EXP },
        ];

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#050505',
            padding: format === 'story' ? '80px 40px' : '40px',
          }}
        >
          {/* Card Container simulating FIFA card design */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '600px',
              height: '900px',
              background: cardBg,
              border: `3px solid ${borderColor}`,
              borderRadius: '32px',
              padding: '40px',
              position: 'relative',
            }}
          >
            {/* Top Row: Overall & Position vs Rank Icon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '72px', fontWeight: 900, color: textColor, lineHeight: 1 }}>
                  {isProv ? '—' : facets.overall}
                </span>
                <span style={{ fontSize: '20px', fontWeight: 900, color: textColor, opacity: 0.8, letterSpacing: '2px', marginTop: '4px' }}>
                  {player.position || '—'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {rankIconUrl && (
                  <img
                    src={rankIconUrl}
                    style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                    alt=""
                  />
                )}
                <span style={{ fontSize: '14px', fontWeight: 900, color: textColor, opacity: 0.7, marginTop: '4px', letterSpacing: '1px' }}>
                  {isProv ? 'CALIBRATING' : rankData.label.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Avatar image area */}
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', margin: '20px 0' }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  style={{
                    width: '240px',
                    height: '240px',
                    borderRadius: '120px',
                    border: `4px solid ${borderColor}`,
                    objectFit: 'cover',
                  }}
                  alt=""
                />
              ) : (
                <div
                  style={{
                    width: '200px',
                    height: '200px',
                    borderRadius: '100px',
                    border: `4px dashed ${borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '64px',
                    fontWeight: 900,
                    color: textColor,
                    opacity: 0.4,
                  }}
                >
                  {player.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: nameBg,
                borderRadius: '16px',
                padding: '12px 24px',
                marginBottom: '30px',
                width: '100%',
              }}
            >
              <span style={{ fontSize: '28px', fontWeight: 900, color: textColor, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center' }}>
                {player.fullName}
              </span>
            </div>

            {/* Facets Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between', marginBottom: '20px' }}>
              {displayFacets.map(f => (
                <div
                  key={f.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '45%',
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>
                    {f.label}
                  </span>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: textColor }}>
                    {isProv ? '—' : f.val}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer logo and brand watermark */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 'auto' }}>
              <span style={{ fontSize: '14px', fontWeight: 900, color: textColor, opacity: 0.5, letterSpacing: '4px' }}>
                BOOK MY TURF
              </span>
              <span style={{ fontSize: '14px', fontWeight: 900, color: textColor, opacity: 0.5, fontFamily: 'monospace' }}>
                {player.playerCode}
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width,
        height,
      }
    );
  } catch (err: any) {
    return new Response(`Failed to generate OG image: ${err.message}`, { status: 500 });
  }
}
