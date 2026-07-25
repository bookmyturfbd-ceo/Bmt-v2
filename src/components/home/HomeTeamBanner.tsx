'use client';

import { useState, useRef } from 'react';
import { ChevronRight, Camera, Loader2, Shield, AlertCircle, Upload, Check } from 'lucide-react';
import { uploadFileToCDN } from '@/lib/supabase';
import { getRankData } from '@/lib/rankUtils';
import { Link } from '@/i18n/routing';

interface Team {
  id: string;
  name: string;
  logoUrl?: string | null;
  sportType: string;
  footballMmr: number;
  cricketMmr: number;
  homeAreas?: any[];
  _count?: { members: number };
}

interface HomeTeamBannerProps {
  locale: string;
  primaryTeam: Team | null;
  primaryTeamCompletedCount: number;
  createTeamCTAText: string;
  calibratingText: string;
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export default function HomeTeamBanner({
  locale,
  primaryTeam: initialTeam,
  primaryTeamCompletedCount,
  createTeamCTAText,
  calibratingText,
}: HomeTeamBannerProps) {
  const [team, setTeam] = useState<Team | null>(initialTeam);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (files: FileList | null) => {
    if (!files?.[0] || !team) return;
    const file = files[0];

    setUploading(true);
    setError(null);
    setUploadSuccess(false);

    try {
      // 1. Upload to CDN
      const uploadedUrl = await uploadFileToCDN(file, 'team-logos');

      // 2. Save logoUrl to DB via PATCH
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_logo',
          payload: { logoUrl: uploadedUrl },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update team logo');
      }

      // 3. Update local state
      setTeam((prev) => prev ? { ...prev, logoUrl: uploadedUrl } : null);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Logo upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Case 1: Player has NO team
  if (!team) {
    return (
      <Link
        href="/teams?create=true"
        className="group block relative overflow-hidden rounded-2xl border border-dashed border-accent/25 hover:border-accent/40 bg-[#00ff41]/5 hover:bg-[#00ff41]/10 p-3.5 flex items-center justify-between active:scale-[0.98] transition-all text-center"
      >
        <span className="text-xs font-black text-accent uppercase tracking-wider flex items-center gap-1.5 mx-auto">
          {createTeamCTAText || 'Create your team & enter the Arena ⚔️'}
        </span>
      </Link>
    );
  }

  // Calculate MMR and rank details
  const mmr = team.sportType?.includes('CRICKET') ? team.cricketMmr : team.footballMmr;
  const isProv = primaryTeamCompletedCount < 3;
  const rank = getRankData(mmr);
  const hasLogo = !!team.logoUrl;

  return (
    <div className="flex flex-col gap-2">
      {/* Primary Team Card */}
      <Link
        href={`/teams/${team.id}`}
        className="group block relative overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/50 hover:bg-neutral-900 p-3.5 flex items-center justify-between active:scale-[0.98] transition-all"
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: isProv ? '#00ff41' : rank.color }}
        />

        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group/logo">
            {hasLogo ? (
              <img src={team.logoUrl!} alt={team.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-black text-accent">{getInitials(team.name)}</span>
            )}
          </div>
          <div>
            <p className="font-black text-sm text-white group-hover:text-accent transition-colors leading-tight">
              {team.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold text-neutral-400">
                {isProv
                  ? calibratingText || `Calibrating · ${primaryTeamCompletedCount}/3 matches`
                  : `${rank.label} · ${mmr} MMR`}
              </span>
            </div>
          </div>
        </div>

        <ChevronRight size={16} className="text-neutral-600 group-hover:text-accent transition-colors" />
      </Link>

      {/* Upload Logo Reminder Strip if Team has NO Logo */}
      {!hasLogo && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Camera size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-black text-amber-200 leading-tight">
                {locale === 'bn' ? 'দলের লোগো সেট করা নেই' : 'Missing Team Logo'}
              </p>
              <p className="text-[10px] text-amber-300/80 font-medium">
                {locale === 'bn'
                  ? 'আপনার দলের একটি সুন্দর লোগো যোগ করুন'
                  : 'Add a logo to make your team stand out in matches'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end mt-1 sm:mt-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLogoUpload(e.target.files)}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {uploading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>{locale === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...'}</span>
                </>
              ) : uploadSuccess ? (
                <>
                  <Check size={13} />
                  <span>{locale === 'bn' ? 'সম্পন্ন!' : 'Uploaded!'}</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>{locale === 'bn' ? 'লোগো আপলোড করুন' : 'Upload Logo'}</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="w-full text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1 mt-1">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
