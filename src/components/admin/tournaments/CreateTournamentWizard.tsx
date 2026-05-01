'use client';
import { useState, useEffect } from 'react';
import { ChevronRight, ArrowLeft, Loader2, Save } from 'lucide-react';

export default function CreateTournamentWizard({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [organizers, setOrganizers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    operatorType: 'PLATFORM',
    operatorId: 'super_admin',
    name: '',
    sport: 'FOOTBALL',
    formatType: 'KNOCKOUT',
    registrationType: 'TEAM',
    maxParticipants: 16,
    entryFee: 0,
    prizePoolTotal: 0,
    auctionEnabled: false
  });

  useEffect(() => {
    fetch('/api/organizers').then(res => res.json()).then(data => {
      if (data.success) setOrganizers(data.data);
    });
  }, []);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 border border-white/5 rounded-2xl p-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={step === 1 ? onCancel : () => setStep(step - 1)} className="p-2 bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h3 className="text-xl font-black uppercase tracking-wider">Create Tournament</h3>
          <p className="text-sm text-neutral-400 font-bold">Step {step} of 2</p>
        </div>
      </div>

      <div className="flex-1 max-w-2xl">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Operator</label>
              <select name="operatorType" value={formData.operatorType} onChange={handleChange} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold">
                <option value="PLATFORM">BMT Platform (Official)</option>
                <option value="ORGANIZER">External Organizer</option>
              </select>
            </div>

            {formData.operatorType === 'ORGANIZER' && (
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Select Organizer</label>
                <select name="operatorId" value={formData.operatorId} onChange={handleChange} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold">
                  <option value="">Select an organizer...</option>
                  {organizers.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Tournament Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Dhaka Winter Cup 2026" className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Sport</label>
                <select name="sport" value={formData.sport} onChange={handleChange} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold">
                  <option value="FOOTBALL">Football</option>
                  <option value="CRICKET">Cricket</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Format</label>
                <select name="formatType" value={formData.formatType} onChange={handleChange} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold">
                  <option value="KNOCKOUT">Single Elimination Knockout</option>
                  <option value="LEAGUE">Round Robin League</option>
                  <option value="GROUP_KNOCKOUT">Group Stage + Knockout</option>
                  <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                </select>
              </div>
            </div>

            <button onClick={() => setStep(2)} className="mt-8 bg-white text-black font-black uppercase tracking-wider px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-neutral-200 transition-colors">
              Next Step <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Registration Type</label>
                <select name="registrationType" value={formData.registrationType} onChange={handleChange} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold">
                  <option value="TEAM">Teams Register</option>
                  <option value="PLAYER">Individual Players (Auction)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Max Participants</label>
                <input type="number" name="maxParticipants" value={formData.maxParticipants} onChange={handleChange} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold" />
              </div>
            </div>

            {formData.registrationType === 'PLAYER' && (
              <label className="flex items-center gap-3 bg-neutral-900 p-4 rounded-xl border border-white/5 cursor-pointer">
                <input type="checkbox" name="auctionEnabled" checked={formData.auctionEnabled} onChange={handleChange} className="w-5 h-5 accent-accent" />
                <div>
                  <div className="font-black">Enable Player Auction</div>
                  <div className="text-xs text-neutral-400 mt-0.5">Captains will bid on players using virtual budget</div>
                </div>
              </label>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Entry Fee (App Coins)</label>
                <input type="number" name="entryFee" value={formData.entryFee} onChange={handleChange} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Prize Pool (App Coins)</label>
                <input type="number" name="prizePoolTotal" value={formData.prizePoolTotal} onChange={handleChange} className="w-full bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold" />
              </div>
            </div>

            <button disabled={loading} onClick={handleSubmit} className="mt-8 bg-accent text-black font-black uppercase tracking-wider px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-colors w-full sm:w-auto min-w-[200px]">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Create Tournament</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
