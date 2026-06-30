'use client';
import { useState, useEffect } from 'react';
import {
  Loader2, Building2, Briefcase, GraduationCap, Phone,
  Mail, MapPin, MessageSquare, Clock, CheckCircle2, PhoneCall, RefreshCw,
  UserCheck, XCircle, Search, X, Layers, Upload, FileText, Eye, Trash2, Image
} from 'lucide-react';
import { uploadFileToCDN } from '@/lib/supabase';

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
  cvUrl: string | null;
  nidUrl: string | null;
  pictureUrl: string | null;
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
  const [data, setData] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Filtering states
  const [activeStatus, setActiveStatus] = useState<JoinRequestStatus | 'ALL'>('PENDING');
  const [activeType, setActiveType] = useState<JoinRequestType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [notesState, setNotesState] = useState<Record<string, string>>({});
  const [updatingNotesId, setUpdatingNotesId] = useState<string | null>(null);

  const [uploadingField, setUploadingField] = useState<Record<string, boolean>>({});

  const handleFileUpload = async (id: string, field: 'cvUrl' | 'nidUrl' | 'pictureUrl', file: File | null) => {
    if (!file) return;
    const fieldKey = `${id}_${field}`;
    setUploadingField(prev => ({ ...prev, [fieldKey]: true }));
    try {
      const pathFolder = field === 'cvUrl' ? 'join-requests/cv' : field === 'nidUrl' ? 'join-requests/nid' : 'join-requests/picture';
      const url = await uploadFileToCDN(file, pathFolder);
      if (url) {
        // Update backend
        await fetch('/api/admin/join-requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, [field]: url }),
        });
        // Update local state
        setData(prev => prev.map(item => item.id === id ? { ...item, [field]: url } : item));
      }
    } catch (err) {
      console.error(`Failed to upload ${field}:`, err);
    } finally {
      setUploadingField(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleFileDelete = async (id: string, field: 'cvUrl' | 'nidUrl' | 'pictureUrl') => {
    const label = field === 'cvUrl' ? 'CV' : field === 'nidUrl' ? 'NID' : 'Profile Picture';
    if (!confirm(`Are you sure you want to remove this ${label}?`)) return;
    try {
      // Update backend
      await fetch('/api/admin/join-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: null }),
      });
      // Update local state
      setData(prev => prev.map(item => item.id === id ? { ...item, [field]: null } : item));
    } catch (err) {
      console.error(`Failed to delete ${field}:`, err);
    }
  };

  const reload = () => {
    setLoading(true);
    fetch(`/api/admin/join-requests`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const handleStatusChange = async (id: string, status: JoinRequestStatus) => {
    setUpdatingId(id);
    try {
      // Optimistic update
      setData(prev => prev.map(item => item.id === id ? { ...item, status } : item));
      setActiveStatus(status);
      
      await fetch('/api/admin/join-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
    } catch (err) {
      console.error('Failed to change status:', err);
      // Revert on error
      reload();
    } finally {
      setUpdatingId(null);
    }
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
      // Optimistic update
      setData(prev => prev.map(item => item.id === id ? { ...item, adminNotes } : item));
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setUpdatingNotesId(null);
    }
  };

  // Perform filtering locally
  const filteredByTypeAndSearchData = data.filter(req => {
    // 1. Type Filter
    if (activeType !== 'ALL' && req.type !== activeType) {
      return false;
    }
    // 2. Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const nameMatch = req.name?.toLowerCase().includes(query);
      const phoneMatch = req.phone?.toLowerCase().includes(query);
      const emailMatch = req.email?.toLowerCase().includes(query);
      return nameMatch || phoneMatch || emailMatch;
    }
    return true;
  });

  const displayedData = filteredByTypeAndSearchData.filter(req => {
    // 3. Status Filter
    if (activeStatus !== 'ALL' && req.status !== activeStatus) {
      return false;
    }
    return true;
  });

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
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-white/10 rounded-xl text-sm font-bold hover:bg-neutral-800 transition-all text-white"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Search and Filters Section */}
      <div className="bg-neutral-900/50 border border-white/5 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="Search name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-white/10 rounded-xl text-sm outline-none focus:border-accent text-white placeholder:text-white/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Type Filter Buttons */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveType('ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              activeType === 'ALL'
                ? 'bg-white/10 border-white/20 text-white font-black'
                : 'bg-neutral-950/60 border-white/5 text-white/55 hover:text-white hover:border-white/10'
            }`}
          >
            All Types
          </button>
          {TYPE_TABS.map(tab => {
            const Icon = tab.icon;
            const isTabActive = activeType === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveType(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isTabActive
                    ? `${tab.bg} ${tab.color} border-current font-black`
                    : 'bg-neutral-950/60 border-white/5 text-white/55 hover:text-white hover:border-white/10'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Tabs Switcher */}
      <div className="flex gap-2 border-b border-white/10 pb-px overflow-x-auto scrollbar-none">
        {(['ALL', 'PENDING', 'REVIEWED', 'CONTACTED', 'ONBOARDED', 'DECLINED'] as const).map(status => {
          const isAll = status === 'ALL';
          const label = isAll ? 'All Requests' : STATUS_OPTIONS.find(o => o.value === status)!.label;
          const Icon = isAll ? Layers : STATUS_OPTIONS.find(o => o.value === status)!.icon;
          const colorClass = isAll ? 'text-white' : STATUS_OPTIONS.find(o => o.value === status)!.color.split(' ')[0];
          
          // Count based on the search query & type filter
          const count = isAll
            ? filteredByTypeAndSearchData.length
            : filteredByTypeAndSearchData.filter(r => r.status === status).length;

          const isActive = activeStatus === status;

          return (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-bold transition-all whitespace-nowrap -mb-px ${
                isActive
                  ? 'border-accent text-accent font-black'
                  : 'border-transparent text-[var(--muted)] hover:text-white hover:border-white/10'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-accent' : colorClass} />
              <span>{label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-accent text-black font-black' : 'bg-white/10 text-white/80'
              }`}>
                {count}
              </span>
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
        ) : displayedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-neutral-900 border border-white/10">
              <Layers size={24} className="text-white/40" />
            </div>
            <p className="font-black text-white">No requests found</p>
            <p className="text-sm text-[var(--muted)] max-w-sm">
              {searchQuery
                ? `No requests match the search query "${searchQuery}" in this view.`
                : 'There are no interested parties in this tab/filter combination.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {displayedData.map(req => {
              const currentTypeInfo = TYPE_TABS.find(t => t.key === req.type);
              const TypeIcon = currentTypeInfo ? currentTypeInfo.icon : Building2;
              const typeColorClass = currentTypeInfo ? currentTypeInfo.color : 'text-white';
              const typeBgClass = currentTypeInfo ? currentTypeInfo.bg : 'bg-white/10 border-white/25';
              
              return (
                <div
                  key={req.id}
                  className={`bg-neutral-900 border rounded-2xl p-5 flex flex-col md:flex-row gap-5 transition-all ${
                    req.status === 'PENDING' ? 'border-amber-500/20' : 'border-white/5'
                  }`}
                >
                  {/* Left Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${typeBgClass}`}>
                        <TypeIcon size={18} className={typeColorClass} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-white text-base leading-tight">{req.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${typeBgClass} ${typeColorClass}`}>
                            {currentTypeInfo ? currentTypeInfo.label : req.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider mt-1">
                          {new Date(req.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-neutral-950/40 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 text-sm text-[var(--muted)] min-w-0">
                        <Phone size={13} className="text-emerald-400 shrink-0" />
                        <a href={`tel:${req.phone}`} className="hover:text-white transition-colors font-bold truncate">{req.phone}</a>
                      </div>
                      {req.email && (
                        <div className="flex items-center gap-2 text-sm text-[var(--muted)] min-w-0">
                          <Mail size={13} className="text-blue-400 shrink-0" />
                          <a href={`mailto:${req.email}`} className="hover:text-white transition-colors font-bold truncate">{req.email}</a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-[var(--muted)] min-w-0">
                        <MapPin size={13} className="text-fuchsia-400 shrink-0" />
                        <span className="truncate font-bold text-white/90">{req.location}</span>
                      </div>
                    </div>

                    {req.message && (
                      <div className="flex items-start gap-2 text-sm text-[var(--muted)] bg-white/[0.02] border border-white/5 rounded-xl p-3">
                        <MessageSquare size={13} className="text-yellow-400 shrink-0 mt-0.5" />
                        <p className="italic text-white/80">{req.message}</p>
                      </div>
                    )}

                    {/* Document Uploads Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/5 pt-3.5 mt-2">
                      {/* 1. Picture */}
                      <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-950/20 border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-1">
                          <Image size={11} className="text-blue-400" /> Photo
                        </span>
                        {req.pictureUrl ? (
                          <div className="flex items-center justify-between gap-2 bg-neutral-950/60 p-2 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={req.pictureUrl} alt="Photo" className="w-6 h-6 rounded-md object-cover border border-white/10 shrink-0" />
                              <span className="text-xs font-bold text-white truncate">Photo</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a href={req.pictureUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-[var(--muted)] hover:text-accent transition-colors" title="View Photo">
                                <Eye size={13} />
                              </a>
                              <button onClick={() => handleFileDelete(req.id, 'pictureUrl')} className="p-1 text-red-400 hover:text-red-300 transition-colors" title="Remove Photo">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              id={`picture-upload-${req.id}`}
                              accept="image/*"
                              onChange={(e) => handleFileUpload(req.id, 'pictureUrl', e.target.files?.[0] || null)}
                              className="hidden"
                            />
                            <label
                              htmlFor={`picture-upload-${req.id}`}
                              className="flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-white/10 hover:border-accent/40 rounded-lg text-xs font-bold text-[var(--muted)] hover:text-white bg-black/20 hover:bg-black/40 transition-all cursor-pointer select-none"
                            >
                              {uploadingField[`${req.id}_pictureUrl`] ? (
                                <Loader2 size={12} className="animate-spin text-accent" />
                              ) : (
                                <Upload size={12} />
                              )}
                              {uploadingField[`${req.id}_pictureUrl`] ? 'Uploading...' : 'Upload Photo'}
                            </label>
                          </div>
                        )}
                      </div>

                      {/* 2. NID */}
                      <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-950/20 border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-1">
                          <FileText size={11} className="text-emerald-400" /> National ID (NID)
                        </span>
                        {req.nidUrl ? (
                          <div className="flex items-center justify-between gap-2 bg-neutral-950/60 p-2 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={14} className="text-emerald-400 shrink-0" />
                              <span className="text-xs font-bold text-white truncate">NID Doc</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a href={req.nidUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-[var(--muted)] hover:text-accent transition-colors" title="View NID">
                                <Eye size={13} />
                              </a>
                              <button onClick={() => handleFileDelete(req.id, 'nidUrl')} className="p-1 text-red-400 hover:text-red-300 transition-colors" title="Remove NID">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              id={`nid-upload-${req.id}`}
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload(req.id, 'nidUrl', e.target.files?.[0] || null)}
                              className="hidden"
                            />
                            <label
                              htmlFor={`nid-upload-${req.id}`}
                              className="flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-white/10 hover:border-accent/40 rounded-lg text-xs font-bold text-[var(--muted)] hover:text-white bg-black/20 hover:bg-black/40 transition-all cursor-pointer select-none"
                            >
                              {uploadingField[`${req.id}_nidUrl`] ? (
                                <Loader2 size={12} className="animate-spin text-accent" />
                              ) : (
                                <Upload size={12} />
                              )}
                              {uploadingField[`${req.id}_nidUrl`] ? 'Uploading...' : 'Upload NID'}
                            </label>
                          </div>
                        )}
                      </div>

                      {/* 3. CV */}
                      <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-950/20 border border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-1">
                          <FileText size={11} className="text-amber-400" /> Curriculum Vitae (CV)
                        </span>
                        {req.cvUrl ? (
                          <div className="flex items-center justify-between gap-2 bg-neutral-950/60 p-2 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={14} className="text-amber-400 shrink-0" />
                              <span className="text-xs font-bold text-white truncate">CV Doc</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a href={req.cvUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-[var(--muted)] hover:text-accent transition-colors" title="View CV">
                                <Eye size={13} />
                              </a>
                              <button onClick={() => handleFileDelete(req.id, 'cvUrl')} className="p-1 text-red-400 hover:text-red-300 transition-colors" title="Remove CV">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              id={`cv-upload-${req.id}`}
                              accept="image/*,.pdf,.doc,.docx"
                              onChange={(e) => handleFileUpload(req.id, 'cvUrl', e.target.files?.[0] || null)}
                              className="hidden"
                            />
                            <label
                              htmlFor={`cv-upload-${req.id}`}
                              className="flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-white/10 hover:border-accent/40 rounded-lg text-xs font-bold text-[var(--muted)] hover:text-white bg-black/20 hover:bg-black/40 transition-all cursor-pointer select-none"
                            >
                              {uploadingField[`${req.id}_cvUrl`] ? (
                                <Loader2 size={12} className="animate-spin text-accent" />
                              ) : (
                                <Upload size={12} />
                              )}
                              {uploadingField[`${req.id}_cvUrl`] ? 'Uploading...' : 'Upload CV'}
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Notes Section */}
                    <div className="mt-1 flex flex-col gap-1.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Admin Notes</p>
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={notesState[req.id] !== undefined ? notesState[req.id] : (req.adminNotes || '')}
                          onChange={(e) => setNotesState(prev => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="Add note from our end..."
                          className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-accent text-white resize-none"
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
                  <div className="flex md:flex-col gap-2 shrink-0 justify-center">
                    <p className="text-[9px] font-bold tracking-widest text-center text-white/40 uppercase hidden md:block border-b border-white/5 pb-1 mb-1">Set Status</p>
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        disabled={req.status === opt.value || updatingId === req.id}
                        onClick={() => handleStatusChange(req.id, opt.value)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-default ${
                          req.status === opt.value
                            ? `${opt.color} border-current font-black`
                            : 'bg-neutral-800 border-white/10 text-[var(--muted)] hover:text-white hover:border-white/20'
                        }`}
                      >
                        {updatingId === req.id ? <Loader2 size={11} className="animate-spin" /> : <opt.icon size={11} />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
