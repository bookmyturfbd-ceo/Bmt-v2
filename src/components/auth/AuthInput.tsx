import { InputHTMLAttributes } from 'react';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
}

export default function AuthInput({ label, error, rightElement, ...props }: AuthInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">{label}</label>
        {rightElement}
      </div>
      <input
        {...props}
        className={`w-full bg-white dark:bg-neutral-950/80 border border-neutral-200 dark:border-white/8 rounded-xl px-4 py-3 text-sm text-[var(--foreground)] font-medium placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none transition-all focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed
          ${error
            ? 'border-red-500/60 dark:border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
            : 'focus:border-accent focus:ring-accent/30'
          } ${props.className ?? ''}`}
      />
      {error && (
        <p className="text-[11px] font-semibold text-red-400 mt-0.5 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
