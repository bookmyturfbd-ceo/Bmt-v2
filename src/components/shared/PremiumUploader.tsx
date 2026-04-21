'use client';
import { useState } from 'react';
import { UploadCloud, X } from 'lucide-react';

interface Props {
  label: string;
  maxFiles?: number;
  initialUrls?: string[];
  onFilesChange: (files: File[]) => void;
  onRemoveInitialUrl?: (url: string) => void;
}

export default function PremiumUploader({ label, maxFiles = 1, initialUrls = [], onFilesChange, onRemoveInitialUrl }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<{file: File, base64: string}[]>([]);

  const handleFiles = (newFiles: File[]) => {
    let validFiles = Array.from(newFiles);
    console.log("RAW OS FILES CAUGHT:", validFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    if (maxFiles === 1) {
      validFiles = validFiles.slice(0, 1);
    } else {
      validFiles = validFiles.slice(0, maxFiles - initialUrls.length - previews.length);
    }

    if (validFiles.length === 0) {
      console.error("DEBUG: validFiles is empty after slicing!");
      return;
    }

    if (maxFiles === 1) {
      console.log('FILE TRAPPED:', validFiles[0].name);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviews([{ file: validFiles[0], base64: reader.result as string }]);
        onFilesChange([validFiles[0]]);
      };
      reader.readAsDataURL(validFiles[0]);
    } else {
      const newPreviews: {file: File, base64: string}[] = [];
      let loaded = 0;
      validFiles.forEach(f => {
        console.log('FILE TRAPPED:', f.name);
        const reader = new FileReader();
        reader.onload = () => {
          newPreviews.push({ file: f, base64: reader.result as string });
          loaded++;
          if (loaded === validFiles.length) {
            setPreviews(prev => {
              const updated = [...prev, ...newPreviews];
              setTimeout(() => onFilesChange(updated.map(p => p.file)), 0);
              return updated;
            });
          }
        };
        reader.readAsDataURL(f);
      });
    }
  };

  const removePreview = (index: number) => {
    setPreviews(prev => {
      const updated = prev.filter((_, i) => i !== index);
      setTimeout(() => onFilesChange(updated.map(p => p.file)), 0);
      return updated;
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">{label}</label>
      
      {/* Previews */}
      {(initialUrls.length > 0 || previews.length > 0) && (
        <div className="flex flex-wrap gap-3 mb-2">
          {initialUrls.map((url, i) => (
             <div key={`init-${i}`} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-[var(--panel-border)] shadow-sm">
               <img src={url} alt="existing" className="w-full h-full object-cover" />
               {onRemoveInitialUrl && (
                 <button type="button" onClick={() => onRemoveInitialUrl(url)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110">
                   <X size={12} />
                 </button>
               )}
             </div>
          ))}
          {previews.map((p, i) => (
             <div key={`prev-${i}`} className="relative group w-20 h-20 rounded-xl overflow-hidden border-2 border-accent shadow-[0_0_15px_rgba(0,255,0,0.15)]">
               <img src={p.base64} alt="preview" className="w-full h-full object-cover" />
               <button type="button" onClick={() => removePreview(i)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110">
                 <X size={12} />
               </button>
               <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm text-accent text-[8px] font-black tracking-widest py-1 text-center truncate uppercase">New Upload</div>
             </div>
          ))}
        </div>
      )}

      {/* Dropzone Pipeline */}
      {(!maxFiles || (initialUrls.length + previews.length) < maxFiles) && (
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { 
            e.preventDefault(); 
            setIsDragging(false); 
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFiles(Array.from(e.dataTransfer.files));
            }
          }}
          className={`relative overflow-hidden w-full h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${isDragging ? 'border-accent bg-accent/10 scale-[1.02]' : 'border-[var(--panel-border)] bg-[var(--panel-bg)] hover:border-accent/40'}`}
        >
           <UploadCloud size={28} className={`transition-colors ${isDragging ? 'text-accent' : 'text-[var(--muted)]'}`} />
           <div className="text-center">
              <p className={`text-sm font-black tracking-wide ${isDragging ? 'text-accent' : 'text-foreground'}`}>{isDragging ? 'Drop Image Here!' : 'Drag & Drop File'}</p>
              <p className="text-[10px] text-[var(--muted)] font-bold tracking-widest uppercase mt-1">or click to manually assign</p>
           </div>
           
           {/* Fallback Legacy Dispatch */}
           <input 
             type="file" 
             accept="image/*" 
             multiple={maxFiles > 1}
             onChange={(e) => {
               if (e.target.files) handleFiles(Array.from(e.target.files));
               e.target.value = '';
             }}
             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
           />
        </div>
      )}
    </div>
  );
}
