'use client';

import React from 'react';

export default function NotFound() {
  return (
    <html lang="en" className="dark">
      <head>
        <title>404 - Page Not Found | Book My Turf BD</title>
        <meta name="description" content="The page you are looking for does not exist on Book My Turf BD." />
        <link rel="icon" href="/favicon.png" />
      </head>
      <body className="bg-[#0a0a0a] text-white min-h-screen flex items-center justify-center p-4 selection:bg-[#00ff41] selection:text-black">
        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#00ff41] opacity-5 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-md w-full bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/80 p-8 rounded-3xl text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* Logo / Badge */}
          <div className="mx-auto w-20 h-20 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#00ff41]/0 via-[#00ff41]/5 to-[#00ff41]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="text-[#00ff41] font-black text-3xl select-none tracking-tighter drop-shadow-[0_0_8px_rgba(0,255,65,0.5)] animate-pulse">BMT</span>
          </div>

          <h1 className="text-7xl font-extrabold text-white tracking-tight mb-2">404</h1>
          <h2 className="text-xl font-bold text-neutral-200 mb-4">Page Not Found</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-8">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable. Let's get you back on track!
          </p>

          <div className="flex flex-col gap-3">
            <a
              href="/en"
              className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm tracking-wide flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-[0_8px_24px_rgba(0,255,65,0.25)] hover:shadow-[0_12px_32px_rgba(0,255,65,0.4)]"
            >
              Go to Homepage (English)
            </a>
            <a
              href="/bn"
              className="w-full py-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-300 font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-neutral-900 active:scale-[0.98] transition-all duration-200"
            >
              মূল পাতা (বাংলা)
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
