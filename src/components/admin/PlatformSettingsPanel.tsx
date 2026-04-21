'use client';
import { useState } from 'react';
import { Plus, Trash2, Loader2, MapPin, Tag, Dumbbell, Star } from 'lucide-react';
import { useApiEntity } from '@/hooks/useApiEntity';

interface Division { id: string; name: string; }
interface City     { id: string; name: string; divisionId: string; }
interface Sport    { id: string; name: string; category?: string; }
interface Amenity  { id: string; name: string; }

type Tab = 'geo' | 'sports' | 'amenities';

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
    { key: 'geo',       icon: MapPin,    label: 'Divisions & Cities' },
    { key: 'sports',    icon: Dumbbell,  label: 'Sports'             },
    { key: 'amenities', icon: Star,      label: 'Amenities'          },
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
    </div>
  );
}
