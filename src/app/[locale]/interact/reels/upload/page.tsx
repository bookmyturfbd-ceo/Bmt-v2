'use client';
import { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, ArrowLeft, Video } from 'lucide-react';
import { Link, useRouter } from '@/i18n/routing';

export default function UploadReelPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [status, setStatus] = useState<'idle' | 'preparing' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setVideoUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 50 * 1024 * 1024) {
        setErrorMsg('Video must be under 50MB.');
        return;
      }
      setFile(selected);
      setErrorMsg('');
    }
  };

  const pollStatus = async (uploadId: string) => {
    const check = async () => {
      try {
        const res = await fetch(`/api/reels/status?uploadId=${uploadId}`);
        const data = await res.json();
        
        if (data.status === 'ready') {
          setStatus('success');
          setTimeout(() => router.push('/interact/reels'), 1500);
        } else if (data.status === 'error') {
          setStatus('error');
          setErrorMsg('Video processing failed on Mux servers.');
        } else {
          // Still processing, check again in 3 seconds
          setTimeout(check, 3000);
        }
      } catch (e) {
        setTimeout(check, 3000);
      }
    };
    check();
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('preparing');
    setErrorMsg('');

    try {
      // 1. Get secure direct-upload URL from our Next.js backend
      const initRes = await fetch('/api/reels/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption })
      });
      const initData = await initRes.json();
      
      if (!initRes.ok) {
        throw new Error(initData.error || 'Failed to initialize upload');
      }

      setStatus('uploading');

      // 2. Upload video DIRECTLY to Mux (bypassing our server)
      const uploadRes = await fetch(initData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload video directly to Mux');
      }

      setStatus('processing');

      // 3. Poll our backend to see when Mux finishes transcoding
      pollStatus(initData.id);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pt-4 px-4 pb-24 relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/interact/reels" className="p-2 -ml-2 rounded-full hover:bg-neutral-800 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="font-black text-lg">New Reel</h1>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="flex-1 flex flex-col max-w-md w-full mx-auto">
        
        {/* Video Selector */}
        {!file ? (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[3/4] bg-neutral-900 border-2 border-dashed border-neutral-700 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-accent hover:bg-neutral-800 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-neutral-800 group-hover:bg-accent/20 flex items-center justify-center transition-colors">
              <Video size={32} className="text-neutral-400 group-hover:text-accent transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">Select Video</p>
              <p className="text-xs text-neutral-500 mt-1">MP4 or Quicktime. Max 50MB.</p>
            </div>
          </button>
        ) : (
          <div className="w-full aspect-[3/4] bg-neutral-900 rounded-3xl relative overflow-hidden flex items-center justify-center group">
            <video 
              src={videoUrl || undefined} 
              className="w-full h-full object-cover"
              controls
            />
            {status === 'idle' && (
              <button 
                onClick={() => setFile(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            )}

            {/* Upload Overlay */}
            {status !== 'idle' && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
                {status === 'success' ? (
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white scale-in">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : (
                  <>
                    <Loader2 size={40} className="text-accent animate-spin" />
                    <p className="font-bold text-accent animate-pulse">
                      {status === 'preparing' && 'Connecting to Mux...'}
                      {status === 'uploading' && 'Uploading directly to Mux...'}
                      {status === 'processing' && 'Optimizing video for playback...'}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <input 
          type="file" 
          accept="video/mp4,video/quicktime" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {/* Caption */}
        <div className="mt-6">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-4">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={status !== 'idle'}
            placeholder="What's happening on the turf?"
            className="w-full mt-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white focus:outline-none focus:border-accent transition-colors resize-none disabled:opacity-50"
            rows={3}
          />
        </div>

        {errorMsg && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleUpload}
          disabled={!file || status !== 'idle'}
          className="mt-8 w-full py-4 bg-accent text-black font-black text-lg rounded-2xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,65,0.2)] disabled:shadow-none"
        >
          {status === 'idle' ? (
             <>Post Reel <Upload size={20} /></>
          ) : (
             'Uploading...'
          )}
        </button>

      </div>
    </div>
  );
}
