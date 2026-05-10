'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, ArrowRight, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

export default function OrganizerSignupPage() {
  const { token } = useParams();
  const router = useRouter();

  const [invite, setInvite] = useState<any>(null);
  const [inviteError, setInviteError] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/organizers/invite/${token}`);
        const data = await res.json();
        if (data.success) {
          const inv = data.data;
          setInvite(inv);
          // Pre-fill contact from invite
          const contact = inv.emailOrPhone || '';
          const isEmail = contact.includes('@');
          setFormData(prev => ({
            ...prev,
            email: isEmail ? contact : '',
            phone: !isEmail ? contact : '',
          }));
        } else {
          setInviteError(data.error || 'Invalid or expired invite link.');
        }
      } catch {
        setInviteError('Failed to validate invite link.');
      } finally {
        setLoadingInvite(false);
      }
    };
    if (token) fetchInvite();
  }, [token]);

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/organizers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          inviteToken: token,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Auto-login
        const loginRes = await fetch('/api/organizers/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });
        await loginRes.json();
        const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'en' : 'en';
        window.location.href = `/${locale}/organizer/dashboard`; // Use window.location.href to ensure a full reload into the dashboard
      } else {
        setError(data.error || 'Signup failed. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch =
    formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <XCircle size={56} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-black text-white uppercase tracking-wider mb-2">Invalid Invite</h1>
          <p className="text-neutral-400 font-bold text-sm">{inviteError}</p>
          <p className="text-neutral-600 text-xs mt-3">Contact BMT Support if you believe this is a mistake.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 py-12 overflow-y-auto">
      <div className="w-full max-w-md bg-neutral-900 border border-white/10 rounded-3xl p-8 relative overflow-hidden my-auto">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />

        <div className="mb-8 text-center relative z-10">
          <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-accent">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">Organizer Portal</h1>
          <p className="text-neutral-400 font-bold text-sm mt-1">
            You've been invited by BMT. Complete your registration below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
              Your Name / Organization
            </label>
            <input
              required
              type="text"
              name="name"
              placeholder="e.g. Dhaka Sports Club"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 font-bold text-white focus:border-accent transition-colors outline-none placeholder:text-neutral-700"
            />
          </div>

          {/* Phone Number — locked if pre-filled from invite */}
          {formData.phone !== '' && (
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
                Phone Number
              </label>
              <input
                readOnly
                type="tel"
                name="phone"
                value={formData.phone}
                className="w-full bg-black/30 border border-accent/30 rounded-xl p-3.5 font-bold text-accent/80 outline-none cursor-not-allowed"
              />
            </div>
          )}

          {/* Email Address — locked if pre-filled from invite, editable otherwise */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
              Email Address {formData.phone !== '' && formData.email === '' ? '(for login)' : ''}
            </label>
            <input
              required
              type="email"
              name="email"
              readOnly={formData.email !== '' && formData.phone === ''}
              placeholder="Your email address"
              value={formData.email}
              onChange={handleChange}
              className={`w-full rounded-xl p-3.5 font-bold text-white outline-none ${
                formData.email !== '' && formData.phone === ''
                  ? 'bg-black/30 border border-accent/30 text-accent/80 cursor-not-allowed'
                  : 'bg-black/50 border border-white/10 focus:border-accent transition-colors placeholder:text-neutral-700'
              }`}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                required
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Min. 6 characters"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 font-bold text-white focus:border-accent transition-colors outline-none placeholder:text-neutral-700 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                required
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full bg-black/50 border rounded-xl p-3.5 font-bold text-white focus:border-accent transition-colors outline-none placeholder:text-neutral-700 pr-12 ${
                  formData.confirmPassword.length > 0
                    ? passwordsMatch
                      ? 'border-green-500'
                      : 'border-red-500'
                    : 'border-white/10'
                }`}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {formData.confirmPassword.length > 0 && (
                  passwordsMatch
                    ? <CheckCircle2 size={16} className="text-green-500" />
                    : <XCircle size={16} className="text-red-500" />
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="text-neutral-500 hover:text-white ml-1"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-black font-black uppercase tracking-widest py-4 rounded-xl mt-2 hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading
              ? <Loader2 size={20} className="animate-spin" />
              : <><span>Create Account</span><ArrowRight size={20} /></>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
