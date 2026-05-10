const fs = require('fs');

// ─────────────────────────────────────────────────────────────
// 1. TEAM PAGE — Fix POST missing Content-Type + add edit, redesign scroll
// ─────────────────────────────────────────────────────────────
{
  let c = fs.readFileSync('src/app/[locale]/teams/[id]/page.tsx', 'utf8');

  // Fix POST missing Content-Type header
  c = c.replace(
    `    const res = await fetch(\`/api/teams/\${id}/announcements\`, {\n      method: 'POST',\n      body: JSON.stringify({ title: newAnnTitle, content: newAnnContent })\n    });`,
    `    const res = await fetch(\`/api/teams/\${id}/announcements\`, {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ title: newAnnTitle, content: newAnnContent })\n    });`
  );

  // Add editingAnnId state after newAnnContent
  c = c.replace(
    `  const [newAnnContent, setNewAnnContent] = useState('');`,
    `  const [newAnnContent, setNewAnnContent] = useState('');\n  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);`
  );

  // Add handleEditAnnouncement + handleSaveEdit after handleDeleteAnnouncement
  c = c.replace(
    `  const cmMatches`,
    `  const handleSaveEdit = async (annId: string, title: string, content: string) => {
    setSaving(true);
    const res = await fetch(\`/api/teams/\${id}/announcements?annId=\${annId}\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
    if (res.ok) {
      const ann = await res.json();
      setAnnouncements(announcements.map(a => a.id === annId ? ann : a));
    }
    setEditingAnnId(null);
    setSaving(false);
  };

  const cmMatches`
  );

  // Completely replace the Team Scroll modal with a better version
  const oldScrollModal = `      {/* ANNOUNCEMENT MODAL - MEDIEVAL SCROLL */}
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
      )}`;

  const newScrollModal = `      {/* ANNOUNCEMENT MODAL - MEDIEVAL SCROLL */}
      {showAnnouncements && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm" onClick={() => setShowAnnouncements(false)}>
          <div 
            className="w-full max-w-md flex flex-col shadow-2xl relative overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[#a67c52]/40"
            style={{ background: 'linear-gradient(180deg, #1e1208 0%, #120c06 60%, #0d0805 100%)', maxHeight: '85dvh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Scroll top rod */}
            <div className="h-3 w-full shrink-0" style={{ background: 'linear-gradient(90deg, #3a1e08, #8c5e2a, #d4af37, #8c5e2a, #3a1e08)' }} />
            {/* Decorative wood grain lines */}
            <div className="absolute top-3 left-0 w-full h-px bg-[#a67c52]/30 pointer-events-none" />

            {/* Header */}
            <div className="px-6 pt-4 pb-3 border-b border-[#a67c52]/20 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-serif text-xl text-[#d4af37] font-black italic tracking-wide">⚔️ Royal Decrees</h3>
                <p className="text-[#a67c52] text-[10px] font-bold uppercase tracking-widest">{team.name}</p>
              </div>
              <button onClick={() => setShowAnnouncements(false)} className="w-8 h-8 flex items-center justify-center rounded-full border border-[#a67c52]/30 text-[#a67c52] hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-colors"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ scrollbarColor: '#a67c52 transparent' }}>
              {/* OMC: Write new decree */}
              {isOMC && (
                <div className="border border-[#a67c52]/30 rounded-2xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                  <div className="px-4 py-2.5 border-b border-[#a67c52]/20">
                    <p className="text-[#d4af37] text-[9px] font-black uppercase tracking-widest">✍️ Scribe New Decree</p>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <input
                      value={newAnnTitle}
                      onChange={e => setNewAnnTitle(e.target.value)}
                      placeholder="Decree Title..."
                      className="w-full bg-black/50 border border-[#a67c52]/20 rounded-xl px-4 py-2.5 text-sm text-[#e6d0a3] focus:outline-none focus:border-[#d4af37] font-serif italic placeholder:text-[#a67c52]/40"
                    />
                    <textarea
                      value={newAnnContent}
                      onChange={e => setNewAnnContent(e.target.value)}
                      placeholder="Write your decree here..."
                      rows={3}
                      className="w-full bg-black/50 border border-[#a67c52]/20 rounded-xl px-4 py-2.5 text-sm text-[#e6d0a3] focus:outline-none focus:border-[#d4af37] font-serif placeholder:text-[#a67c52]/40 resize-none"
                    />
                    <button
                      onClick={handleCreateAnnouncement}
                      disabled={saving || !newAnnTitle.trim() || !newAnnContent.trim()}
                      className="w-full py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-40 border border-[#d4af37]/50"
                      style={{ background: 'linear-gradient(90deg, #6b3c10, #a06420, #6b3c10)', color: '#fde8a0' }}
                    >
                      📜 Publish Decree
                    </button>
                  </div>
                </div>
              )}

              {/* Decree list */}
              {announcements.length === 0 ? (
                <div className="text-center py-12 text-[#a67c52]/60 font-serif italic text-sm">No decrees have been scribed yet.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {announcements.map(ann => {
                    const isEditing = editingAnnId === ann.id;
                    return (
                      <EditableDecree
                        key={ann.id}
                        ann={ann}
                        isOMC={isOMC}
                        isEditing={isEditing}
                        saving={saving}
                        onEdit={() => setEditingAnnId(ann.id)}
                        onDelete={() => handleDeleteAnnouncement(ann.id)}
                        onSave={(title, content) => handleSaveEdit(ann.id, title, content)}
                        onCancel={() => setEditingAnnId(null)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scroll bottom rod */}
            <div className="h-3 w-full shrink-0" style={{ background: 'linear-gradient(90deg, #3a1e08, #8c5e2a, #d4af37, #8c5e2a, #3a1e08)' }} />
          </div>
        </div>
      )}`;

  c = c.replace(oldScrollModal, newScrollModal);

  fs.writeFileSync('src/app/[locale]/teams/[id]/page.tsx', c, 'utf8');
  console.log('[A] Team page: Content-Type fix, edit state, redesigned scroll modal');
}

// ─────────────────────────────────────────────────────────────
// 2. SQUAD MANAGER — Bigger inline rank badge
// ─────────────────────────────────────────────────────────────
{
  let c = fs.readFileSync('src/components/teams/SquadManager.tsx', 'utf8');

  // Inline rank badge — currently h-4, make h-6 with label below
  c = c.replace(
    `  if (inline) return <span className="inline-flex items-center gap-1.5"><img src={d.icon} className="h-4 w-auto object-contain drop-shadow-md" alt="Rank" /><span className={\`\${d.text} font-black italic\`}>{d.rank} {d.tier}</span></span>;`,
    `  if (inline) return <span className="inline-flex items-center gap-1.5"><img src={d.icon} className="h-6 w-auto object-contain drop-shadow-md" alt="Rank" /><span className={\`\${d.text} font-black text-xs\`}>{d.rank} {d.tier}</span></span>;`
  );

  // Player card row — make MMR and rank bigger and better aligned
  c = c.replace(
    `        <div className="flex items-center gap-3 mt-1">
          <span className="text-[9px] text-[var(--muted)] font-bold">MMR <span className="text-white/70">{m.player.mmr ?? 1000}</span></span>
          <span className="text-[9px] text-[var(--muted)] font-bold">Rank <RankBadge mmr={m.player.mmr ?? 1000} inline={true} /></span>
        </div>`,
    `        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-[10px] font-black bg-neutral-800 px-2 py-0.5 rounded-md border border-white/10 text-white/70">{m.player.mmr ?? 1000} <span className="text-[#00ff41]">MMR</span></span>
          <RankBadge mmr={m.player.mmr ?? 1000} inline={true} />
        </div>`
  );

  fs.writeFileSync('src/components/teams/SquadManager.tsx', c, 'utf8');
  console.log('[B] SquadManager: rank badges enlarged and player card aligned');
}

// ─────────────────────────────────────────────────────────────
// 3. Add PATCH to announcements API + add EditableDecree component
// ─────────────────────────────────────────────────────────────
{
  let api = fs.readFileSync('src/app/api/teams/[id]/announcements/route.ts', 'utf8');

  if (!api.includes('PATCH')) {
    api += `
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = cookies();
  const auth = cookieStore.get('bmt_auth')?.value;
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const annId = searchParams.get('annId');
    if (!annId) return NextResponse.json({ error: 'No announcement id provided' }, { status: 400 });

    const { title, content } = await req.json();

    const updated = await prisma.teamAnnouncement.update({
      where: { id: annId },
      data: { title, content },
      include: { author: { select: { fullName: true } } }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}
`;
    fs.writeFileSync('src/app/api/teams/[id]/announcements/route.ts', api, 'utf8');
    console.log('[C] Announcements API: PATCH endpoint added');
  } else {
    console.log('[C] Announcements API: PATCH already exists');
  }
}

// ─────────────────────────────────────────────────────────────
// 4. Inject EditableDecree component at top of team page (before export default)
// ─────────────────────────────────────────────────────────────
{
  let c = fs.readFileSync('src/app/[locale]/teams/[id]/page.tsx', 'utf8');

  if (!c.includes('EditableDecree')) {
    const editableDecree = `
// ── Editable Decree Component ────────────────────────────────
function EditableDecree({ ann, isOMC, isEditing, saving, onEdit, onDelete, onSave, onCancel }: {
  ann: any; isOMC: boolean; isEditing: boolean; saving: boolean;
  onEdit: () => void; onDelete: () => void;
  onSave: (title: string, content: string) => void; onCancel: () => void;
}) {
  const [t, setT] = useState(ann.title);
  const [body, setBody] = useState(ann.content);
  
  return (
    <div className="border border-[#a67c52]/20 rounded-2xl overflow-hidden relative group" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="px-4 py-2.5 border-b border-[#a67c52]/10 flex items-center justify-between">
        {isEditing ? (
          <input value={t} onChange={e => setT(e.target.value)} className="flex-1 bg-black/60 border border-[#a67c52]/30 rounded-lg px-3 py-1.5 text-sm text-[#e6d0a3] focus:outline-none focus:border-[#d4af37] font-serif italic mr-2" />
        ) : (
          <h4 className="font-serif text-[#d4af37] text-base font-bold leading-tight flex-1">{ann.title}</h4>
        )}
        {isOMC && !isEditing && (
          <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="text-[#a67c52] hover:text-[#d4af37] text-[10px] font-black uppercase">Edit</button>
            <button onClick={onDelete} className="text-red-500/60 hover:text-red-500 text-[10px] font-black uppercase">Del</button>
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        <p className="text-[9px] text-[#a67c52]/70 font-bold uppercase tracking-wider mb-2">
          {ann.author?.fullName} · {new Date(ann.createdAt).toLocaleDateString()}
        </p>
        {isEditing ? (
          <>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
              className="w-full bg-black/60 border border-[#a67c52]/30 rounded-xl px-3 py-2.5 text-sm text-[#e6d0a3] focus:outline-none focus:border-[#d4af37] font-serif resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={() => onSave(t, body)} disabled={saving} className="flex-1 py-2 rounded-xl font-black text-xs border border-[#d4af37]/50 text-[#fde8a0] disabled:opacity-40" style={{ background: 'linear-gradient(90deg,#6b3c10,#a06420,#6b3c10)' }}>Save</button>
              <button onClick={onCancel} className="px-4 py-2 rounded-xl font-black text-xs border border-white/10 text-[#a67c52] hover:text-white">Cancel</button>
            </div>
          </>
        ) : (
          <p className="font-serif text-[#e6d0a3] text-sm leading-relaxed whitespace-pre-wrap">{ann.content}</p>
        )}
      </div>
    </div>
  );
}

`;
    c = c.replace("export default function SingleTeamPage()", editableDecree + "export default function SingleTeamPage()");
    fs.writeFileSync('src/app/[locale]/teams/[id]/page.tsx', c, 'utf8');
    console.log('[D] EditableDecree component injected into team page');
  } else {
    console.log('[D] EditableDecree already exists');
  }
}

console.log('\nAll fixes complete!');
