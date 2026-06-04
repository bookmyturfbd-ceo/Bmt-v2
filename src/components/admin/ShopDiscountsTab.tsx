'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Tag, Trash2, Edit2, Plus, X, Loader2, CheckCircle2,
  ToggleLeft, ToggleRight, PlusCircle, MinusCircle, Info
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
}

interface DiscountTier {
  minQty: number;
  discountType: 'fixed' | 'flat' | 'percent';
  discountValue: number;
  freeDelivery: boolean;
}

interface ShopDiscount {
  id: string;
  name: string;
  active: boolean;
  categoryScope: 'ALL' | 'PARENT' | 'SUB';
  targetCategoryIds: string[];
  tiers: DiscountTier[];
  freeDeliveryThreshold: number | null;
  createdAt: string;
}

export default function ShopDiscountsTab({ onToast }: { onToast: (m: string) => void }) {
  const [discounts, setDiscounts] = useState<ShopDiscount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<ShopDiscount | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [active, setActive] = useState(true);
  const [categoryScope, setCategoryScope] = useState<'ALL' | 'PARENT' | 'SUB'>('ALL');
  const [targetCategoryIds, setTargetCategoryIds] = useState<string[]>([]);
  const [tiers, setTiers] = useState<DiscountTier[]>([]);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [discRes, catRes] = await Promise.all([
        fetch('/api/shop/discounts').then(r => r.json()),
        fetch('/api/shop/categories').then(r => r.json())
      ]);
      setDiscounts(Array.isArray(discRes) ? discRes : []);
      setCategories(Array.isArray(catRes) ? catRes : []);
    } catch (err) {
      console.error('Error loading discounts data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingDiscount(null);
    setName('');
    setActive(true);
    setCategoryScope('ALL');
    setTargetCategoryIds([]);
    setTiers([{ minQty: 1, discountType: 'flat', discountValue: 0, freeDelivery: false }]);
    setFreeDeliveryThreshold('');
    setShowModal(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (d: ShopDiscount) => {
    setEditingDiscount(d);
    setName(d.name);
    setActive(d.active);
    setCategoryScope(d.categoryScope);
    setTargetCategoryIds(d.targetCategoryIds);
    
    let parsedTiers: DiscountTier[] = [];
    try {
      if (typeof d.tiers === 'string') {
        parsedTiers = JSON.parse(d.tiers);
      } else if (Array.isArray(d.tiers)) {
        parsedTiers = d.tiers;
      }
    } catch (e) {
      parsedTiers = [];
    }

    setTiers(parsedTiers.length > 0 ? parsedTiers : [{ minQty: 1, discountType: 'flat', discountValue: 0, freeDelivery: false }]);
    setFreeDeliveryThreshold(d.freeDeliveryThreshold !== null ? d.freeDeliveryThreshold.toString() : '');
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDiscount(null);
  };

  // Add a new tier row
  const addTier = () => {
    setTiers([...tiers, { minQty: tiers.length + 1, discountType: 'flat', discountValue: 0, freeDelivery: false }]);
  };

  // Remove a tier row
  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, idx) => idx !== index));
  };

  // Update a tier field
  const updateTier = (index: number, field: keyof DiscountTier, value: any) => {
    setTiers(tiers.map((t, idx) => idx === index ? { ...t, [field]: value } : t));
  };

  // Toggle Category selection
  const handleToggleCategory = (id: string) => {
    if (categoryScope === 'PARENT') {
      // For parent category, it is a single selection
      setTargetCategoryIds([id]);
    } else {
      // For subcategory, it is multiple selection
      if (targetCategoryIds.includes(id)) {
        setTargetCategoryIds(targetCategoryIds.filter(cid => cid !== id));
      } else {
        setTargetCategoryIds([...targetCategoryIds, id]);
      }
    }
  };

  // Toggle active status from list directly
  const handleToggleActive = async (d: ShopDiscount) => {
    try {
      const res = await fetch('/api/shop/discounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id, active: !d.active })
      });
      if (res.ok) {
        onToast(`Campaign ${!d.active ? 'Activated' : 'Paused'}`);
        await loadData();
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      alert('An error occurred');
    }
  };

  // Delete Campaign
  const handleDeleteDiscount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount campaign?')) return;
    try {
      const res = await fetch(`/api/shop/discounts?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onToast('Campaign deleted successfully');
        await loadData();
      } else {
        alert('Failed to delete discount');
      }
    } catch (err) {
      alert('An error occurred');
    }
  };

  // Save Campaign (Create or Edit)
  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Validate Categories if scope is not ALL
    if (categoryScope !== 'ALL' && targetCategoryIds.length === 0) {
      alert('Please select at least one category.');
      return;
    }

    setSaving(true);
    const method = editingDiscount ? 'PATCH' : 'POST';
    const body = {
      ...(editingDiscount && { id: editingDiscount.id }),
      name: name.trim(),
      active,
      categoryScope,
      targetCategoryIds,
      tiers: tiers.map(t => ({
        minQty: Number(t.minQty),
        discountType: t.discountType,
        discountValue: Number(t.discountValue),
        freeDelivery: t.freeDelivery
      })),
      freeDeliveryThreshold: freeDeliveryThreshold.trim() !== '' ? Number(freeDeliveryThreshold) : null
    };

    try {
      const res = await fetch('/api/shop/discounts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to save discount campaign');
      } else {
        onToast(editingDiscount ? 'Campaign updated' : 'Campaign created');
        handleCloseModal();
        await loadData();
      }
    } catch (err) {
      alert('An error occurred while saving the campaign.');
    } finally {
      setSaving(false);
    }
  };

  const parentCats = categories.filter(c => !c.parentId);
  const subCats = categories.filter(c => c.parentId !== null);

  const getScopeDetails = (d: ShopDiscount) => {
    if (d.categoryScope === 'ALL') return 'All Products';
    if (d.categoryScope === 'PARENT') {
      const cat = categories.find(c => c.id === d.targetCategoryIds[0]);
      return `Parent Cat: ${cat ? cat.name : 'Unknown'}`;
    }
    if (d.categoryScope === 'SUB') {
      const matchedNames = d.targetCategoryIds
        .map(id => categories.find(c => c.id === id)?.name)
        .filter(Boolean);
      return `Subs: ${matchedNames.join(', ') || 'None'}`;
    }
    return '';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-lg">Shop Discounts ({discounts.length})</h3>
          <p className="text-sm text-[var(--muted)]">Manage tiered quantity pricing, category-specific sales, and general free delivery rules.</p>
        </div>
        <button onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-black font-black rounded-xl hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,255,65,0.15)]">
          <Plus size={16} /> Create Discount
        </button>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-accent" /></div>
      ) : discounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center glass-panel rounded-3xl border border-[var(--panel-border)]">
          <Tag size={40} className="text-[var(--muted)] opacity-30 animate-pulse" />
          <p className="font-bold text-[var(--muted)]">No active or draft discount campaigns yet.</p>
          <button onClick={handleOpenCreate} className="text-accent hover:underline text-sm font-black">Create your first campaign →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {discounts.map(d => {
            let parsedTiers: DiscountTier[] = [];
            try {
              if (typeof d.tiers === 'string') {
                parsedTiers = JSON.parse(d.tiers);
              } else if (Array.isArray(d.tiers)) {
                parsedTiers = d.tiers;
              }
            } catch (e) {}

            return (
              <div key={d.id} className={`glass-panel border border-[var(--panel-border)] rounded-3xl p-6 flex flex-col justify-between transition-all hover:border-white/10 ${d.active ? '' : 'opacity-60'}`}>
                <div>
                  {/* Campaign Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black text-base text-white">{d.name}</h4>
                      <span className="text-[10px] mt-1 inline-block font-black uppercase bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                        {getScopeDetails(d)}
                      </span>
                    </div>
                    <button onClick={() => handleToggleActive(d)} title={d.active ? 'Pause Campaign' : 'Activate Campaign'}>
                      {d.active ? <ToggleRight size={36} className="text-accent cursor-pointer" /> : <ToggleLeft size={36} className="text-[var(--muted)] cursor-pointer" />}
                    </button>
                  </div>

                  {/* Tier lists */}
                  {parsedTiers.length > 0 && (
                    <div className="mt-4 flex flex-col gap-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Pricing Tiers:</p>
                      <div className="flex flex-col gap-1">
                        {parsedTiers.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-3 bg-black/35 rounded-xl border border-white/5">
                            <span className="font-bold text-white">{t.minQty}+ pcs:</span>
                            <span className="font-black text-accent">
                              {t.discountType === 'fixed' && `৳${t.discountValue.toLocaleString()}`}
                              {t.discountType === 'flat' && `-৳${t.discountValue.toLocaleString()}`}
                              {t.discountType === 'percent' && `-${t.discountValue}%`}
                              {t.freeDelivery && <span className="ml-1.5 text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-black">Free Shipping</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Shipping Info */}
                  {d.freeDeliveryThreshold !== null && (
                    <div className="mt-3 flex items-center justify-between text-xs py-1.5 px-3 bg-blue-500/5 rounded-xl border border-blue-500/10 text-blue-400">
                      <span className="font-bold flex items-center gap-1"><Info size={12} /> Free Shipping:</span>
                      <span className="font-black">৳{d.freeDeliveryThreshold.toLocaleString()}+ orders</span>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="mt-6 pt-4 border-t border-[var(--panel-border)] flex justify-end gap-2">
                  <button onClick={() => handleOpenEdit(d)}
                    className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent/20 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDeleteDiscount(d.id)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleSaveDiscount} className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/20">
              <h3 className="font-black text-base flex items-center gap-2">
                <Tag size={18} className="text-accent" /> {editingDiscount ? 'Edit Discount Campaign' : 'Create Discount Campaign'}
              </h3>
              <button type="button" onClick={handleCloseModal} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-5 hide-scrollbar">
              {/* Campaign Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)]">Campaign Name *</label>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jersey Bulk Sale"
                  className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50 text-white" />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)]">
                <div>
                  <p className="text-sm font-bold">Campaign Status</p>
                  <p className="text-xs text-[var(--muted)]">Set this campaign active immediately</p>
                </div>
                <button type="button" onClick={() => setActive(!active)}>
                  {active ? <ToggleRight size={36} className="text-accent" /> : <ToggleLeft size={36} className="text-[var(--muted)]" />}
                </button>
              </div>

              {/* Scope Options */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)]">Category Scope *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ALL', 'PARENT', 'SUB'] as const).map(scope => (
                    <button key={scope} type="button" onClick={() => { setCategoryScope(scope); setTargetCategoryIds([]); }}
                      className={`py-2.5 rounded-xl text-xs font-black border transition-all ${categoryScope === scope ? 'bg-accent/15 border-accent/40 text-accent' : 'border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground'}`}>
                      {scope === 'ALL' && 'All Products'}
                      {scope === 'PARENT' && 'Parent Category'}
                      {scope === 'SUB' && 'Sub-Categories'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parent Category Scope Selection */}
              {categoryScope === 'PARENT' && (
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] animate-in slide-in-from-top-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)] mb-2">Select Parent Category *</label>
                  <div className="flex flex-wrap gap-2">
                    {parentCats.map(cat => {
                      const isSelected = targetCategoryIds.includes(cat.id);
                      return (
                        <button key={cat.id} type="button" onClick={() => handleToggleCategory(cat.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${isSelected ? 'bg-accent text-black border-accent' : 'bg-black/20 border-white/5 text-[var(--muted)] hover:border-white/20'}`}>
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-Category Scope Selection */}
              {categoryScope === 'SUB' && (
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] animate-in slide-in-from-top-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)] mb-2">Select Sub-Categories *</label>
                  <div className="flex flex-col gap-4 max-h-48 overflow-y-auto pr-2 hide-scrollbar">
                    {parentCats.map(parent => {
                      const children = subCats.filter(c => c.parentId === parent.id);
                      if (children.length === 0) return null;
                      return (
                        <div key={parent.id} className="flex flex-col gap-2 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-accent/80">{parent.name}</p>
                          <div className="flex flex-wrap gap-2">
                            {children.map(child => {
                              const isSelected = targetCategoryIds.includes(child.id);
                              return (
                                <button key={child.id} type="button" onClick={() => handleToggleCategory(child.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isSelected ? 'bg-accent text-black border-accent' : 'bg-black/20 border-white/5 text-[var(--muted)] hover:border-white/20'}`}>
                                  {child.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Tiers */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)]">Bulk Quantity Pricing Tiers</label>
                  <button type="button" onClick={addTier} className="text-xs font-black text-accent hover:underline flex items-center gap-1">
                    <PlusCircle size={14} /> Add Tier
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {tiers.map((t, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] items-center animate-in slide-in-from-top-1">
                      {/* Min Qty */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-[var(--muted)] uppercase">Min Qty</span>
                        <input type="number" min={1} required value={t.minQty} onChange={e => updateTier(idx, 'minQty', e.target.value)}
                          className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent/40 text-white" />
                      </div>

                      {/* Discount Type */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-[var(--muted)] uppercase">Type</span>
                        <select value={t.discountType} onChange={e => updateTier(idx, 'discountType', e.target.value)}
                          className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-accent/40 text-white">
                          <option value="fixed">Fixed Price</option>
                          <option value="flat">Flat Off</option>
                          <option value="percent">Percentage Off</option>
                        </select>
                      </div>

                      {/* Discount Value */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-[var(--muted)] uppercase">Value</span>
                        <input type="number" min={0} required value={t.discountValue} onChange={e => updateTier(idx, 'discountValue', e.target.value)}
                          className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-accent/40 text-white" />
                      </div>

                      {/* Free shipping toggle & delete button */}
                      <div className="flex items-center justify-between gap-2 pt-4 sm:pt-0">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                          <input type="checkbox" checked={t.freeDelivery} onChange={e => updateTier(idx, 'freeDelivery', e.target.checked)}
                            className="rounded border-white/20 text-accent bg-black focus:ring-accent" />
                          <span className="text-[10px] font-black uppercase text-[var(--muted)]">Free Shipping</span>
                        </label>
                        <button type="button" onClick={() => removeTier(idx)} className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-md">
                          <MinusCircle size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {tiers.length === 0 && (
                    <p className="text-xs text-center text-[var(--muted)] py-4 bg-black/10 border border-dashed border-[var(--panel-border)] rounded-2xl">No quantity tiers added. Discount won't apply to unit prices.</p>
                  )}
                </div>
              </div>

              {/* Free Delivery Threshold */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)]">General Free Shipping Threshold (Optional)</label>
                <div className="relative">
                  <input type="number" min={1} value={freeDeliveryThreshold} onChange={e => setFreeDeliveryThreshold(e.target.value)} placeholder="e.g. 3000 (Free delivery on orders 3000+)"
                    className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl pl-4 pr-12 py-2.5 text-sm outline-none focus:border-accent/50 text-white" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--muted)]">BDT</span>
                </div>
                <p className="text-[10px] text-[var(--muted)] italic">Grants free shipping if the order subtotal reaches this amount (regardless of products purchased).</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-white/10 bg-black/20 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={handleCloseModal}
                className="px-5 py-2.5 bg-white/5 text-[var(--muted)] font-black text-sm rounded-xl hover:bg-white/10 hover:text-white transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-6 py-2.5 bg-accent text-black font-black text-sm rounded-xl hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-1.5">
                {saving && <Loader2 size={14} className="animate-spin" />} Save Campaign
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
