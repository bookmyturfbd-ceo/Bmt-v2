'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy, ShieldCheck, Mail, Phone, Calendar, Users, User, BarChart2,
  Settings, CheckCircle, Plus, Edit3, Trash2, ShieldAlert, Award,
  ArrowUpRight, AlertCircle, MessageSquare, Smartphone, Search,
  Loader2, Wifi, Send, Check, X, ShieldX, Compass
} from 'lucide-react';
import { Link } from '@/i18n/routing';

interface AcademyDashboardClientProps {
  initialAcademy: any;
  isAuthed: boolean;
  role: string | null;
  locale: string;
}

export default function AcademyDashboardClient({
  initialAcademy,
  isAuthed,
  role,
  locale
}: AcademyDashboardClientProps) {
  const router = useRouter();

  const [academy, setAcademy] = useState<any>(initialAcademy);
  const [stats, setStats] = useState<any>({
    viewsThisWeek: 0,
    viewsThisMonth: 0,
    inquiriesThisMonth: 0,
    enrolledCount: 0
  });

  // Tab state: 'leads' | 'edit' | 'programs' | 'coaches' | 'alumni'
  const [activeTab, setActiveTab] = useState<'leads' | 'edit' | 'programs' | 'coaches' | 'alumni'>('leads');

  // Loading and alerts
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Leads list
  const [leads, setLeads] = useState<any[]>([]);

  // CRUD program states
  const [programs, setPrograms] = useState<any[]>(initialAcademy?.programs || []);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);

  // CRUD coach states
  const [coaches, setCoaches] = useState<any[]>(initialAcademy?.coaches || []);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [editingCoach, setEditingCoach] = useState<any>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCoachPlayer, setSelectedCoachPlayer] = useState<any>(null);
  const [searchingPlayers, setSearchingPlayers] = useState(false);

  // Alumni states
  const [alumni, setAlumni] = useState<any[]>(initialAcademy?.alumni || []);
  const [alumniSearchQuery, setAlumniSearchQuery] = useState('');
  const [alumniSearchResults, setAlumniSearchResults] = useState<any[]>([]);
  const [searchingAlumni, setSearchingAlumni] = useState(false);

  // Verification request note
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');

  // Setup Academy Form States
  const [academyName, setAcademyName] = useState(initialAcademy?.name || '');
  const [tagline, setTagline] = useState(initialAcademy?.tagline || '');
  const [description, setDescription] = useState(initialAcademy?.description || '');
  const [sportInput, setSportInput] = useState<string[]>(initialAcademy?.sport || ['FUTSAL']);
  const [address, setAddress] = useState(initialAcademy?.address || '');
  const [area, setArea] = useState(initialAcademy?.area || '');
  const [lat, setLat] = useState(initialAcademy?.lat || '');
  const [lng, setLng] = useState(initialAcademy?.lng || '');
  const [phone, setPhone] = useState(initialAcademy?.phone || '');
  const [whatsapp, setWhatsapp] = useState(initialAcademy?.whatsapp || '');
  const [facebookUrl, setFacebookUrl] = useState(initialAcademy?.facebookUrl || '');

  // Media Manager states
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaCaption, setNewMediaCaption] = useState('');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/academy/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/academy/inquiries');
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    }
  };

  const fetchAlumni = async () => {
    if (!academy) return;
    try {
      const res = await fetch(`/api/academy/alumni?academyId=${academy.id}`);
      if (res.ok) {
        const data = await res.json();
        setAlumni(data);
      }
    } catch (err) {
      console.error('Error fetching alumni list:', err);
    }
  };

  const reloadAcademyData = async () => {
    try {
      const res = await fetch('/api/academy');
      if (res.ok) {
        const data = await res.json();
        setAcademy(data);
        if (data) {
          setPrograms(data.programs || []);
          setCoaches(data.coaches || []);
        }
      }
    } catch (err) {
      console.error('Error reloading academy:', err);
    }
  };

  useEffect(() => {
    if (academy) {
      fetchStats();
      fetchLeads();
      fetchAlumni();
    }
  }, [academy?.id]);

  // Handle Search Players for Coaches
  useEffect(() => {
    if (playerSearchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearchingPlayers(true);
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(playerSearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingPlayers(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [playerSearchQuery]);

  // Handle Search Players for Alumni
  useEffect(() => {
    if (alumniSearchQuery.length < 2) {
      setAlumniSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearchingAlumni(true);
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(alumniSearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setAlumniSearchResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingAlumni(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [alumniSearchQuery]);

  // Handle Create Academy Profile
  const handleSetupAcademy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!academyName || !address || !area || !phone) {
      setErrorMsg('Please fill all required fields');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/academy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: academyName,
          tagline,
          description,
          sport: sportInput,
          address,
          area,
          lat,
          lng,
          phone,
          whatsapp,
          facebookUrl
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAcademy(data);
        setSuccessMsg('Academy draft created successfully!');
      } else {
        setErrorMsg(data.error);
      }
    } catch {
      setErrorMsg('Network error.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Update Academy Profile
  const handleUpdateAcademy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/academy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: academy.id,
          name: academyName,
          tagline,
          description,
          sport: sportInput,
          address,
          area,
          lat,
          lng,
          phone,
          whatsapp,
          facebookUrl
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAcademy(data);
        setSuccessMsg('Academy profile updated successfully!');
      } else {
        setErrorMsg(data.error);
      }
    } catch {
      setErrorMsg('Network error.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Publish Toggle
  const handleTogglePublish = async (publish: boolean) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/academy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: academy.id,
          status: publish ? 'PUBLISHED' : 'DRAFT'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAcademy(data);
        setSuccessMsg(publish ? 'Academy listed public!' : 'Academy set to draft mode.');
      } else {
        setErrorMsg(data.error);
      }
    } catch {
      setErrorMsg('Network error.');
    }
  };

  // Handle Get Verified Submit
  const handleSubmitVerification = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setShowVerifyModal(false);
    try {
      const res = await fetch('/api/academy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: academy.id,
          verificationStatus: 'PENDING'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAcademy(data);
        setSuccessMsg('Verification review submitted successfully!');
      } else {
        setErrorMsg(data.error);
      }
    } catch {
      setErrorMsg('Network error.');
    }
  };

  // Inquiry Lead Status update
  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/academy/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: newStatus })
      });
      if (res.ok) {
        fetchLeads();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add media url
  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaUrl) return;
    try {
      const res = await fetch('/api/academy/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academyId: academy.id,
          url: newMediaUrl,
          caption: newMediaCaption
        })
      });
      if (res.ok) {
        setNewMediaUrl('');
        setNewMediaCaption('');
        reloadAcademyData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete media url
  const handleDeleteMedia = async (mediaId: string) => {
    try {
      const res = await fetch(`/api/academy/media?id=${mediaId}`, { method: 'DELETE' });
      if (res.ok) {
        reloadAcademyData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Program Form submit (Create or Edit)
  const handleProgramSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const sport = (form.elements.namedItem('sport') as HTMLSelectElement).value;
    const ageGroup = (form.elements.namedItem('ageGroup') as HTMLInputElement).value;
    const scheduleText = (form.elements.namedItem('scheduleText') as HTMLInputElement).value;
    const monthlyFeeBdt = (form.elements.namedItem('monthlyFeeBdt') as HTMLInputElement).value;
    const batchSize = (form.elements.namedItem('batchSize') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
    const sortOrder = (form.elements.namedItem('sortOrder') as HTMLInputElement).value;

    const method = editingProgram ? 'PATCH' : 'POST';
    const payload = {
      id: editingProgram?.id,
      academyId: academy.id,
      name, sport, ageGroup, scheduleText, monthlyFeeBdt, batchSize, description, sortOrder
    };

    try {
      const res = await fetch('/api/academy/programs', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowProgramModal(false);
        setEditingProgram(null);
        reloadAcademyData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete program
  const handleDeleteProgram = async (progId: string) => {
    if (!confirm('Are you sure you want to delete this program?')) return;
    try {
      const res = await fetch(`/api/academy/programs?id=${progId}`, { method: 'DELETE' });
      if (res.ok) {
        reloadAcademyData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Coach Form submit (Create or Edit)
  const handleCoachSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const photoUrl = (form.elements.namedItem('photoUrl') as HTMLInputElement).value;
    const bio = (form.elements.namedItem('bio') as HTMLTextAreaElement).value;
    const sortOrder = (form.elements.namedItem('sortOrder') as HTMLInputElement).value;

    const method = editingCoach ? 'PATCH' : 'POST';
    const payload = {
      id: editingCoach?.id,
      academyId: academy.id,
      coachPlayerId: selectedCoachPlayer?.id || null,
      name, title, photoUrl, bio, sortOrder
    };

    try {
      const res = await fetch('/api/academy/coaches', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowCoachModal(false);
        setEditingCoach(null);
        setSelectedCoachPlayer(null);
        setPlayerSearchQuery('');
        reloadAcademyData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete coach
  const handleDeleteCoach = async (coachId: string) => {
    if (!confirm('Are you sure you want to delete this coach?')) return;
    try {
      const res = await fetch(`/api/academy/coaches?id=${coachId}`, { method: 'DELETE' });
      if (res.ok) {
        reloadAcademyData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Alumnus (Showcase)
  const handleAddAlumni = async (targetPlayer: any) => {
    try {
      const res = await fetch('/api/academy/alumni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academyId: academy.id, targetPlayerId: targetPlayer.id })
      });
      const data = await res.json();
      if (res.ok) {
        setAlumniSearchQuery('');
        setAlumniSearchResults([]);
        fetchAlumni();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Remove Alumnus
  const handleRemoveAlumni = async (alumniId: string) => {
    if (!confirm('Remove this player from alumni?')) return;
    try {
      const res = await fetch(`/api/academy/alumni?id=${alumniId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAlumni();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-32">
      
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-yellow-400" />
          <h1 className="font-black text-lg tracking-tight uppercase">Academy Dashboard</h1>
        </div>
        {academy && (
          <Link
            href={`/academy/${academy.slug}`}
            className="text-[10px] font-black uppercase bg-neutral-900 border border-white/5 px-3 py-1.5 rounded-full hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
          >
            Preview Listing <ArrowUpRight size={10} />
          </Link>
        )}
      </header>

      {/* Check setup state */}
      {!academy ? (
        <div className="px-5 pt-8 max-w-lg mx-auto flex flex-col gap-6">
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-3xl text-center flex flex-col items-center gap-3">
            <Compass size={40} className="text-[#00ff41]" />
            <h2 className="text-lg font-black">List Your Sports Academy</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Create your marketplace listing and receive direct inquiries from players and parents on Book My Turf.
            </p>
          </div>

          <form onSubmit={handleSetupAcademy} className="bg-neutral-900 border border-white/5 rounded-3xl p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Academy Name *</span>
              <input type="text" required value={academyName} onChange={e => setAcademyName(e.target.value)} placeholder="e.g. Uttara Football Training Academy" className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold" />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Address *</span>
              <input type="text" required value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. Plot 12, Sector 4, Uttara, Dhaka" className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Area *</span>
                <input type="text" required value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. Uttara" className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Phone Number *</span>
                <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 01700000000" className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold" />
              </div>
            </div>

            {errorMsg && <p className="text-xs font-bold text-red-400 text-center">{errorMsg}</p>}

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 transition-all">
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Create Academy Listing'}
            </button>
          </form>
        </div>
      ) : (
        <div className="px-4 pt-5 flex flex-col gap-5">

          {/* Status and Action banner */}
          <div className="bg-neutral-900 border border-white/5 p-4 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${academy.status === 'PUBLISHED' ? 'bg-[#00ff41] animate-pulse' : 'bg-neutral-600'}`} />
              <div>
                <p className="text-xs font-black text-white">Status: {academy.status}</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  {academy.status === 'PUBLISHED' ? 'Visible to public' : 'Draft / Private'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {academy.status === 'DRAFT' ? (
                <button
                  onClick={() => handleTogglePublish(true)}
                  className="px-4 py-2 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs rounded-xl transition-all"
                >
                  Publish Listing
                </button>
              ) : (
                <button
                  onClick={() => handleTogglePublish(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-black text-xs rounded-xl transition-all"
                >
                  Set to Draft
                </button>
              )}
            </div>
          </div>

          {/* ── Stats strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-900/60 border border-white/5 p-4 rounded-3xl text-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase">Views Week</p>
              <p className="text-2xl font-black text-white mt-1 tabular-nums">{stats.viewsThisWeek}</p>
            </div>
            <div className="bg-neutral-900/60 border border-white/5 p-4 rounded-3xl text-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase">Views Month</p>
              <p className="text-2xl font-black text-white mt-1 tabular-nums">{stats.viewsThisMonth}</p>
            </div>
            <div className="bg-neutral-900/60 border border-white/5 p-4 rounded-3xl text-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase">Leads Month</p>
              <p className="text-2xl font-black text-[#00ff41] mt-1 tabular-nums">{stats.inquiriesThisMonth}</p>
            </div>
            <div className="bg-neutral-900/60 border border-white/5 p-4 rounded-3xl text-center">
              <p className="text-[10px] font-bold text-neutral-500 uppercase">Enrolled</p>
              <p className="text-2xl font-black text-white mt-1 tabular-nums">{stats.enrolledCount}</p>
            </div>
          </div>

          {/* ── Verification Badge Card ── */}
          <div className="bg-neutral-900/60 border border-white/5 p-4 rounded-3xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {academy.verificationStatus === 'VERIFIED' ? (
                <ShieldCheck size={28} className="text-[#00ff41]" />
              ) : academy.verificationStatus === 'PENDING' ? (
                <Loader2 size={28} className="text-yellow-500 animate-spin" />
              ) : (
                <ShieldX size={28} className="text-neutral-500" />
              )}
              <div>
                <p className="text-xs font-black text-white">Verification Status</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">{academy.verificationStatus}</p>
              </div>
            </div>
            {academy.verificationStatus === 'UNVERIFIED' && (
              <button
                onClick={() => setShowVerifyModal(true)}
                className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-black text-xs rounded-xl transition-all"
              >
                Get Verified
              </button>
            )}
          </div>

          {successMsg && <div className="bg-[#00ff41]/10 border border-[#00ff41]/25 text-[#00ff41] text-xs font-bold p-3 rounded-xl text-center">{successMsg}</div>}
          {errorMsg && <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold p-3 rounded-xl text-center">{errorMsg}</div>}

          {/* ── Navigation Tabs ── */}
          <div className="flex border-b border-white/5 overflow-x-auto scrollbar-none py-1 gap-1">
            {[
              { id: 'leads', label: 'Inquiries Inbox' },
              { id: 'edit', label: 'Listing Profile' },
              { id: 'programs', label: 'Programs' },
              { id: 'coaches', label: 'Coaches' },
              { id: 'alumni', label: 'Alumni Manager' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`px-4 py-2.5 rounded-full text-xs font-black shrink-0 transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#00ff41] text-black shadow-[0_0_20px_rgba(0,255,65,0.15)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── 1. INBOX LEADS TAB ── */}
          {activeTab === 'leads' && (
            <div className="flex flex-col gap-3">
              {leads.length > 0 ? (
                leads.map(lead => {
                  const callLink = `tel:${lead.phone}`;
                  const waLeadLink = `https://wa.me/${lead.phone}`;
                  return (
                    <div key={lead.id} className="bg-neutral-900 border border-white/5 p-4 rounded-3xl flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-black text-sm text-white">{lead.studentName}</h3>
                            {lead.studentAge && <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-full">{lead.studentAge}y</span>}
                          </div>
                          <p className="text-[10px] text-neutral-500 mt-0.5">Program: {lead.program?.name || 'General'}</p>
                          <p className="text-[9px] text-neutral-600 mt-0.5">{new Date(lead.createdAt).toLocaleDateString()}</p>
                        </div>
                        <select
                          value={lead.status}
                          onChange={e => handleUpdateLeadStatus(lead.id, e.target.value)}
                          className="bg-neutral-950 border border-white/10 rounded-xl px-2 py-1 text-[10px] font-black text-[#00ff41] outline-none cursor-pointer"
                        >
                          <option value="NEW">New</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="ENROLLED">Enrolled</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      </div>
                      <p className="text-xs text-neutral-400 bg-neutral-950 border border-white/5 p-3 rounded-xl">"{lead.message}"</p>
                      
                      <div className="flex gap-2">
                        <a href={callLink} className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1 transition-all">
                          <Phone size={12} /> Call
                        </a>
                        <a href={waLeadLink} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-[#25d366]/10 border border-[#25d366]/20 text-[#25d366] font-black text-xs rounded-xl flex items-center justify-center gap-1 transition-all">
                          <Smartphone size={12} /> WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-neutral-500 border border-dashed border-white/10 rounded-3xl">Your leads inbox is empty.</div>
              )}
            </div>
          )}

          {/* ── 2. LISTING PROFILE / EDIT TAB ── */}
          {activeTab === 'edit' && (
            <div className="flex flex-col gap-5">
              
              {/* Media Manager */}
              <div className="bg-neutral-900 border border-white/5 p-5 rounded-3xl flex flex-col gap-4">
                <div>
                  <h3 className="font-black text-sm text-white">Media Gallery</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Add photo or video CDN links for your listing carousel.</p>
                </div>
                
                {academy.media?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {academy.media.map((med: any) => (
                      <div key={med.id} className="relative aspect-video rounded-xl bg-neutral-950 overflow-hidden border border-white/10 group">
                        <img src={med.url} className="w-full h-full object-cover" alt="" />
                        <button
                          onClick={() => handleDeleteMedia(med.id)}
                          className="absolute top-1 right-1 bg-red-500/80 p-1.5 rounded-full text-white hover:bg-red-500 transition-colors"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddMedia} className="flex flex-col gap-2 mt-2">
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/photo.jpg"
                    value={newMediaUrl}
                    onChange={e => setNewMediaUrl(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs outline-none text-white font-bold"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Caption (optional)"
                      value={newMediaCaption}
                      onChange={e => setNewMediaCaption(e.target.value)}
                      className="flex-1 bg-neutral-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs outline-none text-white font-bold"
                    />
                    <button type="submit" className="px-4 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs rounded-xl transition-all">
                      Add Media
                    </button>
                  </div>
                </form>
              </div>

              {/* Edit Details Form */}
              <form onSubmit={handleUpdateAcademy} className="bg-neutral-900 border border-white/5 rounded-3xl p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Academy Name *</span>
                  <input type="text" required value={academyName} onChange={e => setAcademyName(e.target.value)} className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs outline-none text-white font-bold" />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Tagline / Pitch</span>
                  <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Nurturing future champions" className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs outline-none text-white font-bold" />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Description</span>
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell players and parents about training approaches, facilities, times…" className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs outline-none text-white font-bold resize-none" />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Address *</span>
                  <input type="text" required value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2.5 text-xs outline-none text-white font-bold" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Area *</span>
                    <input type="text" required value={area} onChange={e => setArea(e.target.value)} className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Phone Number *</span>
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">WhatsApp</span>
                    <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="e.g. 01700000000" className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Facebook Page URL</span>
                    <input type="url" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)} placeholder="e.g. https://facebook.com/academy" className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 transition-all mt-2 active:scale-95">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : 'Save Profile Changes'}
                </button>
              </form>
            </div>
          )}

          {/* ── 3. PROGRAMS CRUD TAB ── */}
          {activeTab === 'programs' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center px-1">
                <div>
                  <h3 className="font-black text-sm text-white">Programs Listing</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">List age batches, schedules, and monthly fees.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingProgram(null);
                    setShowProgramModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs rounded-xl flex items-center gap-1 transition-all active:scale-95"
                >
                  <Plus size={12} /> Add Program
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {programs.length > 0 ? (
                  programs.map(prog => (
                    <div key={prog.id} className="bg-neutral-900 border border-white/5 p-4 rounded-3xl flex justify-between items-center gap-4">
                      <div>
                        <h4 className="font-black text-sm text-white">{prog.name}</h4>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{prog.ageGroup} · {prog.sport} · {prog.scheduleText}</p>
                        <p className="text-xs font-black text-[#00ff41] mt-1">
                          {prog.monthlyFeeBdt ? `৳${prog.monthlyFeeBdt}/mo` : 'Contact for fee'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingProgram(prog);
                            setShowProgramModal(true);
                          }}
                          className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-neutral-300 transition-colors"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteProgram(prog.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-neutral-500 border border-dashed border-white/10 rounded-3xl">No training programs added yet.</div>
                )}
              </div>
            </div>
          )}

          {/* ── 4. COACHES CRUD TAB ── */}
          {activeTab === 'coaches' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center px-1">
                <div>
                  <h3 className="font-black text-sm text-white">Coaches & Trainers</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Introduce your trainers and link real BMT profiles.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingCoach(null);
                    setSelectedCoachPlayer(null);
                    setPlayerSearchQuery('');
                    setShowCoachModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs rounded-xl flex items-center gap-1 transition-all active:scale-95"
                >
                  <Plus size={12} /> Add Coach
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {coaches.length > 0 ? (
                  coaches.map(coach => (
                    <div key={coach.id} className="bg-neutral-900 border border-white/5 p-4 rounded-3xl flex justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center border border-white/10">
                          {coach.photoUrl ? <img src={coach.photoUrl} className="w-full h-full object-cover" alt="" /> : <User size={16} className="text-neutral-600" />}
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-white">{coach.name}</h4>
                          <p className="text-[10px] text-neutral-500">{coach.title}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingCoach(coach);
                            setSelectedCoachPlayer(coach.coachPlayer || null);
                            setShowCoachModal(true);
                          }}
                          className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-neutral-300 transition-colors"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteCoach(coach.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-neutral-500 border border-dashed border-white/10 rounded-3xl">No coaches listed yet.</div>
                )}
              </div>
            </div>
          )}

          {/* ── 5. ALUMNI MANAGER TAB ── */}
          {activeTab === 'alumni' && (
            <div className="flex flex-col gap-4">
              <div className="bg-neutral-900 border border-white/5 p-5 rounded-3xl flex flex-col gap-4">
                <div>
                  <h3 className="font-black text-sm text-white">Search BMT Players</h3>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Send a training validation request to BMT players.</p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by full name, email or player code…"
                    value={alumniSearchQuery}
                    onChange={e => setAlumniSearchQuery(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold"
                  />
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                </div>

                {searchingAlumni && <div className="text-center py-2"><Loader2 size={16} className="animate-spin text-neutral-500 mx-auto" /></div>}
                
                {alumniSearchResults.length > 0 && (
                  <div className="bg-neutral-950 border border-white/5 rounded-2xl p-2 flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {alumniSearchResults.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-2 hover:bg-neutral-900/60 rounded-xl">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0">
                            {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" /> : <User size={10} className="text-neutral-500" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white truncate">{p.fullName}</p>
                            <p className="text-[9px] text-neutral-500">{p.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddAlumni(p)}
                          className="px-2.5 py-1 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-[9px] rounded-lg transition-all"
                        >
                          Request
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">Academy Alumni Showcase</p>
                <div className="flex flex-col gap-3">
                  {alumni.length > 0 ? (
                    alumni.map(alumnus => (
                      <div key={alumnus.id} className="bg-neutral-900 border border-white/5 p-4 rounded-3xl flex justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-950 flex items-center justify-center border border-white/10 shrink-0">
                            {alumnus.player.avatarUrl ? <img src={alumnus.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <User size={12} className="text-neutral-600" />}
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-white">{alumnus.player.fullName}</h4>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                              alumnus.confirmedByPlayer ? 'bg-[#00ff41]/10 text-[#00ff41]' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {alumnus.confirmedByPlayer ? 'Confirmed' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveAlumni(alumnus.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-neutral-500 border border-dashed border-white/10 rounded-3xl">No alumni members linked yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── 1. PROGRAM FORM DIALOG SHEET ── */}
      {showProgramModal && (
        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-[#111318] rounded-t-3xl border-t border-white/10 p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-white">{editingProgram ? 'Edit Program' : 'Add Program'}</h2>
              <button onClick={() => setShowProgramModal(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:bg-white/10">&times;</button>
            </div>

            <form onSubmit={handleProgramSubmit} className="flex flex-col gap-3.5 overflow-y-auto pr-1">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Program Name *</span>
                <input name="name" required defaultValue={editingProgram?.name || ''} placeholder="e.g. U14 Futsal Elite" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Sport Category</span>
                  <select name="sport" defaultValue={editingProgram?.sport || 'FUTSAL'} className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold cursor-pointer">
                    <option value="FUTSAL">Futsal</option>
                    <option value="FOOTBALL">Football</option>
                    <option value="CRICKET">Cricket</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Age Group *</span>
                  <input name="ageGroup" required defaultValue={editingProgram?.ageGroup || ''} placeholder="e.g. U10, U14, 16+, Adults" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Schedule Text *</span>
                <input name="scheduleText" required defaultValue={editingProgram?.scheduleText || ''} placeholder="e.g. Fri & Sat, 4:00 PM - 6:00 PM" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Monthly Fee BDT (Optional)</span>
                  <input name="monthlyFeeBdt" type="number" defaultValue={editingProgram?.monthlyFeeBdt || ''} placeholder="null = contact for fee" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Max Batch Size (Optional)</span>
                  <input name="batchSize" type="number" defaultValue={editingProgram?.batchSize || ''} placeholder="e.g. 20" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Description (Optional)</span>
                <textarea name="description" defaultValue={editingProgram?.description || ''} placeholder="Short notes about curriculum, trainer, requirements…" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold resize-none" />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Sort Order</span>
                <input name="sortOrder" type="number" defaultValue={editingProgram?.sortOrder || '0'} className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
              </div>

              <button type="submit" className="w-full py-3.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs uppercase rounded-xl transition-all mt-2">
                Save Program
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. COACH FORM DIALOG SHEET ── */}
      {showCoachModal && (
        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-[#111318] rounded-t-3xl border-t border-white/10 p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-white">{editingCoach ? 'Edit Coach Profile' : 'Add Coach Profile'}</h2>
              <button onClick={() => setShowCoachModal(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:bg-white/10">&times;</button>
            </div>

            <form onSubmit={handleCoachSubmit} className="flex flex-col gap-3.5 overflow-y-auto pr-1">
              
              {/* Trust Link with existing BMT Player Profile */}
              <div className="bg-neutral-950 border border-white/5 p-4 rounded-2xl flex flex-col gap-2">
                <p className="text-[10px] font-black text-yellow-400 uppercase tracking-wider">Trust Integration (BMT User link)</p>
                {selectedCoachPlayer ? (
                  <div className="flex justify-between items-center bg-neutral-900 border border-white/10 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0">
                        {selectedCoachPlayer.avatarUrl ? <img src={selectedCoachPlayer.avatarUrl} className="w-full h-full object-cover" alt="" /> : <User size={10} className="text-neutral-500" />}
                      </div>
                      <span className="text-xs font-bold text-white">{selectedCoachPlayer.fullName} ({selectedCoachPlayer.email})</span>
                    </div>
                    <button type="button" onClick={() => setSelectedCoachPlayer(null)} className="text-red-400 hover:text-red-300 font-bold text-xs">Remove</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search BMT Players by name, email or code…"
                        value={playerSearchQuery}
                        onChange={e => setPlayerSearchQuery(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold"
                      />
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    </div>

                    {searchingPlayers && <div className="text-center py-1"><Loader2 size={12} className="animate-spin text-neutral-500 mx-auto" /></div>}
                    
                    {searchResults.length > 0 && (
                      <div className="bg-neutral-900 border border-white/10 rounded-xl p-1 flex flex-col gap-1 max-h-32 overflow-y-auto">
                        {searchResults.map(p => (
                          <div key={p.id} onClick={() => setSelectedCoachPlayer(p)} className="flex items-center gap-2 p-1.5 hover:bg-neutral-950 rounded-lg cursor-pointer">
                            <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center">
                              {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" /> : <User size={8} className="text-neutral-500" />}
                            </div>
                            <span className="text-[10px] text-neutral-300 font-bold truncate">{p.fullName} ({p.email})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Coach Name *</span>
                <input name="name" required defaultValue={editingCoach?.name || ''} placeholder="e.g. Coach Rahman" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Title / Role *</span>
                <input name="title" required defaultValue={editingCoach?.title || ''} placeholder="e.g. UEFA A Licensed Futsal Coach" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Photo URL (Optional)</span>
                <input name="photoUrl" defaultValue={editingCoach?.photoUrl || ''} placeholder="https://example.com/coach.jpg" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Bio Note (Optional)</span>
                <textarea name="bio" defaultValue={editingCoach?.bio || ''} placeholder="Brief bio or training specialties…" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold resize-none" />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Sort Order</span>
                <input name="sortOrder" type="number" defaultValue={editingCoach?.sortOrder || '0'} className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold" />
              </div>

              <button type="submit" className="w-full py-3.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs uppercase rounded-xl transition-all mt-2">
                Save Coach Details
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 3. VERIFICATION DIALOG MODAL ── */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111318] border border-white/10 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4">
            <div className="text-center flex flex-col items-center gap-2">
              <Award size={36} className="text-yellow-400" />
              <h3 className="font-black text-base text-white">Get Academy Verified</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Verification displays a green checkmark check-badge and grants public publishing privileges for standard listings.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-neutral-500 uppercase">Verification Notes / Supporting Docs link</span>
              <textarea
                rows={3}
                value={verifyNotes}
                onChange={e => setVerifyNotes(e.target.value)}
                placeholder="Include link to licenses, registration, or business certificates…"
                className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none text-white font-bold resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowVerifyModal(false)} className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-black text-xs rounded-xl transition-all">Cancel</button>
              <button onClick={handleSubmitVerification} className="flex-1 py-2.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs rounded-xl transition-all">Submit Request</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
