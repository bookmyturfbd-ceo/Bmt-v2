'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Upload, Plus, MapPin, Check, Loader2 } from 'lucide-react';
import { useApiEntity } from '@/hooks/useApiEntity';
import { getCookie } from '@/lib/cookies';
import { uploadFileToCDN } from '@/lib/supabase';
import PremiumUploader from '../shared/PremiumUploader';

interface Division { id: string; name: string; }
interface City     { id: string; name: string; divisionId: string; }
interface Sport    { id: string; name: string; }
interface Amenity  { id: string; name: string; }
interface Props { open: boolean; onClose: () => void; turf?: any; }

const inputCls = 'w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50 placeholder:text-[var(--muted)] transition-colors color-inherit';



export default function EditTurfModal({ open, onClose, turf }: Props) {
  const divisions = useApiEntity<Division>('divisions');
  const cities    = useApiEntity<City>('cities');
  const amenities = useApiEntity<Amenity>('amenities');

  const [name,      setName]      = useState('');
  const [divId,     setDivId]     = useState('');
  const [cityId,    setCityId]    = useState('');
  const [area,      setArea]      = useState('');
  const [amenIds,   setAmenIds]   = useState<string[]>([]);
  const [mapLink, setMapLink] = useState('');
  const [lat, setLat] = useState('23.8103');
  const [lng, setLng] = useState('90.4125');
  const [logoUrl,   setLogoUrl]   = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open && turf) {
      setName(turf.name || '');
      setDivId(turf.divisionId || '');
      setCityId(turf.cityId || '');
      setArea(turf.area || '');
      setAmenIds(turf.amenityIds || []);
      setMapLink(turf.mapLink || '');
      setLat(turf.lat ? String(turf.lat) : '23.8103');
      setLng(turf.lng ? String(turf.lng) : '90.4125');
      setLogoUrl(turf.logoUrl || '');
      setImageUrls(turf.imageUrls || []);
      setLogoFile(null);
      setImageFiles([]);
      setSubmitted(false);
    }
  }, [open, turf]);

  const filteredCities = cities.items.filter(c => c.divisionId === divId);

  const toggle = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        const uploadedUrl = await uploadFileToCDN(logoFile, 'turfs');
        if (!uploadedUrl) {
          window.alert('UPLOAD FAILED: Check the browser console (F12) for the error message.');
          setSubmitting(false);
          return;
        }
        finalLogoUrl = uploadedUrl;
      }

      let finalImageUrls = imageUrls;
      if (imageFiles.length > 0) {
        const uploadedArr = await Promise.all(imageFiles.map(f => uploadFileToCDN(f, 'turfs')));
        if (uploadedArr.includes(null)) {
          window.alert('UPLOAD FAILED: Check the browser console (F12) for the error message.');
          setSubmitting(false);
          return;
        }
        finalImageUrls = uploadedArr as string[];
      }

      const finalBody = JSON.stringify({
        name, divisionId: divId, cityId, area, amenityIds: amenIds,
        logoUrl: finalLogoUrl, imageUrls: finalImageUrls, mapLink, 
        lat: parseFloat(lat) || 23.8103, lng: parseFloat(lng) || 90.4125,
      });

      console.log('Sending to DB:', finalBody);

      await fetch(`/api/bmt/turfs/${turf.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: finalBody,
      });

      setSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      alert("Upload failed. Validation or Config Error.");
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName(''); setDivId(''); setCityId(''); setArea(''); setAmenIds([]);
    setMapLink(''); setLogoUrl(''); setImageUrls([]); setLogoFile(null); setImageFiles([]); setSubmitted(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full sm:max-w-xl glass-panel border border-[var(--panel-border)] rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 overflow-hidden max-h-[95vh] flex flex-col">
        <div className="h-1 w-full bg-gradient-to-r from-accent/0 via-accent to-accent/0 shrink-0" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--panel-border)] shrink-0">
          <h2 className="text-lg font-black">Edit Turf Info</h2>
          <button onClick={handleClose} className="w-8 h-8 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-center hover:bg-[var(--panel-bg-hover)]">
            <X size={16} className="text-[var(--muted)]" />
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Check size={28} className="text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-black text-accent">Turf Updated!</h3>
              <p className="text-sm text-[var(--muted)] mt-1">
                <strong className="text-foreground">{name}</strong> has been successfully updated.
              </p>
            </div>
            <button onClick={handleClose} className="mt-2 px-6 py-3 rounded-xl bg-accent text-black font-black text-sm hover:brightness-110 transition-all">
              Back to My Turfs
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
            <Field label="Turf Name">
              <input required value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Central Futsal Park" className="input-field" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Division">
                <select required value={divId} onChange={e => { setDivId(e.target.value); setCityId(''); }}
                  className={inputCls}>
                  <option value="" className="text-black bg-white dark:bg-neutral-900 dark:text-white">Select…</option>
                  {divisions.items.map(d => <option key={d.id} value={d.id} className="text-black bg-white dark:bg-neutral-900 dark:text-white">{d.name}</option>)}
                </select>
              </Field>
              <Field label="City">
                <select required value={cityId} onChange={e => setCityId(e.target.value)}
                  disabled={!divId} className="input-field disabled:opacity-40">
                  <option value="" className="text-black bg-white dark:bg-neutral-900 dark:text-white">Select city…</option>
                  {filteredCities.map(c => <option key={c.id} value={c.id} className="text-black bg-white dark:bg-neutral-900 dark:text-white">{c.name}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Area / Neighbourhood">
              <input value={area} onChange={e => setArea(e.target.value)}
                placeholder="e.g. Section 6, Block D" className="input-field" />
            </Field>



            <Field label="Amenities">
              <div className="flex flex-wrap gap-2">
                {amenities.loading && <Loader2 size={14} className="animate-spin text-[var(--muted)]" />}
                {amenities.items.map(a => (
                  <button key={a.id} type="button" onClick={() => setAmenIds(prev => toggle(prev, a.id))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      amenIds.includes(a.id)
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                        : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground'
                    }`}>{a.name}</button>
                ))}
                {!amenities.loading && amenities.items.length === 0 && (
                  <p className="text-xs text-[var(--muted)]">No amenities configured by admin yet.</p>
                )}
              </div>
            </Field>
            <PremiumUploader 
              label="Turf Logo" 
              maxFiles={1} 
              initialUrls={logoUrl ? [logoUrl] : []}
              onRemoveInitialUrl={() => setLogoUrl('')}
              onFilesChange={(files) => setLogoFile(files[0] || null)}
            />

            <PremiumUploader 
              label="Turf Photos (up to 5)" 
              maxFiles={5}
              initialUrls={imageUrls}
              onRemoveInitialUrl={(url) => setImageUrls(prev => prev.filter(u => u !== url))}
              onFilesChange={(files) => setImageFiles(files)}
            />

            <Field label="Google Maps Link">
              <div className="relative">
                <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input value={mapLink} onChange={e => setMapLink(e.target.value)}
                  placeholder="https://maps.google.com/…" className="input-field pl-9" />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude (For Built-in Map)">
                <input required type="number" step="any" value={lat} onChange={e => setLat(e.target.value)}
                  placeholder="e.g. 23.8103" className="input-field" />
              </Field>
              <Field label="Longitude (For Built-in Map)">
                <input required type="number" step="any" value={lng} onChange={e => setLng(e.target.value)}
                  placeholder="e.g. 90.4125" className="input-field" />
              </Field>
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-accent text-black font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(0,255,0,0.15)] flex items-center justify-center gap-2 mt-2 disabled:opacity-60">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
              {submitting ? 'Uploading image & Saving…' : 'Save Changes'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}
