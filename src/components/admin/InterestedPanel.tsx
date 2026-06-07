'use client';
import { useState, useEffect } from 'react';
import {
  Loader2, Building2, Briefcase, GraduationCap, Phone,
  Mail, MapPin, MessageSquare, Clock, CheckCircle2, PhoneCall, RefreshCw,
  UserCheck, XCircle
} from 'lucide-react';

type JoinRequestType = 'TURF_OWNER' | 'PROFESSIONAL' | 'COACH';
type JoinRequestStatus = 'PENDING' | 'REVIEWED' | 'CONTACTED' | 'ONBOARDED' | 'DECLINED';

interface JoinRequest {
  id: string;
  type: JoinRequestType;
  name: string;
  phone: string;
  email: string | null;
  location: string;
  message: string | null;
  status: JoinRequestStatus;
  adminNotes: string | null;
  createdAt: string;
}

const TYPE_TABS: { key: JoinRequestType; label: string; icon: typeof Building2; color: string; bg: string }[] = [
  { key: 'TURF_OWNER',   label: 'Turf Owners',           icon: Building2,      color: 'text-emerald-400',  bg: 'bg-emerald-500/20 border-emerald-500/30' },
  { key: 'PROFESSIONAL', label: 'Tournament Organizers',  icon: Briefcase,      color: 'text-blue-400',     bg: 'bg-blue-500/20 border-blue-500/30' },
  { key: 'COACH',        label: 'Coaches / Refs / Trainers', icon: GraduationCap, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/20 border-fuchsia-500/30' },
];

const STATUS_OPTIONS: { value: JoinRequestStatus; label: string; icon: any; color: string }[] = [
  { value: 'PENDING',   label: 'Pending',   icon: Clock,         color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
  { value: 'REVIEWED',  label: 'Reviewed',  icon: CheckCircle2,  color: 'text-blue-400 bg-blue-500/15 border-blue-500/30' },
  { value: 'CONTACTED', label: 'Contacted', icon: PhoneCall,     color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
  { value: 'ONBOARDED', label: 'Onboarded', icon: UserCheck,     color: 'text-green-400 bg-green-500/15 border-green-500/30' },
  { value: 'DECLINED',  label: 'Declined',  icon: XCircle,       color: 'text-red-400 bg-red-500/15 border-red-500/30' },
];

function StatusBadge({ status }: { status: JoinRequestStatus }) {
  const s = STATUS_OPTIONS.find(o => o.value === status)!;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${s.color}`}>
      <Icon size={9} /> {s.label}
    </span>
  );
}

export default function InterestedPanel() {
  const [activeTab, setActiveTab] = useState<JoinRequestType>('TURF_OWNER');
  const [data, setData] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  const [notesState, setNotesState] = useState<Record<string, string>>({});
  const [updatingNotesId, setUpdatingNotesId] = useState<string | null>(null);

  const reload = (tab: JoinRequestType = activeTab) => {
    setLoading(true);
    fetch(`/api/admin/join-requests?type=${tab}`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { reload(activeTab); }, [activeTab]);

  const handleStatusChange = async (id: string, status: JoinRequestStatus) => {
    setUpdatingId(id);
    await fetch('/api/admin/join-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setUpdatingId(null);
    reload();
  };

  const handleNotesSave = async (id: string, adminNotes: string) => {
    setUpdatingNotesId(id);
    try {
      await fetch('/api/admin/join-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, adminNotes }),
      });
      setNotesState(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      reload();
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setUpdatingNotesId(null);
    }
  };

  const activeTabInfo = TYPE_TABS.find(t => t.key === activeTab)!;
  const pendingCount = data.filter(r => r.status === 'PENDING').length;

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl md:text-3xl font-black flex items-center gap-2">
            <PhoneCall className="text-emerald-400" /> Interested Parties
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1">
            People who submitted interest forms from the homepage. Review and reach out to qualified leads.
          </p>
        </div>
        <button
          onClick={() => reload()}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-white/10 rounded-xl text-sm font-bold hover:bg-neutral-800 transition-all"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                isActive
                  ? `${tab.bg} ${tab.color} border-current`
                  : 'bg-neutral-900 border-white/10 text-[var(--muted)] hover:text-white hover:border-white/20'
              }`}
            >
              <Icon size={15} />
              {tab.label}
              {isActive && pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[9px] font-black">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-3xl p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 opacity-40">
            <Loader2 size={28} className="animate-spin text-accent" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${activeTabInfo.bg}`}>
              <activeTabInfo.icon size={24} className={activeTabInfo.color} />
            </div>
            <p className="font-black text-white">No requests yet</p>
            <p className="text-sm text-[var(--muted)]">When someone submits the "{activeTabInfo.label}" form on the homepage, it will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {data.map(req => (
              <div
                key={req.id}
                className={`bg-neutral-900 border rounded-2xl p-5 flex flex-col md:flex-row gap-4 transition-all ${
                  req.status === 'PENDING' ? 'border-amber-500/20' : 'border-white/5'
                }`}
              >
                {/* Left Info */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${activeTabInfo.bg}`}>
                      <activeTabInfo.icon size={18} className={activeTabInfo.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-base leading-tight">{req.name}</p>
                      <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <Phone size={13} className="text-emerald-400 shrink-0" />
                      <a href={`tel:${req.phone}`} className="hover:text-white transition-colors font-bold">{req.phone}</a>
                    </div>
                    {req.email && (
                      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                        <Mail size={13} className="text-blue-400 shrink-0" />
                        <a href={`mailto:${req.email}`} className="hover:text-white transition-colors font-bold truncate">{req.email}</a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <MapPin size={13} className="text-fuchsia-400 shrink-0" />
                      <span className="truncate font-bold">{req.location}</span>
                    </div>
                  </div>

                  {req.message && (
                    <div className="flex items-start gap-2 text-sm text-[var(--muted)] bg-white/[0.03] border border-white/5 rounded-xl p-3">
                      <MessageSquare size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                      <p className="italic">{req.message}</p>
                    </div>
                  )}

                  {/* Admin Notes Section */}
                  <div className="mt-2 flex flex-col gap-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Admin Notes</p>
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={notesState[req.id] !== undefined ? notesState[req.id] : (req.adminNotes || '')}
                        onChange={(e) => setNotesState(prev => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="Add note from our end..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent text-white resize-none"
                        rows={2}
                      />
                      {(notesState[req.id] !== undefined && notesState[req.id] !== (req.adminNotes || '')) && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleNotesSave(req.id, notesState[req.id])}
                            disabled={updatingNotesId === req.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-black text-xs font-black rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
                          >
                            {updatingNotesId === req.id ? <Loader2 size={10} className="animate-spin" /> : null}
                            Save Note
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex md:flex-col gap-2 shrink-0">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      disabled={req.status === opt.value || updatingId === req.id}
                      onClick={() => handleStatusChange(req.id, opt.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-default ${
                        req.status === opt.value
                          ? `${opt.color} border-current`
                          : 'bg-neutral-800 border-white/10 text-[var(--muted)] hover:text-white hover:border-white/20'
                      }`}
                    >
                      {updatingId === req.id ? <Loader2 size={11} className="animate-spin" /> : <opt.icon size={11} />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
