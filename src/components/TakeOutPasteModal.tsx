import React from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, LogOut, MapPin, CheckCircle2 } from 'lucide-react';
import { SolderPaste } from '../types';

interface Props {
  paste: SolderPaste;
  onConfirm: (row: number, col: number) => void;
  onCancel: () => void;
}

export const TakeOutPasteModal: React.FC<Props> = ({ paste, onConfirm, onCancel }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-background/90 backdrop-blur-md">
      <div className="bg-card border border-border-strong rounded-2xl shadow-2xl w-full max-w-[340px] sm:max-w-sm max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-blue-500/10 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                <LogOut size={16} />
             </div>
             <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">Lehim Çıkarma</h3>
                <p className="text-[8px] text-blue-400 font-bold uppercase tracking-widest mt-0.5">Soğutucu Dolaptan Çıkar</p>
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
                <span className="text-xs font-mono font-bold text-blue-400">
                  {paste.location}
                  {paste.row !== null && paste.row !== undefined ? ` - Raf ${paste.row},${paste.col}` : ''}
                </span>
             </div>
          </div>

          <div className="p-4 bg-background/50 rounded-xl border border-border mb-6">
             <div className="flex items-start gap-3">
               <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 mt-0.5">
                  <MapPin size={16} />
               </div>
               <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Aşağıdaki Parçayı Alın:</h4>
                  <p className="text-sm font-bold text-foreground mt-1">{paste.parcaNo}</p>
                  <p className="text-[10px] font-mono text-dim-foreground mt-0.5">{paste.barkod}</p>
               </div>
             </div>
          </div>

          <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 mb-6">
            <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1.5">Çözülme Süresi Bilgisi</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Bu lehim <span className="font-bold text-foreground">{paste.type === 'KURSUNLU' ? 'Kurşunlu' : 'Kurşunsuz'}</span> tipindedir. 
              Çıkarıldıktan sonra kullanıma hazır olması için <span className="font-bold text-foreground">{paste.type === 'KURSUNLU' ? '8' : '4'} saat</span> beklemesi gerekecektir.
            </p>
          </div>

          <button 
            onClick={() => onConfirm(paste.row!, paste.col!)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-foreground font-bold py-3.5 rounded-xl uppercase tracking-[0.2em] text-[11px] transition-all shadow-lg shadow-blue-900/40 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} />
            ÇIKARDIM, ONAYLIYORUM
          </button>
        </div>

        <div className="px-6 py-4 bg-blue-500/5 border-t border-border flex justify-center shrink-0">
           <p className="text-[9px] text-blue-400/60 font-bold uppercase tracking-[0.2em]">Kullanıcı Onayı Zorunludur</p>
        </div>
      </div>
    </div>,
    document.body
  );
};
