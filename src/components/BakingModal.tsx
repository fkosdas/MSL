import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MSLLevel, BakeTemp, Malzeme, CabinetConfig } from '../types';
import { X, Layers } from 'lucide-react';
import { dataService } from '../dataService';

interface Props {
  malzeme: Malzeme;
  onConfirm: (settings: { mslSeviyesi: MSLLevel, kalinlik: number, temp: BakeTemp, row: number, col: number }) => void;
  onCancel: () => void;
}

export const BakingModal: React.FC<Props> = ({ malzeme, onConfirm, onCancel }) => {
  const [msl, setMsl] = useState<MSLLevel | ''>(malzeme.mslSeviyesi === 'N/A' ? '' : (malzeme.mslSeviyesi || ''));
  const [kalinlik, setKalinlik] = useState<number | ''>(malzeme.kalinlik === 0 ? '' : (malzeme.kalinlik || ''));
  const [temp, setTemp] = useState<BakeTemp>(125);
  const [row, setRow] = useState<number | null>(null);
  const [col, setCol] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configs, setConfigs] = useState<CabinetConfig[]>([]);

  useEffect(() => {
    setConfigs(dataService.getCabinetConfigs());
  }, []);

  const ovenConfig = configs.find(c => c.id === 'OVEN_1');
  const rows = ovenConfig?.rows || 3;
  const cols = ovenConfig?.cols || 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msl) {
      setError('Lütfen MSL seviyesi seçin.');
      return;
    }
    if (msl === '1') {
      setError('MSL 1 seviyesindeki malzemeler fırınlanamaz.');
      return;
    }
    if (!kalinlik || kalinlik <= 0) {
      setError('Kalınlık bilgisi eksik (0). Fırınlama için kalınlık girilmesi zorunludur.');
      return;
    }
    if (row === null || col === null) {
      setError('Lütfen fırın içi raf (satır x sütun) seçimi yapın.');
      return;
    }
    onConfirm({ mslSeviyesi: msl as MSLLevel, kalinlik: Number(kalinlik), temp, row, col });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border-strong rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-surface/50 shrink-0">
          <h3 className="text-base font-bold text-foreground uppercase tracking-tight">Fırınlama Ayarları</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors" type="button">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold animate-pulse">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-dim-foreground">Parça / Barkod</label>
            <div className="font-mono text-sm text-blue-400 bg-background px-3 py-2 rounded border border-border">
              {malzeme.parcaNo} <br/>
              <span className="text-dim-foreground text-xs">{malzeme.barkod}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dim-foreground flex justify-between">
                <div>
                    MSL Seviyesi
                    {!msl && <span className="text-[8px] text-red-500 ml-2">Zorunlu!</span>}
                </div>
                {malzeme.mslSeviyesi === '1' && <span className="text-[8px] text-orange-500">Kontrol Et!</span>}
              </label>
              <select 
                value={msl}
                onChange={(e) => {
                  setMsl(e.target.value as MSLLevel | '');
                  setError(null);
                }}
                className={`w-full bg-background border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 font-bold transition-colors ${
                  !msl ? 'border-red-500/50 focus:ring-red-500 bg-red-500/5' : 'border-border-strong focus:ring-blue-500'
                }`}
              >
                <option value="" disabled>Seçiniz...</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="2a">Level 2a</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
                <option value="5">Level 5</option>
                <option value="5a">Level 5a</option>
                <option value="6">Level 6</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dim-foreground flex justify-between">
                Kalınlık (mm)
                {(kalinlik === '' || kalinlik <= 0) && <span className="text-[8px] text-red-500">Zorunlu!</span>}
              </label>
              <input 
                type="number"
                step="0.1"
                min="0.1"
                value={kalinlik}
                onChange={(e) => {
                  setKalinlik(e.target.value === '' ? '' : Number(e.target.value));
                  setError(null);
                }}
                className={`w-full bg-background border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 font-mono transition-colors ${
                  kalinlik === '' || kalinlik <= 0 
                    ? 'border-red-500/50 focus:ring-red-500 focus:border-red-500 bg-red-500/5' 
                    : 'border-border-strong focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-widest text-dim-foreground flex items-center gap-2">
                <Layers size={14} className="text-blue-400" /> Raf Seçimi (Satır x Sütun)
                </label>
                {(row === null || col === null) && <span className="text-[8px] text-red-500 font-bold uppercase tracking-widest">Zorunlu!</span>}
            </div>
            <div 
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: rows }, (_, r) => 
                Array.from({ length: cols }, (_, c) => {
                  const rNum = r + 1;
                  const cNum = c + 1;
                  const isSelected = row === rNum && col === cNum;
                  return (
                    <button
                      key={`${rNum}-${cNum}`}
                      type="button"
                      onClick={() => {
                        setRow(rNum);
                        setCol(cNum);
                      }}
                      className={`h-10 rounded-lg font-mono text-[10px] font-bold flex items-center justify-center transition-all border ${
                        isSelected 
                          ? 'bg-blue-600 border-blue-500 text-foreground shadow-lg shadow-blue-500/20' 
                          : 'bg-background border-border text-dim-foreground hover:border-slate-600 font-bold'
                      }`}
                    >
                      {rNum},{cNum}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-dim-foreground">Fırınlama Sıcaklığı</label>
            <div className="grid grid-cols-4 gap-2">
              {[125, 90, 60, 40].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTemp(t as BakeTemp)}
                  className={`py-2 rounded text-xs font-bold transition-all border ${
                    temp === t 
                      ? 'bg-blue-600 border-blue-500 text-foreground shadow-lg shadow-blue-900/40' 
                      : 'bg-surface border-border-strong text-muted-foreground hover:border-slate-600'
                  }`}
                >
                  {t}°C
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 bg-surface hover:bg-surface-hover text-muted-foreground py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-all"
            >
              Vazgeç
            </button>
            <button 
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-foreground py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-blue-900/30 border border-blue-500/30"
            >
              Fırına Ver
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
