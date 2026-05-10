'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Star, User } from 'lucide-react';
import OpenMap from '../shared/OpenMap';
import { useRouter } from 'next/navigation';

export default function TurfLocationReviews({ turf, reviews = [] }: { turf: any, reviews: any[] }) {
  const t = useTranslations('TurfDetails');
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    
    // Create new player review
    const reviewData = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      turfId: turf.id,
      userName: "Player " + Math.floor(Math.random() * 1000), // temp pseudo auth
      rating,
      comment,
      createdAt: new Date().toISOString()
    };

    await fetch('/api/bmt/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData)
    });

    setComment('');
    setRating(5);
    setSubmitting(false);
    router.refresh(); // Refresh page to auto-update header stars and list
  };

  return (
    <div className="px-5 py-6 flex flex-col gap-8">
      {/* Location */}
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-bold tracking-tight text-white">{t('location')}</h3>
        <div className="w-full h-[250px] rounded-3xl overflow-hidden glass border border-white/5 relative shadow-inner">
           <OpenMap lat={turf.lat} lng={turf.lng} name={turf.name} />
        </div>
      </div>

      {/* Reviews */}
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-bold tracking-tight text-white">{t('reviews')} <span className="text-neutral-500 text-sm font-medium">({reviews.length})</span></h3>
        
        {/* Render Existing Reviews */}
        <div className="flex flex-col gap-3">
          {reviews.length === 0 ? (
            <p className="text-xs text-neutral-500 italic px-2">No reviews yet. Be the first!</p>
          ) : (
            reviews.map((r: any) => (
              <div key={r.id} className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center"><User size={12} className="text-neutral-400" /></div>
                       <span className="text-xs font-bold text-neutral-300">{r.userName}</span>
                    </div>
                    <div className="flex gap-0.5">
                       {[1,2,3,4,5].map(s => <Star key={s} size={10} className={s <= Number(r.rating) ? "text-yellow-500 fill-yellow-500" : "text-neutral-700"} />)}
                    </div>
                 </div>
                 <p className="text-xs text-neutral-400 leading-relaxed overflow-hidden text-ellipsis">{r.comment}</p>
                 <span className="text-[10px] text-neutral-600 font-medium">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>

        {/* Write a Review */}
        <div className="glass p-5 rounded-3xl flex flex-col gap-4 border border-white/5 shadow-md mt-2">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Rate your experience</p>
          <div className="flex gap-1.5 -mt-1 cursor-pointer">
            {[1,2,3,4,5].map(s => (
               <Star 
                 key={s} 
                 size={26} 
                 onClick={() => setRating(s)}
                 className={`transition-all hover:scale-110 ${s <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-neutral-700'}`} 
               />
            ))}
          </div>
          <textarea 
            placeholder={t('writeComment')}
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full bg-neutral-900/80 border border-white/5 rounded-2xl p-4 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-accent/50 transition-colors min-h-[90px] resize-none shadow-inner"
          ></textarea>
          <button 
            disabled={submitting || !comment.trim()}
            onClick={handleSubmitReview}
            className="self-end px-6 py-2.5 bg-accent text-black font-black tracking-wide rounded-xl text-sm hover:brightness-110 shadow-[0_4px_15px_rgba(0,255,0,0.1)] active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? 'Posting...' : t('submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
