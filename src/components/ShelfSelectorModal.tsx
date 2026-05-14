import React from 'react';
import { createPortal } from 'react-dom';
import { X, Layers } from 'lucide-react';
import { CabinetId } from '../types';

interface Props {
  cabinetId: CabinetId;
  rows: number;
  cols: number;
  onConfirm: (row: number, col: number) => void;
  onCancel: () => void;
}

export const ShelfSelectorModal: React.FC<Props> = ({ cabinetId, rows, cols, onConfirm, onCancel }) => {
  const cabinetName = cabinetId === 'DRY_CABINET_1' ? 'Nem Kabini 1' : 'Nem Kabini 2';
  const isSolderCooler = cabinetId === 'DRY_CABINET_1';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border-strong rounded-2xl shadow-2xl w-full max-w-[320px] sm:max-w-sm max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className={`px-5 py-3 border-b border-border flex justify-between items-center bg-surface/50 shrink-0 ${isSolderCooler ? 'bg-red-500/10' : ''}`}>
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-tight">{cabinetName}</h3>
            <p className="text-[8px] text-dim-foreground font-bold uppercase tracking-widest mt-0.5">Konum Seçiniz</p>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors" type="button">
            <X size={16} />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          {isSolderCooler && (
             <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest leading-relaxed">
                  DİKKAT: Bu dolap sadece KREM LEHİM için ayrılmıştır. MSL malzeme konulamaz.
                </p>
             </div>
          )}
          
          <div 
            className={`grid gap-2 ${isSolderCooler ? 'opacity-20 pointer-events-none' : ''}`}
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: rows }, (_, r) => 
              Array.from({ length: cols }, (_, c) => {
                const row = r + 1;
                const col = c + 1;
                return (
                  <button
                    key={`${row}-${col}`}
                    onClick={() => onConfirm(row, col)}
                    className="group relative aspect-square bg-background border border-border rounded-xl flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-900/10 transition-all"
                  >
                    <div className="text-[8px] font-mono text-dim-foreground group-hover:text-blue-500 mb-1 leading-none">
                      {row},{col}
                    </div>
                    <Layers size={14} className="text-dim-foreground group-hover:text-blue-400 transition-colors" />
                  </button>
                );
              })
            )}
          </div>
          
          <div className="mt-6 p-3 bg-background rounded-lg border border-border">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Seçilen Hücreye Yerleştirilecek</span>
             </div>
          </div>

          <button 
            onClick={onCancel}
            className="w-full mt-4 bg-surface hover:bg-surface-hover text-muted-foreground py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
