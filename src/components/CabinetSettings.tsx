import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, Save, Plus, Minus } from 'lucide-react';
import { CabinetConfig } from '../types';
import { dataService } from '../dataService';

interface Props {
  onClose: () => void;
}

export const CabinetSettings: React.FC<Props> = ({ onClose }) => {
  const [configs, setConfigs] = useState<CabinetConfig[]>([]);

  useEffect(() => {
    setConfigs(dataService.getCabinetConfigs());
  }, []);

  const updateConfig = (id: string, field: 'rows' | 'cols', delta: number) => {
    setConfigs(prev => prev.map(c => 
      c.id === id ? { ...c, [field]: Math.max(1, c[field] + delta) } : c
    ));
  };

  const handleSave = () => {
    dataService.saveCabinetConfigs(configs);
    onClose();
  };

  const getCabinetName = (id: string) => {
    switch(id) {
      case 'DRY_CABINET_1': return 'Lehim Dolabı';
      case 'DRY_CABINET_2': return 'Nem Dolabı';
      case 'OVEN_1': return 'Kürleme Dolabı';
      default: return id;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
      <div className="bg-card border border-border-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground uppercase tracking-tight">Kabin & Raf Ayarları</h3>
              <p className="text-[10px] text-dim-foreground font-bold uppercase tracking-widest">Matris Yapısı (Satır x Sütun) Yönetimi</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {configs.map((config) => (
              <div key={config.id} className="bg-surface/30 border border-border-strong/50 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-tight">{getCabinetName(config.id)}</h4>
                  <div className="text-[10px] font-mono text-blue-500 bg-blue-500/10 px-2 py-1 rounded">
                    {config.rows} SATIR x {config.cols} SÜTUN
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-dim-foreground uppercase tracking-widest pl-1">Satır Sayısı</label>
                    <div className="flex items-center justify-between bg-background rounded-lg p-1 border border-border">
                      <button 
                        onClick={() => updateConfig(config.id, 'rows', -1)}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface rounded transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-mono text-sm font-bold text-foreground">{config.rows}</span>
                      <button 
                        onClick={() => updateConfig(config.id, 'rows', 1)}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface rounded transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-dim-foreground uppercase tracking-widest pl-1">Sütun Sayısı</label>
                    <div className="flex items-center justify-between bg-background rounded-lg p-1 border border-border">
                      <button 
                        onClick={() => updateConfig(config.id, 'cols', -1)}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface rounded transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-mono text-sm font-bold text-foreground">{config.cols}</span>
                      <button 
                        onClick={() => updateConfig(config.id, 'cols', 1)}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface rounded transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Grid */}
                <div className="pt-2">
                   <div 
                    className="grid gap-1"
                    style={{ 
                      gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
                      width: 'fit-content'
                    }}
                   >
                     {Array.from({ length: config.rows * config.cols }, (_, i) => (
                       <div key={i} className="w-4 h-1.5 rounded-full bg-blue-500/20"></div>
                     ))}
                   </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-border flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 bg-surface hover:bg-surface-hover text-muted-foreground py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all"
            >
              Vazgeç
            </button>
            <button 
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-foreground py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-blue-900/40 border border-blue-500/30 flex items-center justify-center gap-2"
            >
              <Save size={14} /> Ayarları Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
