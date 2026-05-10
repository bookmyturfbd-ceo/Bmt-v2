'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';

export default function OrganizerLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/organizers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (data.success) {
        router.push('/organizer/dashboard');
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        
        <div className="mb-8 text-center relative z-10">
          <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-accent">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">Organizer Login</h1>
          <p className="text-neutral-400 font-bold text-sm mt-1">Manage your active tournaments</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Email Address</label>
            <input 
              required
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 font-bold text-white focus:border-accent transition-colors outline-none" 
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">Password</label>
            <input 
              required
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 font-bold text-white focus:border-accent transition-colors outline-none" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-accent text-black font-black uppercase tracking-widest py-4 rounded-xl mt-6 hover:bg-white transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <>Login to Portal <ArrowRight size={20} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
