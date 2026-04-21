'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ImagePlus, Trash2, Loader2, Upload, Link2, ToggleLeft, ToggleRight,
  GripVertical, Eye, EyeOff, CheckCircle2, X, Settings2, Gauge,
} from 'lucide-react';
import { uploadFileToCDN } from '@/lib/supabase';

interface Slide {
  id: string;
  imageUrl: string;
  ctaText?: string | null;
  ctaLink?: string | null;
  order: number;
  active: boolean;
}
interface CarouselSettings {
  autoSlide: boolean;
  intervalMs: number;
}

export default function FrontendPanel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [settings, setSettings] = useState<CarouselSettings>({ autoSlide: true, intervalMs: 3500 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // New slide form
  const [newCtaText, setNewCtaText] = useState('');
  const [newCtaLink, setNewCtaLink] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch('/api/bmt/banner-slides').then(r => r.json());
    setSlides(data.slides ?? []);
    setSettings(data.settings ?? { autoSlide: true, intervalMs: 3500 });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Upload image + create slide
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const url = await uploadFileToCDN(file, 'banner');
        await fetch('/api/bmt/banner-slides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: url,
            ctaText: newCtaText || null,
            ctaLink: newCtaLink || null,
            order: slides.length,
          }),
        });
        showToast('Slide added!');
      } catch {
        showToast('Upload failed');
      }
    }
    setNewCtaText('');
    setNewCtaLink('');
    await load();
    setUploading(false);
  };

  // Toggle active
  const toggleActive = async (slide: Slide) => {
    await fetch('/api/bmt/banner-slides', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: slide.id, active: !slide.active }),
    });
    await load();
  };

  // Delete slide
  const deleteSlide = async (id: string) => {
    if (!confirm('Delete this slide?')) return;
    await fetch('/api/bmt/banner-slides', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    showToast('Slide deleted');
    await load();
  };

  // Update CTA inline
  const updateSlide = async (id: string, patch: Partial<Slide>) => {
    await fetch('/api/bmt/banner-slides', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    await load();
  };

  // Save carousel settings
  const saveSettings = async () => {
    setSaving(true);
    await fetch('/api/bmt/banner-slides', {
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

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[999] px-4 py-3 bg-accent text-black text-sm font-black rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      {/* ── Upload New Slides ── */}
      <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <ImagePlus size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="font-black text-base">Add Carousel Slides</h3>
            <p className="text-xs text-[var(--muted)]">Upload images that will appear in the home page hero</p>
          </div>
        </div>

        {/* Optional CTA fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-1.5">
              <Link2 size={11} /> CTA Button Text <span className="text-[var(--muted)] opacity-50">(optional)</span>
            </label>
            <input
              value={newCtaText}
              onChange={e => setNewCtaText(e.target.value)}
              placeholder="e.g. Book Now"
              className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-accent/50 placeholder:text-[var(--muted)] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] flex items-center gap-1.5">
              <Link2 size={11} /> CTA Link <span className="text-[var(--muted)] opacity-50">(optional)</span>
            </label>
            <input
              value={newCtaLink}
              onChange={e => setNewCtaLink(e.target.value)}
              placeholder="e.g. /en/book"
              className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-accent/50 placeholder:text-[var(--muted)] transition-colors"
            />
          </div>
        </div>

        {/* Upload dropzone */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="group relative w-full h-32 rounded-2xl border-2 border-dashed border-[var(--panel-border)] hover:border-accent/50 transition-all flex flex-col items-center justify-center gap-2 bg-[var(--panel-bg)] hover:bg-accent/3 disabled:opacity-50"
        >
          {uploading ? (
            <><Loader2 size={24} className="text-accent animate-spin" /><p className="text-sm font-bold text-accent">Uploading…</p></>
          ) : (
            <><Upload size={24} className="text-[var(--muted)] group-hover:text-accent transition-colors" />
            <p className="text-sm font-bold text-[var(--muted)] group-hover:text-accent transition-colors">Click to upload images</p>
            <p className="text-xs text-[var(--muted)] opacity-60">Multiple files supported · JPG, PNG, WebP</p></>
          )}
        </button>
      </div>

      {/* ── Carousel Settings ── */}
      <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Settings2 size={18} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-black text-base">Carousel Settings</h3>
            <p className="text-xs text-[var(--muted)]">Control auto-slide behaviour and speed</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Auto-slide toggle */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)]">
            <div>
              <p className="text-sm font-bold">Auto Slide</p>
              <p className="text-xs text-[var(--muted)]">Slides advance automatically without user interaction</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, autoSlide: !s.autoSlide }))}
              className="shrink-0 transition-all active:scale-90"
            >
              {settings.autoSlide
                ? <ToggleRight size={40} className="text-accent" />
                : <ToggleLeft size={40} className="text-[var(--muted)]" />}
            </button>
          </div>

          {/* Speed slider — only when auto enabled */}
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
              <input
                type="range"
                min={1500}
                max={8000}
                step={500}
                value={settings.intervalMs}
                onChange={e => setSettings(s => ({ ...s, intervalMs: +e.target.value }))}
                className="w-full accent-[#00ff41] h-2 rounded-full"
              />
              <div className="flex justify-between text-[10px] text-[var(--muted)] font-semibold">
                <span>Very Fast (1.5s)</span><span>Normal (3.5s)</span><span>Very Slow (8s)</span>
              </div>
            </div>
          )}

          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center justify-center gap-2 py-3 bg-accent text-black font-black rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Save Settings
          </button>
        </div>
      </div>

      {/* ── Manage Slides ── */}
      <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-base">Active Slides ({slides.length})</h3>
          <button onClick={load} className="text-xs text-[var(--muted)] hover:text-foreground transition-colors font-bold">Refresh</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-accent animate-spin" />
          </div>
        ) : slides.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ImagePlus size={32} className="text-[var(--muted)] opacity-30" />
            <p className="text-sm font-semibold text-[var(--muted)]">No slides yet — upload images above</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {slides.map((slide, idx) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                index={idx}
                onToggle={() => toggleActive(slide)}
                onDelete={() => deleteSlide(slide.id)}
                onUpdate={(patch) => updateSlide(slide.id, patch)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Slide Card ──────────────────────────────────────────────────────────────
function SlideCard({
  slide, index, onToggle, onDelete, onUpdate,
}: {
  slide: Slide; index: number;
  onToggle: () => void; onDelete: () => void;
  onUpdate: (patch: Partial<Slide>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [ctaText, setCtaText] = useState(slide.ctaText ?? '');
  const [ctaLink, setCtaLink] = useState(slide.ctaLink ?? '');

  const save = () => {
    onUpdate({ ctaText: ctaText || null, ctaLink: ctaLink || null });
    setEditing(false);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all bg-[var(--panel-bg)] ${slide.active ? 'border-[var(--panel-border)]' : 'border-[var(--panel-border)] opacity-50'}`}>
      {/* Horizontal layout: thumbnail + info */}
      <div className="p-4 flex gap-4 items-start">
        {/* Small thumbnail */}
        <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-[var(--panel-border)]">
          <img src={slide.imageUrl} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
          <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
            #{index + 1}
          </span>
          {slide.ctaText && (
            <span className="absolute bottom-1.5 left-1 right-1 bg-accent text-black text-[8px] font-black px-1.5 py-0.5 rounded text-center truncate">
              {slide.ctaText}
            </span>
          )}
        </div>

        {/* Info + actions */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${slide.active ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-[var(--panel-border)] text-[var(--muted)] border-[var(--panel-border)]'}`}>
              {slide.active ? 'Visible' : 'Hidden'}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={onToggle}
                className="w-7 h-7 rounded-lg bg-[var(--background)] border border-[var(--panel-border)] flex items-center justify-center hover:border-accent/40 transition-colors">
                {slide.active ? <Eye size={13} className="text-accent" /> : <EyeOff size={13} className="text-[var(--muted)]" />}
              </button>
              <button onClick={onDelete}
                className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-colors">
                <Trash2 size={13} className="text-red-400" />
              </button>
            </div>
          </div>

          {slide.ctaText ? (
            <div>
              <p className="text-xs font-bold text-foreground truncate">{slide.ctaText}</p>
              <p className="text-[10px] text-[var(--muted)] truncate">{slide.ctaLink || 'No link'}</p>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--muted)] italic">No CTA</p>
          )}
        </div>
      </div>

      {/* CTA edit section */}
      <div className="px-4 pb-4 flex flex-col gap-3">
        {editing ? (
          <div className="flex flex-col gap-2">
            <input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="CTA Button Text"
              className="bg-[var(--background)] border border-[var(--panel-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50 placeholder:text-[var(--muted)]" />
            <input value={ctaLink} onChange={e => setCtaLink(e.target.value)} placeholder="CTA Link (e.g. /en/book)"
              className="bg-[var(--background)] border border-[var(--panel-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50 placeholder:text-[var(--muted)]" />
            <div className="flex gap-2">
              <button onClick={save} className="flex-1 py-2 bg-accent text-black text-xs font-black rounded-lg hover:brightness-110">Save</button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 border border-[var(--panel-border)] text-xs font-bold rounded-lg hover:bg-[var(--panel-bg)]">
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              {slide.ctaText ? (
                <div>
                  <p className="text-xs font-bold text-foreground">{slide.ctaText}</p>
                  <p className="text-[10px] text-[var(--muted)]">{slide.ctaLink || 'No link'}</p>
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)] italic">No CTA set</p>
              )}
            </div>
            <button onClick={() => setEditing(true)}
              className="text-[11px] font-black text-accent hover:underline">
              Edit CTA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
