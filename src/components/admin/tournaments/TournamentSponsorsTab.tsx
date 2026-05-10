'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Loader2, Upload, Star, Link as LinkIcon,
  CheckCircle2, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import { uploadFileToCDN } from '@/lib/supabase';

interface Sponsor {
  id: string; name: string; logoUrl: string;
  type: 'MAIN' | 'CO_SPONSOR'; ctaUrl?: string; order: number;
}

export default function TournamentSponsorsTab({ tournamentId }: { tournamentId: string }) {
  const [sponsors, setSponsors]     = useState<Sponsor[]>([]);
  const [loading, setLoading]       = useState(true);
  const [adding, setAdding]         = useState(false);
  const [form, setForm]             = useState({ name: '', type: 'CO_SPONSOR' as 'MAIN' | 'CO_SPONSOR', ctaUrl: '' });
  const [logoFile, setLogoFile]     = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploading, setUploading]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [dragging, setDragging]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await fetch(`/api/tournaments/${tournamentId}/sponsors`);
    const data = await res.json();
    if (data.success) setSponsors(data.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [tournamentId]);

  const handleFile = async (file: File) => {
    setLogoPreview(URL.createObjectURL(file));
    setLogoFile(file);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !logoFile) return;
    setSaving(true);
    setUploading(true);
    const url = await uploadFileToCDN(logoFile, 'tournament-sponsors');
    setUploading(false);
    if (!url) { setSaving(false); alert('Logo upload failed.'); return; }

    const res = await fetch(`/api/tournaments/${tournamentId}/sponsors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, logoUrl: url, type: form.type, ctaUrl: form.ctaUrl || undefined }),
    });
    const data = await res.json();
    if (data.success) {
      setAdding(false);
      setForm({ name: '', type: 'CO_SPONSOR', ctaUrl: '' });
      setLogoFile(null); setLogoPreview('');
      load();
    } else { alert(data.error); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await fetch(`/api/tournaments/${tournamentId}/sponsors?sponsorId=${id}`, { method: 'DELETE' });
    setDeletingId(null);
    load();
  };

  const mainSponsors = sponsors.filter(s => s.type === 'MAIN');
  const coSponsors   = sponsors.filter(s => s.type === 'CO_SPONSOR');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black uppercase tracking-wider">Sponsors</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Add sponsor logos visible to all players on the tournament page.</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-black font-black uppercase tracking-wider text-xs rounded-xl hover:brightness-110 transition-all"
          >
            <Plus size={14} /> Add Sponsor
          </button>
        )}
      </div>

      {/* Add Form */}
      {adding && (
        <div className="bg-black/50 border border-accent/20 rounded-2xl p-5 flex flex-col gap-4">
          <p className="text-xs font-black uppercase tracking-widest text-accent">New Sponsor</p>

          {/* Logo Upload */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => fileRef.current?.click()}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${dragging ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-white/25'}`}
          >
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {logoPreview ? (
              <img src={logoPreview} alt="preview" className="w-16 h-16 object-contain rounded-xl bg-white p-1" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-neutral-800 flex items-center justify-center"><ImageIcon size={24} className="text-neutral-500" /></div>
            )}
            <div>
              <p className="text-sm font-bold">Drop logo or <span className="text-accent">browse</span></p>
              <p className="text-[10px] text-neutral-500 mt-0.5">PNG, SVG, WEBP — white or transparent bg recommended</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Sponsor Name *"
              className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50 placeholder:text-neutral-600"
            />
            <select
              value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'MAIN' | 'CO_SPONSOR' }))}
              className="bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50 appearance-none"
            >
              <option value="MAIN">⭐ Main Sponsor</option>
              <option value="CO_SPONSOR">Co-Sponsor</option>
            </select>
          </div>

          <div className="flex items-center gap-3 bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5">
            <LinkIcon size={14} className="text-neutral-500 shrink-0" />
            <input
              value={form.ctaUrl} onChange={e => setForm(f => ({ ...f, ctaUrl: e.target.value }))}
              placeholder="Website / CTA link (optional)"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-600"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !logoFile}
              className="flex-1 bg-accent text-black font-black uppercase tracking-wider py-2.5 rounded-xl text-xs hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Loader2 size={14} className="animate-spin" /> Saving…</>) : <><CheckCircle2 size={14} /> Save Sponsor</>}
            </button>
            <button onClick={() => { setAdding(false); setLogoFile(null); setLogoPreview(''); setForm({ name: '', type: 'CO_SPONSOR', ctaUrl: '' }); }}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/5 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sponsor List */}
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-neutral-500"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : sponsors.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center gap-3 border border-dashed border-white/10 rounded-2xl">
          <Star size={36} className="text-neutral-800" />
          <p className="text-neutral-500 font-bold text-sm">No sponsors yet</p>
          <p className="text-xs text-neutral-600">Add your main and co-sponsors — they'll appear on the tournament page for all players.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {mainSponsors.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-3 flex items-center gap-1.5"><Star size={11} fill="currentColor" /> Main Sponsor{mainSponsors.length > 1 ? 's' : ''}</p>
              <div className="flex flex-col gap-2">
                {mainSponsors.map(s => <SponsorRow key={s.id} s={s} onDelete={handleDelete} deletingId={deletingId} />)}
              </div>
            </div>
          )}
          {coSponsors.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">Co-Sponsors</p>
              <div className="flex flex-col gap-2">
                {coSponsors.map(s => <SponsorRow key={s.id} s={s} onDelete={handleDelete} deletingId={deletingId} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SponsorRow({ s, onDelete, deletingId }: { s: Sponsor; onDelete: (id: string) => void; deletingId: string | null }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-black/40 border border-white/5 rounded-2xl group">
      <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0">
        <img src={s.logoUrl} alt={s.name} className="w-full h-full object-contain p-1" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-black text-white">{s.name}</p>
          {s.type === 'MAIN' && (
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center gap-1">
              <Star size={8} fill="currentColor" /> Main
            </span>
          )}
        </div>
        {s.ctaUrl && (
          <a href={s.ctaUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-400 flex items-center gap-1 mt-0.5 hover:text-blue-300 transition-colors truncate">
            <ExternalLink size={10} /> {s.ctaUrl}
          </a>
        )}
      </div>
      <button
        onClick={() => onDelete(s.id)}
        disabled={deletingId === s.id}
        className="w-8 h-8 rounded-xl bg-red-500/0 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 flex items-center justify-center text-neutral-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
      >
        {deletingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </div>
  );
}
