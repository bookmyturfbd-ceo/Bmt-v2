'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, MapPin, Dumbbell, Star, Zap, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import { useApiEntity } from '@/hooks/useApiEntity';

interface Division { id: string; name: string; }
interface City     { id: string; name: string; divisionId: string; }
interface Sport    { id: string; name: string; category?: string; }
interface Amenity  { id: string; name: string; }

type Tab = 'geo' | 'sports' | 'amenities' | 'turfService';

// ── Generic tag list ────────────────────────────────────────────────────────────
function TagList({
  items, onDelete, loading,
}: { items: { id: string; name: string }[]; onDelete: (id: string) => void; loading: boolean }) {
  if (loading) return (
    <div className="flex items-center gap-2 text-[var(--muted)] text-sm py-2">
      <Loader2 size={14} className="animate-spin" /> Loading…
    </div>
  );
  if (items.length === 0) return <p className="text-sm text-[var(--muted)] py-2 italic">None added yet.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <span key={item.id} className="flex flex-col gap-0.5 px-3 py-1.5 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black">{item.name}</span>
            <button onClick={() => onDelete(item.id)} className="text-[var(--muted)] hover:text-red-400 transition-colors">
              <Trash2 size={11} />
            </button>
          </div>
          {(item as any).category && <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">{(item as any).category}</span>}
        </span>
      ))}
    </div>
  );
}

// ── Add input ────────────────────────────────────────────────────────────────────
function AddInput({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => void }) {
  const [val, setVal] = useState('');
  const submit = () => { if (val.trim()) { onAdd(val.trim()); setVal(''); } };
  return (
    <div className="flex gap-2">
      <input
        value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        className="flex-1 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-accent/50 placeholder:text-[var(--muted)] transition-colors"
      />
      <button onClick={submit}
        className="flex items-center gap-1.5 px-4 py-2 bg-accent text-black text-sm font-black rounded-xl hover:brightness-110 active:scale-95 transition-all shrink-0">
        <Plus size={14} strokeWidth={3} /> Add
      </button>
    </div>
  );
}

// ── Dual Input for Sports ────────────────────────────────────────────────────────
function AddSportInput({ onAdd }: { onAdd: (payload: { name: string; category: string }) => void }) {
  const [name, setName] = useState('');
  const [cat, setCat] = useState('');

  const submit = () => { if (name.trim() && cat.trim()) { onAdd({ name: name.trim(), category: cat.trim() }); setName(''); setCat(''); } };
  return (
    <div className="flex flex-col md:flex-row gap-2">
      <input
        value={name} onChange={e => setName(e.target.value)}
        placeholder="Format (e.g. 5-a-side Futsal)"
        className="flex-1 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-accent/50 placeholder:text-[var(--muted)]"
      />
      <input
        value={cat} onChange={e => setCat(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Parent Category (e.g. Football)"
        className="flex-1 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-accent/50 placeholder:text-[var(--muted)]"
      />
      <button onClick={submit}
        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-accent text-black text-sm font-black rounded-xl hover:brightness-110 active:scale-95 transition-all shrink-0">
        <Plus size={14} strokeWidth={3} /> Add
      </button>
    </div>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-2xl p-5 md:p-6 flex flex-col gap-4 border border-[var(--panel-border)]">
      <h3 className="text-sm font-black uppercase tracking-widest text-[var(--muted)]">{title}</h3>
      {children}
    </div>
  );
}

// ── Turf Service Panel ────────────────────────────────────────────────────────────
function TurfServicePanel() {
  const [isActive, setIsActive] = useState(false);
  const [launchAt, setLaunchAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    fetch('/api/admin/turf-service-setting')
      .then(r => r.json())
      .then(d => {
        setIsActive(d.isActive ?? false);
        if (d.launchAt) {
          const dt = new Date(d.launchAt);
          const pad = (n: number) => String(n).padStart(2, '0');
          setLaunchAt(
            `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Live countdown ticker
  useEffect(() => {
    if (!isActive || !launchAt) { setCountdown(''); return; }
    const tick = () => {
      const diff = new Date(launchAt).getTime() - Date.now();
      if (diff <= 0) { setCountdown('🟢 Launch time reached!'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isActive, launchAt]);

  const save = async () => {
    setSaving(true); setMsg('');
    const res = await fetch('/api/admin/turf-service-setting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive, launchAt: launchAt ? new Date(launchAt).toISOString() : null }),
    });
    if (res.ok) setMsg('✅ Saved successfully!');
    else setMsg('❌ Failed to save');
    setSaving(false);
  };

  if (loading) return <div className="flex items-center gap-2 py-6 text-[var(--muted)]"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  return (
    <div className="flex flex-col gap-5">
      {/* Status banner */}
      <div className={`rounded-2xl p-4 border flex items-center gap-3 ${isActive ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[var(--panel-bg)] border-[var(--panel-border)]'}`}>
        <div className={`w-3 h-3 rounded-full shrink-0 ${isActive ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse' : 'bg-neutral-600'}`} />
        <div className="flex-1">
          <p className="text-sm font-black">{isActive ? '🚧 Turf Service: Coming Soon Mode ON' : '✅ Turf Service: Live & Active'}</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            {isActive ? 'Players see a countdown timer instead of turfs.' : 'Turfs are fully visible and bookable on the platform.'}
          </p>
        </div>
      </div>

      {/* Toggle */}
      <Section title="Enable Coming Soon Mode">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Coming Soon Overlay</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">When enabled, turfs are hidden and a countdown is shown instead.</p>
          </div>
          <button onClick={() => setIsActive(v => !v)} className="transition-all">
            {isActive
              ? <ToggleRight size={40} className="text-accent" />
              : <ToggleLeft size={40} className="text-neutral-600" />
            }
          </button>
        </div>
      </Section>

      {/* Date & Time Picker */}
      <Section title="Launch Date & Time">
        <p className="text-xs text-[var(--muted)] -mt-1">Set when the countdown will end and turfs go live. Leave blank to show &ldquo;Coming Soon&rdquo; without a timer.</p>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="datetime-local"
            value={launchAt}
            onChange={e => setLaunchAt(e.target.value)}
            className="flex-1 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent/50 text-foreground transition-colors"
          />
          {launchAt && (
            <button
              onClick={() => setLaunchAt('')}
              className="px-4 py-2 text-sm font-bold text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl transition-all hover:bg-red-500/10"
            >
              Clear
            </button>
          )}
        </div>
        {countdown && (
          <div className="flex items-center gap-2 px-4 py-3 bg-accent/5 border border-accent/20 rounded-xl">
            <Clock size={14} className="text-accent shrink-0" />
            <p className="text-sm font-black text-accent font-mono">{countdown}</p>
            <span className="text-xs text-[var(--muted)] ml-1">until launch</span>
          </div>
        )}
      </Section>

      {/* Info box */}
      <div className="rounded-2xl p-4 bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300 font-medium leading-relaxed">
        <p className="font-black text-blue-200 mb-1">📌 What this affects:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Player home page — turf section shows countdown instead of turf cards</li>
          <li>Book page — shows &ldquo;Coming Soon&rdquo; overlay</li>
          <li>Interaction Board — &ldquo;Book Turf via BMT&rdquo; option is greyed out with &ldquo;Coming Soon&rdquo; badge</li>
        </ul>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-accent text-black font-black rounded-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 text-sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {msg && <p className={`text-sm font-bold ${msg.startsWith('✅') ? 'text-accent' : 'text-red-400'}`}>{msg}</p>}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────────
export default function PlatformSettingsPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('geo');

  const divisions = useApiEntity<Division>('divisions');
  const cities    = useApiEntity<City>('cities');
  const sports    = useApiEntity<Sport>('sports');
  const amenities = useApiEntity<Amenity>('amenities');

  const [selectedDivId, setSelectedDivId] = useState('');

  const filteredCities = cities.items.filter(c => c.divisionId === selectedDivId);

  const TABS: { key: Tab; icon: typeof MapPin; label: string }[] = [
    { key: 'geo',         icon: MapPin,    label: 'Divisions & Cities' },
    { key: 'sports',      icon: Dumbbell,  label: 'Sports'             },
    { key: 'amenities',   icon: Star,      label: 'Amenities'          },
    { key: 'turfService', icon: Zap,       label: 'Turf Service'       },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              activeTab === tab.key
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground'
            }`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── Geo Tab ── */}
      {activeTab === 'geo' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Section title="Divisions">
            <AddInput placeholder="e.g. Dhaka" onAdd={name => divisions.add({ name })} />
            <TagList items={divisions.items} onDelete={divisions.remove} loading={divisions.loading} />
          </Section>

          <Section title="Cities / Areas">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">Select Division</label>
              <select value={selectedDivId} onChange={e => setSelectedDivId(e.target.value)}
                className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-accent/50 transition-colors">
                <option value="">— pick a division —</option>
                {divisions.items.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {selectedDivId && (
              <>
                <AddInput
                  placeholder="e.g. Uttara"
                  onAdd={name => cities.add({ name, divisionId: selectedDivId })}
                />
                <TagList
                  items={filteredCities}
                  onDelete={cities.remove}
                  loading={cities.loading}
                />
              </>
            )}
            {!selectedDivId && <p className="text-sm text-[var(--muted)] italic">Select a division first.</p>}
          </Section>
        </div>
      )}

      {/* ── Sports Tab ── */}
      {activeTab === 'sports' && (
        <Section title="Sports & Game Formats">
          <AddSportInput onAdd={payload => sports.add(payload)} />
          <TagList items={sports.items} onDelete={sports.remove} loading={sports.loading} />
          {!sports.loading && sports.items.length > 0 && (
            <p className="text-[11px] text-[var(--muted)] mt-1">
              {sports.items.length} sport(s) configured · These appear on the player home screen.
            </p>
          )}
        </Section>
      )}

      {/* ── Amenities Tab ── */}
      {activeTab === 'amenities' && (
        <Section title="Amenities">
          <AddInput placeholder="e.g. Parking, WiFi, Changing Room…" onAdd={name => amenities.add({ name })} />
          <TagList items={amenities.items} onDelete={amenities.remove} loading={amenities.loading} />
        </Section>
      )}

      {/* ── Turf Service Tab ── */}
      {activeTab === 'turfService' && <TurfServicePanel />}
    </div>
  );
}
