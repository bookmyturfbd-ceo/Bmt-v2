'use client';
import { useState, useEffect } from 'react';
import { X, Save, FileText } from 'lucide-react';

interface RulesEditorModalProps {
  open: boolean;
  onClose: () => void;
  turfId: string;
  initialRules: string;
}

export default function RulesEditorModal({ open, onClose, turfId, initialRules }: RulesEditorModalProps) {
  const [rulesText, setRulesText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRulesText(initialRules || '');
    }
  }, [open, initialRules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    await fetch(`/api/bmt/turfs/${turfId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: rulesText }),
    });

    setSubmitting(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-xl glass border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-[0_-20px_60px_rgba(0,0,0,0.6)] z-10 overflow-hidden flex flex-col">
        <div className="h-1 w-full bg-gradient-to-r from-accent/0 via-accent to-accent/0 shrink-0" />

        <div className="p-6 pb-4 flex items-center justify-between border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <FileText size={18} className="text-accent" /> Facility House Rules
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Players must agree to these rules before booking.</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X size={16} className="text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Custom Rules (Markdown Supported)</label>
            <textarea
              required
              rows={8}
              placeholder={'e.g.\n1. Non-marking shoes only.\n2. No smoking inside.\n3. Arrive 10 minutes early.'}
              value={rulesText}
              onChange={e => setRulesText(e.target.value)}
              className="w-full bg-neutral-950/80 border border-white/8 rounded-xl px-4 py-3 text-sm text-white font-medium outline-none focus:border-accent/50 transition-all placeholder:text-neutral-600 resize-none font-mono"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-3 rounded-xl border border-white/8 text-neutral-400 hover:text-white hover:border-white/20 font-bold text-sm transition-all">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-accent text-black font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(0,255,0,0.2)] flex items-center justify-center gap-2 disabled:opacity-50">
              <Save size={16} className="stroke-[3]" />
              {submitting ? 'Saving...' : 'Publish Rules'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
