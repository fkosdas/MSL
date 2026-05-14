import React from 'react';
import { Malzeme } from '../types';
import { Box, Edit2, Clock, AlertTriangle, Trash2, RotateCcw } from 'lucide-react';
import { mslEngine } from '../mslEngine';

interface Props {
  malzeme: Malzeme;
  style?: React.CSSProperties;
  onEdit: (m: Malzeme, action?: string) => void;
  onUpdate: (updated: Malzeme) => void;
  onLog: any;
  simulatedNow: number;
  searchFilter?: string;
}

export const TrackingRow: React.FC<Props> = ({ malzeme, style, onEdit, onUpdate, simulatedNow }) => {
  const result = mslEngine.hesapla(malzeme, simulatedNow);

  const barkod = malzeme.SERILOTNO || malzeme.barkod || '---';
  const stokKodu = malzeme.STOK_KODU || malzeme.parcaNo || '---';
  const stokAdi = malzeme.STOK_ADI || malzeme.description || '---';
  const mslLevel = malzeme.mslSeviyesi?.toString() || malzeme.MSL?.toString() || '3';
  const thickness = malzeme.kalinlik?.toString() || malzeme.THICKNESS?.toString() || '0';

  let progress = 0;
  if (result.toplamZamanMs && result.kalanZamanMs !== null) {
      progress = 100 - (result.kalanZamanMs / result.toplamZamanMs) * 100;
  }

  const getStatusStyle = () => {
      switch(result.renkDurumu) {
          case 'red': return 'bg-red-500/10 text-red-500 border-red-500/20';
          case 'yellow': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
          case 'green': return 'bg-green-500/10 text-green-400 border-green-500/20';
          case 'blue': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
          case 'cyan': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
          case 'purple': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
          case 'orange': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
          default: return 'bg-surface text-muted-foreground border-border-strong';
      }
  };

  const getProgressColor = () => {
      switch(result.renkDurumu) {
          case 'red': return 'bg-red-500';
          case 'yellow': return 'bg-yellow-500';
          case 'green': return 'bg-green-500';
          case 'blue': return 'bg-blue-500';
          case 'cyan': return 'bg-cyan-500';
          case 'purple': return 'bg-purple-500';
          case 'orange': return 'bg-orange-500';
          default: return 'bg-slate-500';
      }
  };

  const formatTime = (ms: number) => {
    const isOvertime = ms < 0;
    const absMs = Math.abs(ms);
    const h = Math.floor(absMs / 3600000);
    const m = Math.floor((absMs % 3600000) / 60000);
    const s = Math.floor((absMs % 60000) / 1000);
    return `${isOvertime ? '+' : ''}${h.toString().padStart(2, '0')}s ${m.toString().padStart(2, '0')}d ${s.toString().padStart(2, '0')}sn`;
  };

  return (
    <div 
      style={style} 
      onClick={() => onEdit(malzeme)}
      className="cursor-pointer px-6 border-b border-border/50 hover:bg-surface/30 transition-all flex items-center relative group"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-500 transition-colors"></div>
      
      <div className="grid grid-cols-12 w-full items-center gap-1 py-4">
        {/* BARCODE / P/N */}
        <div className="col-span-3 flex flex-col gap-1 relative overflow-hidden pr-2">
           <div className="text-[13px] font-bold text-blue-400 group-hover:text-blue-300 transition-colors flex items-center gap-2 truncate">
             <span className="truncate" title={barkod}>{barkod}</span>
             <Edit2 size={10} className="text-dim-foreground opacity-0 group-hover:opacity-100 transition-all shrink-0" />
           </div>
           <div className="text-[10px] text-dim-foreground font-mono truncate" title={`${stokKodu} • ${thickness}mm`}>{stokKodu} • {thickness}mm</div>
        </div>

        {/* DESCRIPTION */}
        <div className="col-span-3 pr-2">
           <div className="text-[10px] text-muted-foreground uppercase line-clamp-2 leading-relaxed" title={stokAdi}>{stokAdi}</div>
        </div>

        {/* MSL & LOC */}
        <div className="col-span-2 flex flex-col gap-1.5 items-start">
           <div className="bg-surface border border-border-strong text-muted-foreground font-bold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider">SEVİYE {mslLevel}</div>
           <div className="text-[9px] text-dim-foreground uppercase font-bold tracking-widest">
             {malzeme.location === 'URETIM' ? 'ÜRETİM ALANI' : 
              malzeme.location === 'DEPO' ? 'DEPO' : 
              malzeme.location === 'DRY_CABINET_1' ? 'LEHİM DOLABI' :
              malzeme.location === 'DRY_CABINET_2' ? 'NEM DOLABI' :
              malzeme.location === 'OVEN_1' ? 'KÜRLEME DOLABI' :
              (malzeme.location as string).replace(/_/g, ' ')}
           </div>
        </div>

        {/* FLOOR LIFE REM. */}
        <div className="col-span-2 flex flex-col justify-center">
            <div className={`text-xs font-bold font-mono ${result.renkDurumu === 'red' ? 'text-red-500' : result.renkDurumu === 'green' ? 'text-green-500' : result.renkDurumu === 'orange' ? 'text-orange-400' : result.renkDurumu === 'cyan' ? 'text-cyan-400' : 'text-purple-400'}`}>
               {result.kalanZamanMs !== null ? formatTime(result.kalanZamanMs) : '---'}
            </div>
            <div className="text-[9px] text-dim-foreground uppercase tracking-widest font-bold mt-0.5">
               TOPLAM {result.toplamZamanMs !== null ? Math.round(result.toplamZamanMs/3600000) : '---'}SA
            </div>
        </div>

        {/* STATUS TIMELINE */}
        <div className="col-span-2 flex flex-col justify-center gap-2 pr-4">
           <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
              <div className={`h-full ${getProgressColor()} transition-all duration-1000`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}></div>
           </div>
           <div className="flex items-center justify-between">
               <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate mr-2 flex items-center gap-1">
                   {result.kalanZamanMs !== null && result.kalanZamanMs < 0 && result.yeniDurum === 'BAKING' && (
                      <AlertTriangle size={10} className="text-red-500 animate-pulse" />
                   )}
                   <span className={result.kalanZamanMs !== null && result.kalanZamanMs < 0 && result.yeniDurum === 'BAKING' ? 'text-red-400 font-extrabold animate-pulse' : ''}>{result.mesaj}</span>
               </span>
               <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                   {(malzeme.location === 'DEPO' || malzeme.location === 'URETIM') && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); onEdit(malzeme, 'DRY_CABINET'); }} className="bg-blue-600 hover:bg-blue-500 text-foreground rounded px-2 py-1 flex items-center justify-center text-[9px] font-bold uppercase tracking-widest transition-colors shadow-lg shadow-blue-900/20 whitespace-nowrap">
                            NEM KABİNİ
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onEdit(malzeme, 'OVEN'); }} className="bg-orange-600 hover:bg-orange-500 text-foreground rounded px-2 py-1 flex items-center justify-center text-[9px] font-bold uppercase tracking-widest transition-colors shadow-lg shadow-orange-900/20 whitespace-nowrap">
                            FIRIN
                        </button>
                      </>
                   )}
                   {['DRY_CABINET_1', 'DRY_CABINET_2', 'OVEN_1'].includes(malzeme.location) && (
                      <button onClick={(e) => { e.stopPropagation(); onEdit(malzeme, 'TAKE_OUT'); }} className="bg-green-600 hover:bg-green-500 text-foreground rounded px-2 py-1 flex items-center justify-center text-[9px] font-bold uppercase tracking-widest transition-colors shadow-lg shadow-green-900/20 whitespace-nowrap">
                          ÇIKART
                      </button>
                   )}
                   {malzeme.location === 'URETIM' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(malzeme, 'CANCEL_TAKEOUT'); }} 
                        className="bg-surface-hover hover:bg-slate-600 text-muted-foreground rounded px-2 py-1 flex items-center justify-center text-[9px] font-bold uppercase tracking-widest transition-colors border border-slate-600 whitespace-nowrap"
                        title="Çıkarmayı İptal Et"
                      >
                         İPTAL
                      </button>
                   )}
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};
