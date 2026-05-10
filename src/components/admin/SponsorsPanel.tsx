'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ImagePlus, Trash2, Loader2, Upload, Link2, ToggleLeft, ToggleRight, CheckCircle2, X, Settings2, Gauge, ShieldCheck, Hand } from 'lucide-react';
import { uploadFileToCDN } from '@/lib/supabase';

interface Sponsor {
  id: string;
  imageUrl: string;
  ctaText?: string | null;
  ctaLink?: string | null;
  order: number;
  active: boolean;
}
interface SponsorSettings {
  autoSlide: boolean;
  intervalMs: number;
}

export default function SponsorsPanel() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [settings, setSettings] = useState<SponsorSettings>({ autoSlide: true, intervalMs: 3500 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [newCtaLink, setNewCtaLink] = useState('');
  const [newCtaText, setNewCtaText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch('/api/bmt/sponsors').then(r => r.json());
    setSponsors(data.sponsors ?? []);
    setSettings(data.settings ?? { autoSlide: true, intervalMs: 3500 });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const url = await uploadFileToCDN(file, 'banner');
        await fetch('/api/bmt/sponsors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: url,
            ctaLink: newCtaLink || null,
            ctaText: newCtaText || null,
            order: sponsors.length,
          }),
        });
        showToast('Sponsor added!');
      } catch {
        showToast('Upload failed');
      }
    }
    setNewCtaLink('');
    setNewCtaText('');
    await load();
    setUploading(false);
  };

  const toggleActive = async (sponsor: Sponsor) => {
    await fetch('/api/bmt/sponsors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sponsor.id, active: !sponsor.active }),
    });
    await load();
  };

  const deleteSponsor = async (id: string) => {
    if (!confirm('Delete this sponsor?')) return;
    await fetch('/api/bmt/sponsors', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    showToast('Sponsor deleted');
    await load();
  };

  const updateSponsor = async (id: string, patch: Partial<Sponsor>) => {
    await fetch('/api/bmt/sponsors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    await load();
  };

  const saveSettings = async () => {
    setSaving(true);
    await fetch('/api/bmt/sponsors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'settings', autoSlide: settings.autoSlide, intervalMs: settings.intervalMs }),
    });
    setSaving(false);
    showToast('Settings saved!');
  };

  const speedLabel = (ms: number) => {
    if (ms <= 2000) return 'Very Fast';
    if (ms <= 3000) return 'Fast';
    if (ms <= 4000) return 'Normal';
    if (ms <= 6000) return 'Slow';
    return 'Very Slow';
  };

  return (
    <div className="flex flex-col gap-8">
      {toast && (
        <div className="fixed top-6 right-6 z-[999] px-4 py-3 bg-accent text-black text-sm font-black rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      {/* Upload New Sponsors */}
      <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <ImagePlus size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="font-black text-base">Add Sponsor</h3>
            <p className="text-xs text-[var(--muted)]">Upload sponsor logo and set CTA link</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-1.5">
              <Link2 size={11} /> Button Text <span className="text-[var(--muted)] opacity-50">(optional)</span>
            </label>
            <input
              value={newCtaText}
              onChange={e => setNewCtaText(e.target.value)}
              placeholder="e.g. EXPLORE"
              className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-accent/50 placeholder:text-[var(--muted)] transition-colors"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-1.5">
              <Link2 size={11} /> CTA Link <span className="text-[var(--muted)] opacity-50">(optional)</span>
            </label>
            <input
              value={newCtaLink}
              onChange={e => setNewCtaLink(e.target.value)}
              placeholder="e.g. https://sponsor-website.com"
              className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-accent/50 placeholder:text-[var(--muted)] transition-colors"
            />
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="group relative w-full h-32 rounded-2xl border-2 border-dashed border-[var(--panel-border)] hover:border-accent/50 transition-all flex flex-col items-center justify-center gap-2 bg-[var(--panel-bg)] hover:bg-accent/3 disabled:opacity-50"
        >
          {uploading ? (
            <><Loader2 size={24} className="text-accent animate-spin" /><p className="text-sm font-bold text-accent">Uploading…</p></>
          ) : (
            <><Upload size={24} className="text-[var(--muted)] group-hover:text-accent transition-colors" />
            <p className="text-sm font-bold text-[var(--muted)] group-hover:text-accent transition-colors">Click to upload logo</p>
            <p className="text-xs text-[var(--muted)] opacity-60">Square or rectangular images</p></>
          )}
        </button>
      </div>

      {/* Settings */}
      <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Settings2 size={18} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-black text-base">Sponsor Bar Settings</h3>
            <p className="text-xs text-[var(--muted)]">Control auto-slide vs finger slide behaviour</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)]">
            <div>
              <p className="text-sm font-bold">Auto Slide</p>
              <p className="text-xs text-[var(--muted)]">If off, users must drag/finger-slide to view sponsors</p>
            </div>
            <button onClick={() => setSettings(s => ({ ...s, autoSlide: !s.autoSlide }))} className="shrink-0 transition-all active:scale-90">
              {settings.autoSlide ? <ToggleRight size={40} className="text-accent" /> : <ToggleLeft size={40} className="text-[var(--muted)]" />}
            </button>
          </div>

          {settings.autoSlide && (
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge size={15} className="text-[var(--muted)]" />
                  <p className="text-sm font-bold">Slide Speed</p>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent">
                  {speedLabel(settings.intervalMs)} · {(settings.intervalMs / 1000).toFixed(1)}s
                </span>
              </div>
              <input type="range" min={1500} max={8000} step={500} value={settings.intervalMs} onChange={e => setSettings(s => ({ ...s, intervalMs: +e.target.value }))} className="w-full accent-[#00ff41] h-2 rounded-full" />
              <div className="flex justify-between text-[10px] text-[var(--muted)] font-semibold">
                <span>Very Fast</span><span>Normal</span><span>Very Slow</span>
              </div>
            </div>
          )}

          <button onClick={saveSettings} disabled={saving} className="flex items-center justify-center gap-2 py-3 bg-accent text-black font-black rounded-xl hover:brightness-110 transition-all disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Save Settings
          </button>
        </div>
      </div>

      {/* Active Sponsors */}
      <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-base">Active Sponsors ({sponsors.length})</h3>
          <button onClick={load} className="text-xs text-[var(--muted)] hover:text-foreground transition-colors font-bold">Refresh</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-accent animate-spin" />
          </div>
        ) : sponsors.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ShieldCheck size={32} className="text-[var(--muted)] opacity-30" />
            <p className="text-sm font-semibold text-[var(--muted)]">No sponsors yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sponsors.map((sponsor, idx) => (
              <SponsorCard key={sponsor.id} sponsor={sponsor} index={idx} onToggle={() => toggleActive(sponsor)} onDelete={() => deleteSponsor(sponsor.id)} onUpdate={(patch) => updateSponsor(sponsor.id, patch)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SponsorCard({ sponsor, index, onToggle, onDelete, onUpdate }: { sponsor: Sponsor; index: number; onToggle: () => void; onDelete: () => void; onUpdate: (patch: Partial<Sponsor>) => void; }) {
  const [editing, setEditing] = useState(false);
  const [ctaLink, setCtaLink] = useState(sponsor.ctaLink ?? '');
  const [ctaText, setCtaText] = useState(sponsor.ctaText ?? '');

  const save = () => { onUpdate({ ctaLink: ctaLink || null, ctaText: ctaText || null }); setEditing(false); };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all bg-[var(--panel-bg)] ${sponsor.active ? 'border-[var(--panel-border)]' : 'border-[var(--panel-border)] opacity-50'}`}>
      <div className="p-4 flex gap-4 items-center">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white shrink-0 border border-[var(--panel-border)] p-2">
          <img src={sponsor.imageUrl} alt="Sponsor Logo" className="w-full h-full object-contain" />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${sponsor.active ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-[var(--panel-border)] text-[var(--muted)] border-[var(--panel-border)]'}`}>
              {sponsor.active ? 'Visible' : 'Hidden'}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                <Trash2 size={13} className="text-red-400" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div>
              {sponsor.ctaLink && <p className="text-[10px] font-bold text-accent">BTN: {sponsor.ctaText || 'EXPLORE'}</p>}
              <p className="text-xs text-[var(--muted)] truncate">{sponsor.ctaLink || 'No link'}</p>
            </div>
            <button onClick={() => setEditing(true)} className="text-[11px] font-black text-accent hover:underline">Edit CTA</button>
          </div>
        </div>
      </div>

      {editing && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          <input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Button Text (e.g. EXPLORE)" className="bg-[var(--background)] border border-[var(--panel-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50 placeholder:text-[var(--muted)]" />
          <input value={ctaLink} onChange={e => setCtaLink(e.target.value)} placeholder="CTA Link (e.g. https://...)" className="bg-[var(--background)] border border-[var(--panel-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50 placeholder:text-[var(--muted)]" />
          <div className="flex gap-2">
            <button onClick={save} className="flex-1 py-2 bg-accent text-black text-xs font-black rounded-lg hover:brightness-110">Save</button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 border border-[var(--panel-border)] text-xs font-bold rounded-lg hover:bg-[var(--panel-bg)]"><X size={12} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
