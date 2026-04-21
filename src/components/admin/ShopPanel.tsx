'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ImagePlus, Trash2, Loader2, Upload, CheckCircle2, X, Settings2, Gauge,
  ToggleLeft, ToggleRight, Plus, ChevronRight, ChevronDown, Tag, Package,
  ShoppingBag, FolderOpen, Eye, EyeOff, Search, Edit2, Save, ArrowLeft,
} from 'lucide-react';
import { uploadFileToCDN } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CarouselSlide { id: string; imageUrl: string; ctaText?: string | null; ctaLink?: string | null; order: number; active: boolean; }
interface CarouselSettings { autoSlide: boolean; intervalMs: number; slideType: string; }
interface Category { id: string; name: string; parentId: string | null; children?: Category[]; imageUrl?: string | null; sizeChartUrl?: string | null; }
interface SizeEntry { label: string; basePrice: string; salePrice: string; quantity: string; }
interface Product { id: string; name: string; status: string; mainImage: string; category: { name: string; parentId: string | null }; sizes: any[]; }

type SubTab = 'carousel' | 'categories' | 'products';

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const show = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  return { toast, show };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ShopPanel() {
  const [subTab, setSubTab] = useState<SubTab>('carousel');
  const { toast, show } = useToast();

  return (
    <div className="flex flex-col gap-0">
      {toast && (
        <div className="fixed top-6 right-6 z-[999] px-4 py-3 bg-accent text-black text-sm font-black rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      {/* Sub-tab bar */}
      <div className="flex gap-2 mb-8 p-1.5 bg-[var(--panel-bg)] rounded-2xl border border-[var(--panel-border)] w-fit">
        {([
          { key: 'carousel',   label: '🎠 Carousel',   },
          { key: 'categories', label: '🗂 Categories',  },
          { key: 'products',   label: '📦 Products',    },
        ] as { key: SubTab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
              subTab === t.key ? 'bg-accent text-black shadow-md' : 'text-[var(--muted)] hover:text-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'carousel'   && <ShopCarouselTab onToast={show} />}
      {subTab === 'categories' && <ShopCategoriesTab onToast={show} />}
      {subTab === 'products'   && <ShopProductsTab onToast={show} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CAROUSEL TAB
// ══════════════════════════════════════════════════════════════════════════════
function ShopCarouselTab({ onToast }: { onToast: (m: string) => void }) {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [settings, setSettings] = useState<CarouselSettings>({ autoSlide: true, intervalMs: 3500, slideType: 'auto' });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCtaText, setNewCtaText] = useState('');
  const [newCtaLink, setNewCtaLink] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await fetch('/api/shop/carousel').then(r => r.json());
    setSlides(d.slides ?? []);
    setSettings(d.settings ?? { autoSlide: true, intervalMs: 3500, slideType: 'auto' });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const url = await uploadFileToCDN(file, 'shop-carousel').catch(() => null);
      if (url) {
        await fetch('/api/shop/carousel', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: url, ctaText: newCtaText || null, ctaLink: newCtaLink || null, order: slides.length }),
        });
        onToast('Slide added!');
      }
    }
    setNewCtaText(''); setNewCtaLink('');
    await load(); setUploading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    await fetch('/api/shop/carousel', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'settings', ...settings }),
    });
    setSaving(false); onToast('Settings saved!');
  };

  const deleteSlide = async (id: string) => {
    if (!confirm('Delete slide?')) return;
    await fetch('/api/shop/carousel', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    onToast('Deleted'); await load();
  };

  const toggleSlide = async (s: CarouselSlide) => {
    await fetch('/api/shop/carousel', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, active: !s.active }) });
    await load();
  };

  const speedLabel = (ms: number) => ms <= 2000 ? 'Very Fast' : ms <= 3000 ? 'Fast' : ms <= 4000 ? 'Normal' : ms <= 6000 ? 'Slow' : 'Very Slow';

  return (
    <div className="flex flex-col gap-6">
      {/* Upload */}
      <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center"><ImagePlus size={18} className="text-accent" /></div>
          <div><h3 className="font-black text-base">Shop Carousel Slides</h3><p className="text-xs text-[var(--muted)]">Upload images for the shop page hero carousel</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input value={newCtaText} onChange={e => setNewCtaText(e.target.value)} placeholder="CTA Text (optional)" className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50" />
          <input value={newCtaLink} onChange={e => setNewCtaLink(e.target.value)} placeholder="CTA Link (optional)" className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50" />
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleUpload(e.target.files)} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="group w-full h-28 rounded-2xl border-2 border-dashed border-[var(--panel-border)] hover:border-accent/50 transition-all flex flex-col items-center justify-center gap-2 bg-[var(--panel-bg)] hover:bg-accent/3 disabled:opacity-50">
          {uploading ? <><Loader2 size={22} className="animate-spin text-accent" /><p className="text-sm font-bold text-accent">Uploading…</p></> : <><Upload size={22} className="text-[var(--muted)] group-hover:text-accent transition-colors" /><p className="text-sm font-bold text-[var(--muted)] group-hover:text-accent">Click to upload images</p></>}
        </button>
      </div>

      {/* Settings */}
      <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><Settings2 size={18} className="text-blue-400" /></div>
          <h3 className="font-black text-base">Carousel Settings</h3>
        </div>

        {/* Slide Type */}
        <div className="grid grid-cols-3 gap-2">
          {[{ v: 'auto', l: '🔄 Auto Slide' }, { v: 'thumb', l: '👆 Thumb Nav' }, { v: 'none', l: '🚫 No Slide' }].map(opt => (
            <button key={opt.v} onClick={() => setSettings(s => ({ ...s, slideType: opt.v }))}
              className={`py-2.5 rounded-xl text-xs font-black border transition-all ${settings.slideType === opt.v ? 'bg-accent/15 border-accent/40 text-accent' : 'border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground'}`}>
              {opt.l}
            </button>
          ))}
        </div>

        {settings.slideType === 'auto' && (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)]">
            <div><p className="text-sm font-bold">Auto-slide</p><p className="text-xs text-[var(--muted)]">Slides advance automatically</p></div>
            <button onClick={() => setSettings(s => ({ ...s, autoSlide: !s.autoSlide }))}>
              {settings.autoSlide ? <ToggleRight size={36} className="text-accent" /> : <ToggleLeft size={36} className="text-[var(--muted)]" />}
            </button>
          </div>
        )}

        {settings.autoSlide && settings.slideType === 'auto' && (
          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Gauge size={14} className="text-[var(--muted)]" /><p className="text-sm font-bold">Slide Speed</p></div>
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent">{speedLabel(settings.intervalMs)} · {(settings.intervalMs / 1000).toFixed(1)}s</span>
            </div>
            <input type="range" min={1500} max={8000} step={500} value={settings.intervalMs}
              onChange={e => setSettings(s => ({ ...s, intervalMs: +e.target.value }))} className="w-full accent-[#00ff41] h-2 rounded-full" />
          </div>
        )}

        <button onClick={saveSettings} disabled={saving} className="flex items-center justify-center gap-2 py-3 bg-accent text-black font-black rounded-xl hover:brightness-110 disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Save Settings
        </button>
      </div>

      {/* Slides list */}
      <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-base">Slides ({slides.length})</h3>
          <button onClick={load} className="text-xs text-[var(--muted)] hover:text-foreground font-bold">Refresh</button>
        </div>
        {loading ? <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-accent" /></div>
         : slides.length === 0 ? <p className="text-center text-sm text-[var(--muted)] py-10">No slides yet</p>
         : slides.map((s, i) => (
          <div key={s.id} className={`flex items-center gap-4 p-4 rounded-2xl bg-[var(--panel-bg)] border ${s.active ? 'border-[var(--panel-border)]' : 'border-[var(--panel-border)] opacity-50'}`}>
            <div className="w-24 h-16 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-[var(--panel-border)]">
              <img src={s.imageUrl} alt={`Slide ${i+1}`} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{s.ctaText || 'No CTA'}</p>
              <p className="text-xs text-[var(--muted)] truncate">{s.ctaLink || '—'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleSlide(s)} className="w-8 h-8 rounded-lg bg-[var(--background)] border border-[var(--panel-border)] flex items-center justify-center">
                {s.active ? <Eye size={14} className="text-accent" /> : <EyeOff size={14} className="text-[var(--muted)]" />}
              </button>
              <button onClick={() => deleteSlide(s.id)} className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20">
                <Trash2 size={14} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ══════════════════════════════════════════════════════════════════════════════
function ShopCategoriesTab({ onToast }: { onToast: (m: string) => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('');
  const [sizeChartUrl, setSizeChartUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const sfRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await fetch('/api/shop/categories').then(r => r.json());
    setCategories(Array.isArray(d) ? d : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const parentCats = categories.filter(c => !c.parentId);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const url = await uploadFileToCDN(file, 'shop-size-charts').catch(() => null);
    if(url) setSizeChartUrl(url);
    setUploading(false);
  };

  const create = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await fetch('/api/shop/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), parentId: newParent || null, sizeChartUrl: sizeChartUrl || null }),
    });
    setNewName(''); setNewParent(''); setSizeChartUrl('');
    await load(); setSaving(false); onToast('Category created!');
  };

  const del = async (id: string) => {
    if (!confirm('Delete this category? All products will be affected.')) return;
    await fetch('/api/shop/categories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    onToast('Deleted'); await load();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Create category */}
      <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center"><FolderOpen size={18} className="text-purple-400" /></div>
          <div><h3 className="font-black text-base">Create Category</h3><p className="text-xs text-[var(--muted)]">Add parent or sub-categories for your shop</p></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Category name (e.g. Jerseys)"
            className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50" />
          <select value={newParent} onChange={e => setNewParent(e.target.value)}
            className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50 text-[var(--muted)]">
            <option value="">— Parent Category</option>
            {parentCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="relative">
            <input ref={sfRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            <button onClick={() => sfRef.current?.click()} className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm flex items-center justify-between text-[var(--muted)] outline-none hover:border-accent/50 transition-colors">
              <span className="truncate">{sizeChartUrl ? '✅ Size Chart Attached' : 'Attach Size Chart (Opt)'}</span>
              {uploading ? <Loader2 size={16} className="animate-spin text-accent shrink-0" /> : <ImagePlus size={16} className="shrink-0" />}
            </button>
          </div>
        </div>
        <button onClick={create} disabled={saving || uploading || !newName.trim()}
          className="flex items-center justify-center gap-2 py-3 bg-accent text-black font-black rounded-xl hover:brightness-110 disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create Category
        </button>
      </div>

      {/* Category tree */}
      <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-3">
        <h3 className="font-black text-base">Category Tree</h3>
        {loading ? <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-accent" /></div>
         : parentCats.length === 0 ? <p className="text-center text-sm text-[var(--muted)] py-8">No categories yet</p>
         : parentCats.map(parent => (
          <div key={parent.id} className="border border-[var(--panel-border)] rounded-2xl overflow-hidden bg-[var(--panel-bg)]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--panel-border)]">
              <div className="flex items-center gap-2">
                <FolderOpen size={16} className="text-accent" />
                <span className="font-bold text-sm">{parent.name}</span>
                <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-black">PARENT</span>
              </div>
              <button onClick={() => del(parent.id)} className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20">
                <Trash2 size={12} className="text-red-400" />
              </button>
            </div>
            {(parent.children || []).length > 0 && (
              <div className="p-3 flex flex-col gap-2">
                {(parent.children || []).map(child => (
                  <div key={child.id} className="flex items-center justify-between px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--panel-border)]">
                    <div className="flex items-center gap-2">
                      <ChevronRight size={12} className="text-[var(--muted)]" />
                      <Tag size={13} className="text-purple-400" />
                      <span className="text-sm">{child.name}</span>
                    </div>
                    <button onClick={() => del(child.id)} className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20">
                      <Trash2 size={11} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS TAB
// ══════════════════════════════════════════════════════════════════════════════
function ShopProductsTab({ onToast }: { onToast: (m: string) => void }) {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [ps, cs] = await Promise.all([
      fetch('/api/shop/products').then(r => r.json()),
      fetch('/api/shop/categories').then(r => r.json()),
    ]);
    setProducts(Array.isArray(ps) ? ps : []);
    setCategories(Array.isArray(cs) ? cs : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await fetch('/api/shop/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    onToast('Product deleted'); await load();
  };

  if (view === 'create') {
    return (
      <ProductForm
        categories={categories}
        onSaved={() => { load(); setView('list'); onToast('Product saved!'); }}
        onCancel={() => setView('list')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black text-lg">Products ({products.length})</h3>
          <p className="text-sm text-[var(--muted)]">Manage your shop inventory</p>
        </div>
        <button onClick={() => setView('create')}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-black font-black rounded-xl hover:brightness-110 transition-all">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-accent" /></div>
       : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center glass-panel rounded-3xl border border-[var(--panel-border)]">
          <Package size={40} className="text-[var(--muted)] opacity-30" />
          <p className="font-bold text-[var(--muted)]">No products yet</p>
          <button onClick={() => setView('create')} className="text-accent hover:underline text-sm font-black">Add your first product →</button>
        </div>
       ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(
            products.reduce((acc, p) => {
              const cName = p.category?.name || 'Uncategorized';
              if (!acc[cName]) acc[cName] = [];
              acc[cName].push(p);
              return acc;
            }, {} as Record<string, Product[]>)
          ).map(([catName, prods]) => (
            <div key={catName} className="flex flex-col gap-4">
              <h4 className="font-black text-sm text-[var(--muted)] uppercase tracking-wider px-1">{catName} ({prods.length})</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {prods.map(p => (
                  <div key={p.id} className="glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden flex flex-col group">
                    <div className="aspect-[4/5] bg-neutral-900 overflow-hidden relative">
                      <img src={p.mainImage} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <span className={`absolute top-2 left-2 text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow border ${p.status === 'active' ? 'bg-[#00ff41]/90 text-black border-[#00ff41]' : 'bg-neutral-800 text-[var(--muted)] border-white/10'}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="p-3 flex flex-col gap-1.5 flex-1">
                      <p className="font-bold text-xs leading-tight line-clamp-2" title={p.name}>{p.name}</p>
                      <div className="mt-auto pt-1 flex items-end justify-between">
                        {p.sizes?.length > 0 ? (
                          <p className="text-[11px] font-black text-accent">
                            ৳{Math.min(...p.sizes.map((s: any) => s.salePrice ?? s.basePrice)).toLocaleString()}
                          </p>
                        ) : <p className="text-[10px] text-[var(--muted)]">No sizes</p>}
                        <button onClick={() => del(p.id)} className="w-6 h-6 flex items-center justify-center rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
       )}
    </div>
  );
}

// ── Product Form ───────────────────────────────────────────────────────────────
function ProductForm({ categories, onSaved, onCancel }: { categories: Category[]; onSaved: () => void; onCancel: () => void; }) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [productCost, setProductCost] = useState('');
  const [marketingCost, setMarketingCost] = useState('');
  const [status, setStatus] = useState('active');
  const [mainImage, setMainImage] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [sizes, setSizes] = useState<SizeEntry[]>([]);
  const [sizeInput, setSizeInput] = useState('');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mainImgRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const allLeafCats = categories.filter(c => !c.children?.length);

  const addSize = () => {
    const label = sizeInput.trim().toUpperCase();
    if (!label || sizes.some(s => s.label === label)) return;
    setSizes(prev => [...prev, { label, basePrice: '', salePrice: '', quantity: '' }]);
    setSizeInput('');
    setSelectedSize(sizes.length);
  };

  const removeSize = (i: number) => {
    setSizes(prev => prev.filter((_, idx) => idx !== i));
    setSelectedSize(null);
  };

  const updateSize = (i: number, field: keyof SizeEntry, val: string) => {
    setSizes(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  const uploadMain = async (file: File) => {
    setUploading(true);
    const url = await uploadFileToCDN(file, 'shop-products').catch(() => null);
    if (url) setMainImage(url);
    setUploading(false);
  };

  const uploadGallery = async (files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      const url = await uploadFileToCDN(file, 'shop-products').catch(() => null);
      if (url) setGalleryImages(prev => [...prev, url]);
    }
    setUploading(false);
  };

  const save = async () => {
    if (!name.trim() || !categoryId || !mainImage || sizes.length === 0) {
      alert('Please fill in name, category, main image, and at least one size.');
      return;
    }
    setSaving(true);
    await fetch('/api/shop/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(), categoryId, mainImage, galleryImages,
        description, seoTitle, seoDescription,
        productCost: Number(productCost || 0), marketingCost: Number(marketingCost || 0),
        status,
        sizes: sizes.map(s => ({
          label: s.label, basePrice: Number(s.basePrice || 0),
          salePrice: s.salePrice ? Number(s.salePrice) : null,
          quantity: Number(s.quantity || 0),
        })),
      }),
    });
    setSaving(false); onSaved();
  };

  return (
    <div className="flex flex-col gap-6">
      <button onClick={onCancel} className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-foreground font-bold w-fit">
        <ArrowLeft size={16} /> Back to Products
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Basic Info */}
          <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-4">
            <h3 className="font-black text-base flex items-center gap-2"><Package size={16} className="text-accent" /> Product Info</h3>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Product name *"
              className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50" />
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50 text-[var(--muted)]">
              <option value="">— Select Sub-Category *</option>
              {allLeafCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Product description…"
              rows={4} className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/50 resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <label className={`py-2 px-4 rounded-xl border cursor-pointer text-xs font-black text-center ${status === 'active' ? 'bg-accent/15 border-accent/40 text-accent' : 'border-[var(--panel-border)] text-[var(--muted)]'}`} onClick={() => setStatus('active')}>✅ Active</label>
              <label className={`py-2 px-4 rounded-xl border cursor-pointer text-xs font-black text-center ${status === 'draft' ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400' : 'border-[var(--panel-border)] text-[var(--muted)]'}`} onClick={() => setStatus('draft')}>📝 Draft</label>
            </div>
          </div>

          {/* Images */}
          <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-4">
            <h3 className="font-black text-base flex items-center gap-2"><ImagePlus size={16} className="text-accent" /> Images</h3>
            <input ref={mainImgRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadMain(e.target.files[0])} />
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && uploadGallery(e.target.files)} />

            <button onClick={() => mainImgRef.current?.click()} disabled={uploading}
              className="relative group w-full h-36 rounded-2xl border-2 border-dashed border-[var(--panel-border)] hover:border-accent/50 overflow-hidden transition-all">
              {mainImage ? <img src={mainImage} className="w-full h-full object-cover" /> : (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Upload size={20} className="text-[var(--muted)] group-hover:text-accent transition-colors" />
                  <p className="text-xs font-bold text-[var(--muted)] group-hover:text-accent">Main Product Image *</p>
                </div>
              )}
              {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>}
            </button>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Gallery ({galleryImages.length})</p>
              <div className="flex gap-2 flex-wrap">
                {galleryImages.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[var(--panel-border)] group">
                    <img src={img} className="w-full h-full object-cover" />
                    <button onClick={() => setGalleryImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ))}
                <button onClick={() => galleryRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-[var(--panel-border)] hover:border-accent/50 flex items-center justify-center transition-colors">
                  <Plus size={16} className="text-[var(--muted)]" />
                </button>
              </div>
            </div>
          </div>

          {/* Admin costs*/}
          <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-4">
            <h3 className="font-black text-base flex items-center gap-2">
              🔒 Internal Costs <span className="text-[10px] text-[var(--muted)] bg-neutral-800 px-2 py-0.5 rounded font-normal">Admin-only, hidden from shop</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)]">Product Cost (৳)</label>
                <input type="number" value={productCost} onChange={e => setProductCost(e.target.value)} placeholder="0"
                  className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)]">Marketing Cost (৳)</label>
                <input type="number" value={marketingCost} onChange={e => setMarketingCost(e.target.value)} placeholder="0"
                  className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50" />
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-4">
            <h3 className="font-black text-base flex items-center gap-2"><Search size={16} className="text-blue-400" /> SEO</h3>
            <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="SEO Title"
              className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50" />
            <textarea value={seoDescription} onChange={e => setSeoDescription(e.target.value)} placeholder="SEO Meta Description…"
              rows={3} className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50 resize-none" />
          </div>
        </div>

        {/* Right column — Sizes */}
        <div className="glass-panel rounded-3xl border border-[var(--panel-border)] p-6 flex flex-col gap-5 h-fit sticky top-6">
          <h3 className="font-black text-base flex items-center gap-2"><Tag size={16} className="text-purple-400" /> Size Variants *</h3>

          {/* Size input */}
          <div className="flex gap-2">
            <input
              value={sizeInput}
              onChange={e => setSizeInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }}
              placeholder="Type size (e.g. M) + Enter"
              className="flex-1 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50"
            />
            <button onClick={addSize} className="px-4 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-400 font-black text-xs rounded-xl hover:bg-purple-500/30 transition-colors whitespace-nowrap">
              + Add
            </button>
          </div>

          {/* Size chips */}
          {sizes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sizes.map((s, i) => (
                <button key={i} onClick={() => setSelectedSize(i === selectedSize ? null : i)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                    selectedSize === i ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground'
                  }`}>
                  {s.label}
                  {s.basePrice && <span className="ml-1 text-accent">৳{s.salePrice || s.basePrice}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Selected size pricing */}
          {selectedSize !== null && sizes[selectedSize] && (
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[var(--panel-bg)] border border-purple-500/20">
              <div className="flex items-center justify-between">
                <p className="font-black text-sm">Size: <span className="text-purple-400">{sizes[selectedSize].label}</span></p>
                <button onClick={() => removeSize(selectedSize)} className="text-red-400 text-xs font-black hover:underline">Remove</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Base Price *</label>
                  <input type="number" value={sizes[selectedSize].basePrice}
                    onChange={e => updateSize(selectedSize, 'basePrice', e.target.value)} placeholder="৳0"
                    className="bg-[var(--background)] border border-[var(--panel-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Sale Price</label>
                  <input type="number" value={sizes[selectedSize].salePrice}
                    onChange={e => updateSize(selectedSize, 'salePrice', e.target.value)} placeholder="৳0"
                    className="bg-[var(--background)] border border-[var(--panel-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Stock Qty</label>
                  <input type="number" value={sizes[selectedSize].quantity}
                    onChange={e => updateSize(selectedSize, 'quantity', e.target.value)} placeholder="0"
                    className="bg-[var(--background)] border border-[var(--panel-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50" />
                </div>
              </div>
            </div>
          )}

          {sizes.length === 0 && (
            <p className="text-xs text-[var(--muted)] italic text-center py-4">Type a size label and press Enter to add variants (e.g. S, M, L, XL or 38, 40, 42)</p>
          )}

          {/* Save */}
          <button onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-4 bg-accent text-black font-black rounded-2xl hover:brightness-110 disabled:opacity-50 text-base mt-4">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving…' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
