'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Tag, Settings, Plus, Trash2, Loader2, CheckCircle,
  AlertCircle, ToggleLeft, ToggleRight, ChevronDown
} from 'lucide-react';

type WbtTurf = {
  id: string;
  name: string;
  divisionId: string;
  cityId: string;
  division: { id: string; name: string };
  city: { id: string; name: string };
};

type WbtCoupon = {
  id: string;
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
};

type Division = { id: string; name: string };
type City = { id: string; name: string };

type Tab = 'turfs' | 'coupons' | 'settings';

export default function OpenWbtPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('turfs');

  // ── Turfs state ──────────────────────────────────────────────────────────────
  const [turfs, setTurfs] = useState<WbtTurf[]>([]);
  const [turfsLoading, setTurfsLoading] = useState(true);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [allCities, setAllCities] = useState<(City & { divisionId: string })[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [newTurfName, setNewTurfName] = useState('');
  const [newTurfDivId, setNewTurfDivId] = useState('');
  const [newTurfCityId, setNewTurfCityId] = useState('');
  const [turfSaving, setTurfSaving] = useState(false);
  const [turfMsg, setTurfMsg] = useState('');

  // ── Coupons state ─────────────────────────────────────────────────────────────
  const [coupons, setCoupons] = useState<WbtCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountType: 'flat' as 'flat' | 'percentage',
    discountValue: 0,
    maxUses: 0,
    expiresAt: '',
  });
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponMsg, setCouponMsg] = useState('');

  // ── Settings state ────────────────────────────────────────────────────────────
  const [matchFee, setMatchFee] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');

  // ── Load data ─────────────────────────────────────────────────────────────────
  const loadTurfs = useCallback(async () => {
    setTurfsLoading(true);
    const res = await fetch('/api/admin/wbt/turfs');
    if (res.ok) { const d = await res.json(); setTurfs(d.turfs || []); }
    setTurfsLoading(false);
  }, []);

  const loadPlatformData = useCallback(async () => {
    const [divRes, cityRes] = await Promise.all([
      fetch('/api/bmt/divisions'),
      fetch('/api/bmt/cities'),
    ]);
    if (divRes.ok) { const d = await divRes.json(); setDivisions(d || []); }
    if (cityRes.ok) {
      const c = await cityRes.json();
      // cities come back as array with { id, name, divisionId, division: {...} }
      setAllCities(c || []);
    }
  }, []);

  const loadCitiesForDiv = useCallback((divId: string) => {
    if (!divId) { setCities([]); return; }
    setCities(allCities.filter(c => c.divisionId === divId));
  }, [allCities]);

  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    const res = await fetch('/api/admin/wbt/coupons');
    if (res.ok) { const d = await res.json(); setCoupons(d.coupons || []); }
    setCouponsLoading(false);
  }, []);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    const res = await fetch('/api/admin/wbt/settings');
    if (res.ok) { const d = await res.json(); setMatchFee(String(d.fee ?? 500)); }
    setSettingsLoading(false);
  }, []);

  useEffect(() => { loadTurfs(); loadPlatformData(); }, []);
  useEffect(() => { if (activeTab === 'coupons') loadCoupons(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'settings') loadSettings(); }, [activeTab]);
  useEffect(() => { loadCitiesForDiv(newTurfDivId); setNewTurfCityId(''); }, [newTurfDivId]);

  // ── Turfs actions ─────────────────────────────────────────────────────────────
  const addTurf = async () => {
    if (!newTurfName.trim() || !newTurfDivId || !newTurfCityId) {
      setTurfMsg('❌ Fill in name, division, and city');
      return;
    }
    setTurfSaving(true); setTurfMsg('');
    const res = await fetch('/api/admin/wbt/turfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTurfName.trim(), divisionId: newTurfDivId, cityId: newTurfCityId }),
    });
    const d = await res.json();
    if (res.ok) {
      setTurfMsg('✅ Turf added!');
      setNewTurfName(''); setNewTurfDivId(''); setNewTurfCityId('');
      loadTurfs();
    } else {
      setTurfMsg('❌ ' + d.error);
    }
    setTurfSaving(false);
  };

  const deleteTurf = async (id: string) => {
    if (!confirm('Delete this WBT turf?')) return;
    const res = await fetch('/api/admin/wbt/turfs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) loadTurfs();
  };

  // ── Coupons actions ───────────────────────────────────────────────────────────
  const addCoupon = async () => {
    if (!newCoupon.code.trim() || !newCoupon.discountValue) {
      setCouponMsg('❌ Fill in all required fields'); return;
    }
    setCouponSaving(true); setCouponMsg('');
    const res = await fetch('/api/admin/wbt/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newCoupon,
        code: newCoupon.code.toUpperCase().trim(),
        expiresAt: newCoupon.expiresAt || null,
      }),
    });
    const d = await res.json();
    if (res.ok) {
      setCouponMsg('✅ Coupon created!');
      setNewCoupon({ code: '', discountType: 'flat', discountValue: 0, maxUses: 0, expiresAt: '' });
      loadCoupons();
    } else {
      setCouponMsg('❌ ' + d.error);
    }
    setCouponSaving(false);
  };

  const toggleCoupon = async (id: string, active: boolean) => {
    await fetch('/api/admin/wbt/coupons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    loadCoupons();
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    await fetch('/api/admin/wbt/coupons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadCoupons();
  };

  // ── Settings actions ──────────────────────────────────────────────────────────
  const saveSettings = async () => {
    setSettingsSaving(true); setSettingsMsg('');
    const res = await fetch('/api/admin/wbt/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fee: parseFloat(matchFee) }),
    });
    if (res.ok) setSettingsMsg('✅ Saved!');
    else setSettingsMsg('❌ Failed to save');
    setSettingsSaving(false);
  };

  const TABS: { key: Tab; label: string; icon: typeof MapPin }[] = [
    { key: 'turfs', label: 'WBT Turfs', icon: MapPin },
    { key: 'coupons', label: 'Coupons', icon: Tag },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-lg md:text-2xl font-black">Open WBT Management</h2>
        <p className="text-sm text-[var(--muted)] mt-1">
          Manage external turfs, discount coupons, and the WBT match fee for the Bring-Your-Own-Turf booking flow.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl p-1 gap-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === key ? 'bg-accent text-black shadow-md' : 'text-[var(--muted)] hover:text-white'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ─── TURFS TAB ─── */}
      {activeTab === 'turfs' && (
        <div className="flex flex-col gap-5">
          {/* Add form */}
          <div className="glass-panel rounded-2xl p-5 border border-[var(--panel-border)]">
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--muted)] mb-4">
              Register New WBT Turf
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input
                value={newTurfName}
                onChange={e => setNewTurfName(e.target.value)}
                placeholder="Turf name…"
                className="bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-accent/50 placeholder:text-[var(--muted)]"
              />
              {/* Division selector */}
              <div className="relative">
                <select
                  value={newTurfDivId}
                  onChange={e => setNewTurfDivId(e.target.value)}
                  className="w-full appearance-none bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-accent/50 pr-8"
                >
                  <option value="">Select Division…</option>
                  {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
              </div>
              {/* City selector */}
              <div className="relative">
                <select
                  value={newTurfCityId}
                  onChange={e => setNewTurfCityId(e.target.value)}
                  disabled={!newTurfDivId}
                  className="w-full appearance-none bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-accent/50 pr-8 disabled:opacity-40"
                >
                  <option value="">Select City…</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
              </div>
            </div>
            {turfMsg && (
              <p className={`text-xs font-bold mb-3 flex items-center gap-1.5 ${turfMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                {turfMsg.startsWith('✅') ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                {turfMsg}
              </p>
            )}
            <button
              onClick={addTurf}
              disabled={turfSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/80 text-black font-black text-sm rounded-xl transition-all disabled:opacity-50"
            >
              {turfSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Add WBT Turf
            </button>
          </div>

          {/* Turf list */}
          <div className="glass-panel rounded-2xl border border-[var(--panel-border)] overflow-hidden">
            {turfsLoading ? (
              <div className="py-16 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>
            ) : turfs.length === 0 ? (
              <div className="py-16 text-center text-[var(--muted)]">
                <MapPin size={32} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold">No WBT turfs registered yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--panel-border)] text-[var(--muted)] text-xs font-black uppercase tracking-widest">
                    <th className="px-5 py-3 text-left">Turf Name</th>
                    <th className="px-5 py-3 text-left">Division</th>
                    <th className="px-5 py-3 text-left">City</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {turfs.map(t => (
                    <tr key={t.id} className="border-b border-[var(--panel-border)]/50 hover:bg-[var(--panel-bg-hover)] transition-colors">
                      <td className="px-5 py-3 font-semibold">{t.name}</td>
                      <td className="px-5 py-3 text-[var(--muted)]">{t.division?.name}</td>
                      <td className="px-5 py-3 text-[var(--muted)]">{t.city?.name}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => deleteTurf(t.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── COUPONS TAB ─── */}
      {activeTab === 'coupons' && (
        <div className="flex flex-col gap-5">
          {/* Add form */}
          <div className="glass-panel rounded-2xl p-5 border border-[var(--panel-border)]">
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--muted)] mb-4">
              Create WBT Coupon
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <input
                value={newCoupon.code}
                onChange={e => setNewCoupon(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="Coupon code (e.g. SAVE100)"
                className="bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white font-mono outline-none focus:border-accent/50 placeholder:text-[var(--muted)]"
              />
              <div className="relative">
                <select
                  value={newCoupon.discountType}
                  onChange={e => setNewCoupon(p => ({ ...p, discountType: e.target.value as any }))}
                  className="w-full appearance-none bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-accent/50 pr-8"
                >
                  <option value="flat">Flat (৳)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
              </div>
              <input
                type="number"
                value={newCoupon.discountValue || ''}
                onChange={e => setNewCoupon(p => ({ ...p, discountValue: parseFloat(e.target.value) || 0 }))}
                placeholder={newCoupon.discountType === 'flat' ? 'Discount amount (৳)' : 'Percentage (%)'}
                className="bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-accent/50 placeholder:text-[var(--muted)]"
              />
              <input
                type="number"
                value={newCoupon.maxUses || ''}
                onChange={e => setNewCoupon(p => ({ ...p, maxUses: parseInt(e.target.value) || 0 }))}
                placeholder="Max uses (0 = unlimited)"
                className="bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-accent/50 placeholder:text-[var(--muted)]"
              />
              <input
                type="date"
                value={newCoupon.expiresAt}
                onChange={e => setNewCoupon(p => ({ ...p, expiresAt: e.target.value }))}
                className="bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-accent/50"
              />
            </div>
            {couponMsg && (
              <p className={`text-xs font-bold mb-3 flex items-center gap-1.5 ${couponMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                {couponMsg.startsWith('✅') ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                {couponMsg}
              </p>
            )}
            <button
              onClick={addCoupon}
              disabled={couponSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/80 text-black font-black text-sm rounded-xl transition-all disabled:opacity-50"
            >
              {couponSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Coupon
            </button>
          </div>

          {/* Coupon list */}
          <div className="glass-panel rounded-2xl border border-[var(--panel-border)] overflow-hidden">
            {couponsLoading ? (
              <div className="py-16 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>
            ) : coupons.length === 0 ? (
              <div className="py-16 text-center text-[var(--muted)]">
                <Tag size={32} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold">No coupons yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--panel-border)] text-[var(--muted)] text-xs font-black uppercase tracking-widest">
                    <th className="px-5 py-3 text-left">Code</th>
                    <th className="px-5 py-3 text-left">Discount</th>
                    <th className="px-5 py-3 text-left">Uses</th>
                    <th className="px-5 py-3 text-left">Expires</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map(c => (
                    <tr key={c.id} className="border-b border-[var(--panel-border)]/50 hover:bg-[var(--panel-bg-hover)] transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-mono font-black text-accent tracking-widest">{c.code}</span>
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        {c.discountType === 'flat' ? `৳${c.discountValue}` : `${c.discountValue}%`}
                      </td>
                      <td className="px-5 py-3 text-[var(--muted)]">
                        {c.usedCount}/{c.maxUses === 0 ? '∞' : c.maxUses}
                      </td>
                      <td className="px-5 py-3 text-[var(--muted)]">
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => toggleCoupon(c.id, c.active)}>
                          {c.active
                            ? <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold"><ToggleRight size={16} /> Active</span>
                            : <span className="flex items-center gap-1.5 text-[var(--muted)] text-xs font-bold"><ToggleLeft size={16} /> Inactive</span>
                          }
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => deleteCoupon(c.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── SETTINGS TAB ─── */}
      {activeTab === 'settings' && (
        <div className="glass-panel rounded-2xl p-6 border border-[var(--panel-border)] max-w-md">
          <h3 className="text-sm font-black uppercase tracking-widest text-[var(--muted)] mb-1">
            Open WBT Match Fee
          </h3>
          <p className="text-xs text-[var(--muted)] mb-4">
            This is the total fee charged when teams use the Open WBT (Bring Your Own Turf) booking path.
            Each team pays half (50/50 split), minus any applicable coupon.
          </p>
          {settingsLoading ? (
            <div className="py-8 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>
          ) : (
            <>
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] font-bold text-sm">৳</span>
                <input
                  type="number"
                  value={matchFee}
                  onChange={e => setMatchFee(e.target.value)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--panel-border)] rounded-xl pl-8 pr-3 py-3 text-lg font-black text-white outline-none focus:border-accent/50"
                  placeholder="500"
                  min={0}
                />
              </div>
              <div className="text-xs text-[var(--muted)] mb-4 p-3 bg-accent/5 border border-accent/20 rounded-xl">
                Per team: <strong className="text-white">৳{matchFee ? (parseFloat(matchFee) / 2).toFixed(0) : 250}</strong> (50/50 split)
              </div>
              {settingsMsg && (
                <p className={`text-xs font-bold mb-3 flex items-center gap-1.5 ${settingsMsg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
                  {settingsMsg.startsWith('✅') ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {settingsMsg}
                </p>
              )}
              <button
                onClick={saveSettings}
                disabled={settingsSaving}
                className="w-full py-3 bg-accent hover:bg-accent/80 text-black font-black rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {settingsSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Save Match Fee
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
