'use client';
import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { Eye, EyeOff, Lock, Phone, ShieldCheck, ArrowRight } from 'lucide-react';
import AuthInput from '@/components/auth/AuthInput';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  
  const [form, setForm] = useState({
    phone: '',
    otp: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverErr, setServerErr]   = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim()) {
      setErrors({ phone: 'Mobile number is required' });
      return;
    }
    if (!/^(?:\+88|88)?01[3-9]\d{8}$/.test(form.phone.trim())) {
      setErrors({ phone: 'Invalid BD mobile number format' });
      return;
    }

    setSubmitting(true);
    setServerErr('');
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone, purpose: 'reset' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerErr(data.error || 'Failed to send OTP.');
      } else {
        setStep(2);
      }
    } catch {
      setServerErr('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.otp.trim()) {
      setErrors({ otp: 'OTP is required' });
      return;
    }

    setSubmitting(true);
    setServerErr('');
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone, otp: form.otp, purpose: 'reset' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerErr(data.error || 'Invalid OTP.');
      } else {
        setStep(3);
      }
    } catch {
      setServerErr('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate final step
    const eObj: Record<string, string> = {};
    if (!form.password) eObj.password = 'Password is required';
    else if (form.password.length < 8) eObj.password = 'Password must be at least 8 characters';
    if (!form.confirmPassword) eObj.confirmPassword = 'Confirm your password';
    else if (form.password !== form.confirmPassword) eObj.confirmPassword = 'Passwords do not match';
    
    if (Object.keys(eObj).length > 0) {
      setErrors(eObj);
      return;
    }

    setSubmitting(true);
    setServerErr('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone,
          otp: form.otp,
          newPassword: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setServerErr(data.error || 'Failed to reset password.'); setSubmitting(false); return; }
      
      // Success, redirect to login
      window.location.href = window.location.origin + '/en/login?reset=success';
    } catch {
      setServerErr('Network error. Please try again.');
      setSubmitting(false);
    }
  };


  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden py-10">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,255,0,0.06),transparent)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm px-4 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 mb-4 drop-shadow-[0_0_15px_rgba(0,255,0,0.2)]">
            <img src="/logo.png" alt="BMT Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--foreground)]">Reset Password</h1>
          <p className="text-sm text-neutral-500 font-medium mt-1">
            {step === 1 ? 'Enter your registered mobile number' : step === 2 ? 'Enter verification code' : 'Set your new password'}
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <AuthInput
                label="Mobile Number"
                type="tel"
                placeholder="017XXXXXXXX"
                value={form.phone}
                onChange={set('phone')}
                error={errors.phone}
                autoComplete="tel"
              />
              {serverErr && <p className="text-xs font-bold text-red-400 text-center">{serverErr}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full bg-accent text-black font-black py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,255,0,0.2)] text-sm tracking-wide disabled:opacity-60"
              >
                <Phone size={16} className="stroke-[2.5]" />
                {submitting ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <p className="text-xs text-neutral-400 text-center mb-2">We sent a 6-digit code to {form.phone}</p>
              <AuthInput
                label="OTP Code"
                type="text"
                placeholder="123456"
                value={form.otp}
                onChange={set('otp')}
                error={errors.otp}
                autoComplete="one-time-code"
              />
              {serverErr && <p className="text-xs font-bold text-red-400 text-center">{serverErr}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full bg-accent text-black font-black py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,255,0,0.2)] text-sm tracking-wide disabled:opacity-60"
              >
                <ShieldCheck size={16} className="stroke-[2.5]" />
                {submitting ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-neutral-400 font-medium hover:text-accent mt-2"
              >
                Change Phone Number
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="flex flex-col gap-4">
              <AuthInput
                label="New Password"
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={set('password')}
                error={errors.password}
                autoComplete="new-password"
                rightElement={
                  <button type="button" onClick={() => setShowPw(prev => !prev)} className="text-neutral-500 hover:text-[var(--foreground)] dark:hover:text-white transition-colors">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
              <AuthInput
                label="Confirm New Password"
                type={showConfirmPw ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                error={errors.confirmPassword}
                autoComplete="new-password"
                rightElement={
                  <button type="button" onClick={() => setShowConfirmPw(prev => !prev)} className="text-neutral-500 hover:text-[var(--foreground)] dark:hover:text-white transition-colors">
                    {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />

              {serverErr && <p className="text-xs font-bold text-red-400 text-center">{serverErr}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full bg-accent text-black font-black py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,255,0,0.2)] text-sm tracking-wide disabled:opacity-60"
              >
                <Lock size={16} className="stroke-[2.5]" />
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 mt-6">
          <p className="text-sm text-neutral-500 font-medium">
            Remembered your password?{' '}
            <Link href="/login" className="text-accent font-bold hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
