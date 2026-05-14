import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, LogOut, MapPin } from 'lucide-react';
import { CabinetId, Malzeme } from '../types';

interface Props {
  malzeme: Malzeme;
  rows: number;
  cols: number;
  onConfirm: (targetLocation?: string) => void;
  onCancel: () => void;
}

export const TakeOutModal: React.FC<Props> = ({ malzeme, rows, cols, onConfirm, onCancel }) => {
  const isOven = malzeme.location.startsWith('OVEN');
  const [targetLocation, setTargetLocation] = useState<string>('DEPO');

  const getCabinetName = (id: CabinetId) => {
    switch(id) {
      case 'DRY_CABINET_1': return 'Lehim Dolabı';
      case 'DRY_CABINET_2': return 'Nem Dolabı';
      case 'OVEN_1': return 'Kürleme Dolabı';
      default: return id;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-background/90 backdrop-blur-md">
      <div className="bg-card border border-border-strong rounded-2xl shadow-2xl w-full max-w-[340px] sm:max-w-sm max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-red-500/10 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                <LogOut size={16} />
             </div>
             <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">Parça Çıkarma</h3>
                <p className="text-[8px] text-red-400 font-bold uppercase tracking-widest mt-0.5">Doğru Raftan Alın</p>
             </div>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors" type="button">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="mb-6 space-y-2">
             <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest">Mevcut Konum</span>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{getCabinetName(malzeme.location)}</span>
             </div>
             <div className="flex items-center gap-3 p-4 bg-background border border-border rounded-xl">
                <div className="w-12 h-12 rounded-lg bg-blue-600 flex flex-col items-center justify-center shadow-lg shadow-blue-500/20">
                   <span className="text-[8px] font-bold text-blue-200 uppercase leading-none mb-1">Raf</span>
                   <span className="text-xl font-mono font-bold text-foreground leading-none">{malzeme.row},{malzeme.col}</span>
                </div>
                <div className="flex-1">
                   <div className="text-sm font-mono font-bold text-foreground">{malzeme.barkod}</div>
                   <div className="text-[10px] text-dim-foreground font-medium uppercase mt-0.5">{malzeme.parcaNo}</div>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest flex items-center gap-2">
                <MapPin size={12} className="text-red-500" /> Görsel Konum Rehberi
             </label>
             
             <div className="bg-background p-6 rounded-2xl border border-border flex justify-center">
                <div 
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: rows }, (_, r) => 
                    Array.from({ length: cols }, (_, c) => {
                      const rNum = r + 1;
                      const cNum = c + 1;
                      const isMatch = malzeme.row === rNum && malzeme.col === cNum;
                      return (
                        <div
                          key={`${rNum}-${cNum}`}
                          className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all relative ${
                            isMatch 
                              ? 'bg-red-600 border-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                              : 'bg-card border-border opacity-30'
                          }`}
                        >
                          <Layers size={18} className={isMatch ? 'text-foreground' : 'text-dim-foreground'} />
                          {isMatch && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                               <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
             </div>
          </div>
          
          {isOven && (
            <div className="mt-6 space-y-2">
               <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest">Hedef Konum (Fırından Çıkış)</label>
               <select 
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
               >
                  <option value="DEPO">Depo Mühürlü</option>
                  <option value="URETIM_SEALED">Üretim Mühürlü</option>
                  <option value="URETIM_OPENED">Üretim Kullanımda</option>
               </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button 
              onClick={onCancel}
              className="bg-surface hover:bg-surface-hover text-muted-foreground py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all border border-border-strong"
            >
              Vazgeç
            </button>
            <button 
              onClick={() => onConfirm(isOven ? targetLocation : undefined)}
              className="bg-red-600 hover:bg-red-500 text-foreground py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-red-900/40 border border-red-500/30"
            >
              Onayla & Çıkar
            </button>
          </div>
        </div>

        <div className="px-8 py-3 bg-red-500/5 text-center">
           <p className="text-[9px] text-red-400/60 font-bold uppercase tracking-[0.2em]">Kullanıcı Onayı Zorunludur</p>
        </div>
      </div>
    </div>,
    document.body
  );
};

