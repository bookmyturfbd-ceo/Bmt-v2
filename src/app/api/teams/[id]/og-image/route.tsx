import { ImageResponse } from 'next/og';
import prisma from '@/lib/prisma';
import { getRankData } from '@/lib/rankUtils';

export const runtime = 'edge';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        matchesAsTeamA: { where: { status: 'COMPLETED' } },
        matchesAsTeamB: { where: { status: 'COMPLETED' } },
      }
    });

    if (!team) {
      return new Response('Team not found', { status: 404 });
    }

    const allMatches = [...team.matchesAsTeamA, ...team.matchesAsTeamB];
    const completedCount = allMatches.length;

    let w = 0, l = 0, d = 0;
    allMatches.forEach(m => {
      if (m.winnerId === team.id) w++;
      else if (m.winnerId === null && m.scoreA === m.scoreB) d++;
      else l++;
    });

    const isCricket = team.sportType?.includes('CRICKET') || team.sportType === 'CRICKET';
    const rankedMmr = isCricket ? (team.cricketMmr ?? 1000) : (team.footballMmr ?? 1000);
    const rd = getRankData(rankedMmr);

    const isCalibrating = completedCount < 5;
    const calibratingLabel = `Calibrating ${completedCount}/5`;

    const sportLabel = isCricket ? 'Cricket' : (team.sportType?.includes('FOOTBALL') ? 'Football' : 'Futsal');

    // Build absolute URL for the rank icon to ensure Satori can fetch it
    const origin = new URL(req.url).origin;
    const rankIconUrl = rd.icon ? `${origin}${rd.icon}` : '';
    const logoUrl = team.logoUrl || '';

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
            background: 'radial-gradient(circle at center, #0b130c 0%, #030704 100%)',
            border: '8px solid #00ff41',
            borderRadius: '24px',
            padding: '40px',
            fontFamily: 'sans-serif',
            color: 'white',
          }}
        >
          {/* Top Logo / Crest */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50px',
                  border: '3px solid #00ff41',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50px',
                  border: '3px solid #6b7280',
                  background: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                }}
              >
                🛡️
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '36px', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
                {team.name}
              </span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#00ff41', textTransform: 'uppercase', letterSpacing: '2px' }}>
                {sportLabel} Team
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div
            style={{
              display: 'flex',
              gap: '40px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '16px 36px',
              borderRadius: '16px',
              marginBottom: '30px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>Played</span>
              <span style={{ fontSize: '24px', fontWeight: 900, color: 'white' }}>{completedCount}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#00ff41', fontWeight: 700, textTransform: 'uppercase' }}>Wins</span>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#00ff41' }}>{w}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>Losses</span>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#ef4444' }}>{l}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase' }}>Draws</span>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#3b82f6' }}>{d}</span>
            </div>
          </div>

          {/* Rank Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
            {isCalibrating ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(156,163,175,0.1)',
                  border: '1px dashed rgba(156,163,175,0.3)',
                  padding: '16px 30px',
                  borderRadius: '20px',
                }}
              >
                <span style={{ fontSize: '32px', fontWeight: 900, color: '#9ca3af', textTransform: 'uppercase' }}>
                  ?
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#9ca3af', marginTop: '4px' }}>
                  {calibratingLabel}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {rankIconUrl && (
                  <img
                    src={rankIconUrl}
                    style={{
                      width: '64px',
                      height: '64px',
                      objectFit: 'contain',
                    }}
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: rd.color, textTransform: 'uppercase' }}>
                    {rd.label}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#9ca3af' }}>
                    {rankedMmr} MMR
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer branding */}
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px' }}>
            Book My Turf · Join the Challenge
          </span>
        </div>
      ),
      {
        width: 600,
        height: 400,
      }
    );
  } catch (err: any) {
    console.error('[OG Image error]', err);
    return new Response('Failed to generate image', { status: 500 });
  }
}
