'use client';

import { useState, useRef, useEffect, ReactElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Sparkles, Move, RefreshCw } from 'lucide-react';

interface ImageAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  title?: string;
  shape?: 'circle' | 'square';
  onConfirm: (file: File) => Promise<void> | void;
}

export default function ImageAdjustModal({
  isOpen,
  onClose,
  imageSrc,
  title = 'Adjust Image for Best Outcome',
  shape = 'circle',
  onConfirm,
}: ImageAdjustModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [offsetX, setOffsetX] = useState(0); // -100 to 100
  const [offsetY, setOffsetY] = useState(0); // -100 to 100
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset controls when new image opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setOffsetX(0);
      setOffsetY(0);
      setSaving(false);
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffsetX(0);
    setOffsetY(0);
  };

  // Mouse/Touch drag for panning image position
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX - offsetX, y: clientY - offsetY };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const newX = clientX - dragStartRef.current.x;
    const newY = clientY - dragStartRef.current.y;
    // Bound drag offsets between -120 and 120
    setOffsetX(Math.max(-120, Math.min(120, newX)));
    setOffsetY(Math.max(-120, Math.min(120, newY)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const processAndSave = async () => {
    if (!imageSrc) return;
    setSaving(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
      });

      const canvas = document.createElement('canvas');
      const targetSize = 400; // 400x400 high resolution avatar
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.clearRect(0, 0, targetSize, targetSize);

      // Save canvas state
      ctx.save();

      // Move origin to center of canvas
      ctx.translate(targetSize / 2, targetSize / 2);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply zoom & pan offsets
      ctx.scale(zoom, zoom);

      // Draw image centered with offsets
      const aspect = img.width / img.height;
      let drawW = targetSize;
      let drawH = targetSize;

      if (aspect > 1) {
        drawW = targetSize * aspect;
      } else {
        drawH = targetSize / aspect;
      }

      const drawX = -drawW / 2 + offsetX;
      const drawY = -drawH / 2 + offsetY;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      ctx.restore();

      // Export canvas to Blob / File
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92)
      );

      if (!blob) throw new Error('Failed to generate image file');

      const adjustedFile = new File([blob], `profile_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      await onConfirm(adjustedFile);
      onClose();
    } catch (err: any) {
      console.error('Image adjustment error:', err);
      alert(err.message || 'Failed to process image');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          className="relative w-full max-w-sm glass-panel rounded-3xl border border-white/10 shadow-2xl overflow-hidden z-10 p-5 flex flex-col gap-4 bg-neutral-950/95"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-accent font-black text-sm uppercase tracking-wider">
              <Sparkles size={16} />
              <span>{title}</span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Framing / Adjust Viewport */}
          <div className="relative flex flex-col items-center justify-center my-2">
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              className={`relative w-64 h-64 bg-neutral-900 border-2 border-dashed border-accent/40 overflow-hidden cursor-grab active:cursor-grabbing shadow-inner ${
                shape === 'circle' ? 'rounded-full' : 'rounded-3xl'
              }`}
            >
              {/* Image Preview Container */}
              <div
                className="w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom}) rotate(${rotation}deg)`,
                }}
              >
                <img
                  src={imageSrc}
                  alt="Preview"
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              </div>

              {/* Centering Grid Guide Overlay */}
              <div className="absolute inset-0 border border-white/10 pointer-events-none flex items-center justify-center">
                <div className="w-full h-[1px] bg-white/10" />
                <div className="h-full w-[1px] bg-white/10 absolute" />
              </div>

              {/* Drag Hint */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[9px] font-bold text-accent border border-accent/20 flex items-center gap-1 pointer-events-none">
                <Move size={10} /> Drag to adjust position
              </div>
            </div>

            {/* Quality Badge */}
            <span className="text-[10px] text-neutral-400 font-semibold mt-2 flex items-center gap-1">
              ✨ Auto-optimized to 400×400 high quality avatar
            </span>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 bg-white/5 p-3.5 rounded-2xl border border-white/5">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <ZoomOut size={14} className="text-neutral-400" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-accent cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
              <ZoomIn size={14} className="text-neutral-400" />
              <span className="text-[11px] font-mono font-black text-accent w-8 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Action Buttons: Rotate & Reset */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <button
                onClick={handleRotate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                <RotateCw size={13} className="text-accent" />
                <span>Rotate 90°</span>
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={processAndSave}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-accent text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,255,65,0.3)] disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Check size={16} strokeWidth={3} />
            )}
            <span>{saving ? 'Processing Image…' : 'Apply & Save Image'}</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
