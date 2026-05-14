import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MSLLevel, Malzeme } from '../types';
import { X, Save } from 'lucide-react';

interface Props {
  malzeme: Malzeme;
  onConfirm: (updates: Partial<Malzeme>) => void;
  onCancel: () => void;
}

export const EditMaterialModal: React.FC<Props> = ({ malzeme, onConfirm, onCancel }) => {
  const [msl, setMsl] = useState<MSLLevel | ''>(malzeme.mslSeviyesi === 'N/A' ? '' : (malzeme.mslSeviyesi || ''));
  const [kalinlik, setKalinlik] = useState<number | ''>(malzeme.kalinlik === 0 ? '' : (malzeme.kalinlik || ''));
  const [parcaNo, setParcaNo] = useState<string>(malzeme.parcaNo);
  const [sealDate, setSealDate] = useState<string>(malzeme.sealDate ? new Date(malzeme.sealDate).toISOString().split('T')[0] : '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msl) {
      setError('Lütfen MSL seviyesi seçin.');
      return;
    }
    if (kalinlik === '' || kalinlik <= 0) {
      setError('Lütfen geçerli bir kalınlık girin (0\'dan büyük).');
      return;
    }
    onConfirm({
      mslSeviyesi: msl as MSLLevel,
      kalinlik: Number(kalinlik),
      parcaNo,
      sealDate: sealDate ? new Date(sealDate).toISOString() : ''
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border-strong rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-surface/50">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Malzeme Bilgilerini Düzenle</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold animate-pulse">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest">Barkod (Değiştirilemez)</label>
            <div className="bg-background px-3 py-2 rounded-lg border border-border text-muted-foreground font-mono text-sm">{malzeme.barkod}</div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest">Stok / Parça No</label>
            <input 
              type="text"
              value={parcaNo}
              onChange={(e) => setParcaNo(e.target.value)}
              className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-sm text-foreground focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest flex justify-between">
                  <div>MSL Seviyesi {!msl && <span className="text-[8px] text-red-500 ml-1">Zorunlu!</span>}</div>
                </label>
                <select 
                  value={msl}
                  onChange={(e) => { setMsl(e.target.value as MSLLevel | ''); setError(null); }}
                  className={`w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500 transition-colors ${!msl ? 'border-red-500/50 bg-red-500/5' : 'border-border-strong'}`}
                >
                  <option value="" disabled>Seçiniz...</option>
                  {['1', '2', '2a', '3', '4', '5', '5a', '6'].map(lvl => (
                    <option key={lvl} value={lvl}>Level {lvl}</option>
                  ))}
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest flex justify-between">
                  <div>Kalınlık (mm) {(kalinlik === '' || kalinlik <= 0) && <span className="text-[8px] text-red-500 ml-1">Zorunlu!</span>}</div>
                </label>
                <input 
                  type="number"
                  step="0.01"
                  value={kalinlik}
                  onChange={(e) => { setKalinlik(e.target.value === '' ? '' : parseFloat(e.target.value)); setError(null); }}
                  className={`w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500 transition-colors ${kalinlik === '' || kalinlik <= 0 ? 'border-red-500/50 bg-red-500/5' : 'border-border-strong'}`}
                />
             </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest">Seal Date</label>
            <input 
              type="date"
              value={sealDate}
              onChange={(e) => setSealDate(e.target.value)}
              className="w-full bg-background border border-border-strong rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-4 flex gap-3">
             <button type="button" onClick={onCancel} className="flex-1 bg-surface hover:bg-surface-hover text-foreground py-2 rounded-xl text-xs font-bold uppercase transition-all">İptal</button>
             <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-foreground py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2">
               <Save size={14} />
               Kaydet
             </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
