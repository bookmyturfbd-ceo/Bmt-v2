const fs = require('fs');

try {
  let c = fs.readFileSync('src/app/[locale]/teams/[id]/page.tsx', 'utf8');

  if (c.includes('showAnnouncements')) {
    console.log("Already patched.");
    process.exit(0);
  }

  // Inject state variables
  c = c.replace(
    '  const [saving, setSaving] = useState(false);',
    `  const [saving, setSaving] = useState(false);\n\n  const [showAnnouncements, setShowAnnouncements] = useState(false);\n  const [announcements, setAnnouncements] = useState<any[]>([]);\n  const [newAnnTitle, setNewAnnTitle] = useState('');\n  const [newAnnContent, setNewAnnContent] = useState('');\n  const [showCMHistory, setShowCMHistory] = useState(false);`
  );

  // Add fetch to useEffect
  c = c.replace(
    /fetch\('\/api\/bmt\/cities'\)\.then.*?;\n\s*fetch\('\/api\/bmt\/turfs'\)\.then.*?;/,
    `fetch('/api/bmt/cities').then(r => r.json()).then(d => setCities(Array.isArray(d) ? d : d.cities || []));
    fetch('/api/bmt/turfs').then(r => r.json()).then(d => setTurfs(Array.isArray(d) ? d : d.turfs || []));
    fetch(\`/api/teams/\${id}/announcements\`).then(r => r.json()).then(d => setAnnouncements(Array.isArray(d) ? d : []));`
  );

  // Add announcement trigger button after subscription pill
  c = c.replace(
    '            {/* CM Subscription Status Pill */}',
    `            {/* Team Announcements Trigger */}
            <div className="mt-3 w-full flex justify-center z-30">
              <button onClick={() => setShowAnnouncements(true)} className="flex items-center gap-1.5 px-5 py-1.5 bg-neutral-800/80 hover:bg-neutral-800 rounded-full text-[10px] font-black uppercase text-amber-500 border border-amber-500/30 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                📜 Team Scroll
              </button>
            </div>
            {/* CM Subscription Status Pill */}`
  );

  // Add booking history under SquadManager
  c = c.replace(
    '        <SquadManager team={team} setTeam={setTeam} myRole={myRole} />\n      </div>\n\n      {/* AREA MODAL */}',
    `        <SquadManager team={team} setTeam={setTeam} myRole={myRole} />
        
        {/* CM Booking History Box */}
        <div className="mt-4 glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden mb-6 relative">
          <div className="px-4 py-3.5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><Clock size={13} className="text-blue-400" /></div>
              <p className="font-black text-sm">CM Joint Bookings</p>
            </div>
          </div>
          <div className="border-t border-white/5 p-4 flex flex-col gap-3 relative z-10">
            <button onClick={() => setShowCMHistory(true)} className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs rounded-xl transition-colors border border-blue-500/30">
              View Shared Ledgers
            </button>
          </div>
        </div>
      </div>

      {/* AREA MODAL */}`
  );
  
  // Add API helper for Announcements
  c = c.replace(
    '  const handleToggleSub = async () => {',
    `  const handleCreateAnnouncement = async () => {
    if (!newAnnTitle || !newAnnContent) return;
    setSaving(true);
    const res = await fetch(\`/api/teams/\${id}/announcements\`, {
      method: 'POST',
      body: JSON.stringify({ title: newAnnTitle, content: newAnnContent })
    });
    if (res.ok) {
      const ann = await res.json();
      setAnnouncements([ann, ...announcements]);
      setNewAnnTitle(''); setNewAnnContent('');
    }
    setSaving(false);
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    setSaving(true);
    const res = await fetch(\`/api/teams/\${id}/announcements?annId=\${annId}\`, { method: 'DELETE' });
    if (res.ok) setAnnouncements(announcements.filter(a => a.id !== annId));
    setSaving(false);
  };

  const cmMatches = [...(team?.matchesAsTeamA || []), ...(team?.matchesAsTeamB || [])]
    .filter(m => m.bookingCode)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleToggleSub = async () => {`
  );

  // Add the modals at the end (before last </div>)
  c = c.replace(
    '    </div>\n  );\n}\n',
    `      {/* ANNOUNCEMENT MODAL - MEDIEVAL SCROLL */}
      {showAnnouncements && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowAnnouncements(false)}>
          <div 
            className="bg-[#1a1410] border border-[#a67c52]/30 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative overflow-hidden" 
            onClick={e => e.stopPropagation()}
            style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/aged-paper.png")' }}
          >
            {/* Scroll aesthetics */}
            <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[#3a2818] to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-[#3a2818]/60 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-[#3a2818]/60 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-[70vh]">
              <div className="flex items-center justify-between mb-4 border-b border-[#a67c52]/20 pb-3">
                <h3 className="font-serif text-2xl mb-1 text-[#d4af37] tracking-widest text-shadow-sm font-black italic">Royal Decree</h3>
                <button onClick={() => setShowAnnouncements(false)} className="text-[#a67c52] hover:text-[#d4af37]"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-5">
                {isOMC && (
                  <div className="p-4 bg-black/40 border border-[#a67c52]/30 rounded-xl mb-4">
                     <p className="text-[#d4af37] text-[10px] font-black uppercase mb-3 tracking-widest">Scribe New Decree</p>
                     <input value={newAnnTitle} onChange={e => setNewAnnTitle(e.target.value)} placeholder="Title..." className="w-full bg-black/50 border border-[#a67c52]/20 rounded-lg px-3 py-2 text-sm text-[#e6d0a3] focus:outline-none focus:border-[#d4af37] mb-2 font-serif italic" />
                     <textarea value={newAnnContent} onChange={e => setNewAnnContent(e.target.value)} placeholder="Content of your decree..." className="w-full bg-black/50 border border-[#a67c52]/20 rounded-lg px-3 py-2 text-sm text-[#e6d0a3] focus:outline-none focus:border-[#d4af37] min-h-[80px] font-serif" />
                     <button onClick={handleCreateAnnouncement} disabled={saving} className="w-full py-2 bg-[#8c6239] hover:bg-[#a67c52] text-[#f2e6d9] font-black text-sm rounded-lg transition-colors mt-2 border border-[#d4af37]/50 shadow-[0_0_10px_rgba(212,175,55,0.2)]">Publish Decree</button>
                  </div>
                )}
                
                {announcements.length === 0 ? (
                  <div className="text-center py-10 text-[#a67c52]/70 font-serif italic">No scribed decrees present.</div>
                ) : announcements.map(ann => (
                  <div key={ann.id} className="relative pb-5 border-b border-[#a67c52]/10 mb-2">
                    {isOMC && (
                       <button onClick={() => handleDeleteAnnouncement(ann.id)} className="absolute top-0 right-0 text-red-500/50 hover:text-red-500"><X size={14} /></button>
                    )}
                    <h4 className="font-serif text-[#d4af37] text-lg font-bold mb-1 pr-6">{ann.title}</h4>
                    <p className="font-sans text-[9px] text-[#a67c52] font-black uppercase tracking-wider mb-2">Scribed by {ann.author?.fullName} • {new Date(ann.createdAt).toLocaleDateString()}</p>
                    <p className="font-serif text-[#e6d0a3] text-sm leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CM HISTORY MODAL */}
      {showCMHistory && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowCMHistory(false)}>
          <div className="bg-neutral-900 border border-[var(--panel-border)] rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md flex flex-col h-[75vh] shadow-2xl relative animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400"><Clock size={16} /></div>
                <div>
                  <h3 className="font-black text-lg text-white leading-none">Shared Ledger</h3>
                  <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest mt-1">Challenge Market</p>
                </div>
              </div>
              <button onClick={() => setShowCMHistory(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
              {cmMatches.length === 0 ? (
                 <div className="text-center py-10 text-[var(--muted)] text-sm font-bold">No generated CM bookings found.</div>
              ) : cmMatches.map(m => {
                 const isTeamA = m.teamA_Id === team.id;
                 const opp = isTeamA ? m.teamB : m.teamA;
                 const oppName = opp?.name || 'Unknown Team';
                 const bookingId = isTeamA ? m.bookingIdA : m.bookingIdB;
                 return (
                   <div key={m.id} className="bg-neutral-800/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                     <div className="absolute top-0 right-0 p-2 opacity-10 blur-sm pointer-events-none group-hover:blur-none group-hover:opacity-30 transition-all">
                       <Clock size={40} className="text-blue-500" />
                     </div>
                     <p className="text-[10px] uppercase font-black text-blue-400 tracking-widest leading-none">Booking #{bookingId?.slice(-6).toUpperCase() || m.bookingCode}</p>
                     
                     <div className="flex items-center justify-between mt-1">
                       <div className="font-black text-sm">vs {oppName}</div>
                       <div className="bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] uppercase font-black px-2 py-0.5 rounded-md">
                         CODE: {m.bookingCode}
                       </div>
                     </div>
                     
                     <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-xs text-[var(--muted)] font-bold">{m.matchDate ? new Date(m.matchDate).toLocaleDateString() : new Date(m.createdAt).toLocaleDateString()}</span>
                        <span className="text-xs font-black text-green-400">{m.status === 'COMPLETED' ? 'FINISHED' : 'PENDING'}</span>
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
`
  );

  fs.writeFileSync('src/app/[locale]/teams/[id]/page.tsx', c, 'utf8');
  console.log('Patch complete!');
} catch (e) {
  console.error(e);
}
