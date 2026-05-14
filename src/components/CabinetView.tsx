import React, { useState, useEffect } from 'react';
import { CabinetId, CabinetConfig, Malzeme } from '../types';
import { dataService } from '../dataService';
import { Box, Thermometer, Droplets, LayoutGrid, Search, X } from 'lucide-react';

interface Props {
  malzemeler: Malzeme[];
}

export const CabinetView: React.FC<Props> = ({ malzemeler }) => {
  const [configs, setConfigs] = useState<CabinetConfig[]>([]);
  const [sensors, setSensors] = useState<Record<string, { temp: number, hum: number }>>({});
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ cabinetId: CabinetId, row: number, col: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [removeTargetLocation, setRemoveTargetLocation] = useState<string>('DEPO');

  useEffect(() => {
    // Fetch cabinet configs from API
    fetch('/api/config/cabinets')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setConfigs(data);
        }
      })
      .catch(err => console.error('Error fetching cabinet configurations:', err));
    
    const fetchSensors = async () => {
      setLoading(true);
      const data = await dataService.getSensorData();
      setSensors(data);
      setLoading(false);
    };

    fetchSensors();
    const interval = setInterval(fetchSensors, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleRemove = async (barkod: string) => {
    const item = malzemeler.find(m => m.barkod === barkod);
    if (item) {
      let targetDurum = 'SEALED';
      let realTargetLocation = removeTargetLocation;

      if (removeTargetLocation === 'URETIM_OPENED') {
          targetDurum = 'OPENED';
          realTargetLocation = 'URETIM';
      } else if (removeTargetLocation === 'URETIM_SEALED') {
          targetDurum = 'SEALED';
          realTargetLocation = 'URETIM';
      }

      const updated: any = {
        ...item,
        location: realTargetLocation as any,
        row: undefined,
        col: undefined,
        durum: targetDurum as any
      };

      if (item.location === 'OVEN_1' || item.durum === 'BAKING') {
         const { mslEngine } = await import('../mslEngine');
         const res = mslEngine.hesapla(item, Date.now());
         const bakingFinished = res.kalanZamanMs !== null && res.kalanZamanMs <= 0;

         if (bakingFinished) {
             updated.kullanilanZamanMs = 0;
             updated.sonFirinlamaZamani = new Date().toISOString();
             if (targetDurum === 'SEALED') {
                 updated.sealDate = new Date().toISOString();
             }
         }
         updated.firinlamaBaslangicZamani = null;
         updated.firinlamaBitisZamani = null;
         if (targetDurum === 'OPENED') {
             updated.acilisZamani = new Date().toISOString();
         }
      } else if (item.durum === 'DRY_CABINET' || item.location.startsWith('DRY_CABINET')) {
         if (targetDurum === 'OPENED') {
             updated.acilisZamani = new Date().toISOString();
         }
      }

      await dataService.updateMalzeme(barkod, updated);

      dataService.createHistoryLog({
          barkod: item.barkod,
          stokAdi: item.parcaNo || item.STOK_KODU || '',
          islemTipi: 'Dolaptan Çıkarma',
          eskiDeger: item.location,
          yeniDeger: removeTargetLocation,
          detay: `${item.location} konumundan çıkarıldı ve ${removeTargetLocation} alanına alındı.`
      });

      setSelectedCell(null);
      setRemoveTargetLocation('DEPO');
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto pr-2 relative">
      {configs.length > 0 ? (
        <div className="flex flex-wrap gap-4 items-start">
          {configs.map(cabinet => {
            const items = malzemeler.filter(m => m.location === cabinet.id);
            const sensor = sensors[cabinet.id] || { temp: 0, hum: 0 };

            return (
              <div key={cabinet.id} className="bg-card/40 border border-border rounded-xl overflow-hidden backdrop-blur-sm flex flex-col shrink-0">
                {/* Cabinet Header */}
                <div className="p-3 border-b border-border bg-surface/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                          <LayoutGrid size={12} className="text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-foreground">
                            {cabinet.id === 'DRY_CABINET_1' ? 'Lehim Dolabı' : 
                             cabinet.id === 'DRY_CABINET_2' ? 'Nem Dolabı' : 
                             cabinet.id === 'OVEN_1' ? 'Kürleme Dolabı' : 
                             (cabinet.id as string).replace(/_/g, ' ')}
                          </h3>
                          <p className="text-[9px] text-dim-foreground font-bold uppercase tracking-widest">{items.length} Malzeme</p>
                        </div>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded md bg-red-500/5 border border-red-500/10">
                      <Thermometer size={8} className="text-red-400" />
                      <span className="text-[9px] font-mono font-bold text-red-300">{sensor.temp}°C</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded md bg-blue-500/5 border border-blue-500/10">
                      <Droplets size={8} className="text-blue-400" />
                      <span className="text-[9px] font-mono font-bold text-blue-300">%{sensor.hum}</span>
                    </div>
                  </div>
                </div>

                {/* Shelf Grid */}
                <div className="p-4 bg-background/50 flex justify-center">
                  <div 
                    className="grid gap-1"
                    style={{ 
                      gridTemplateRows: `repeat(${cabinet.rows}, 40px)`,
                      gridTemplateColumns: `repeat(${cabinet.cols}, 40px)` 
                    }}
                  >
                    {Array.from({ length: cabinet.rows * cabinet.cols }).map((_, idx) => {
                      const r = Math.floor(idx / cabinet.cols) + 1;
                      const c = (idx % cabinet.cols) + 1;
                      const item = items.find(i => i.row === r && i.col === c);

                      const isBaking = item && item.durum === 'BAKING';
                      const cellClasses = item 
                        ? `${isBaking ? 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/80' : 'bg-green-500/10 border-green-500/30 hover:border-blue-500/80'} cursor-pointer`
                        : 'bg-card border-border/50 cursor-default';
                      
                      return (
                        <div 
                          key={`${r}-${c}`}
                          onClick={() => item ? setSelectedCell({ cabinetId: cabinet.id, row: r, col: c }) : undefined}
                          className={`rounded-md border flex flex-col items-center justify-center transition-all overflow-hidden ${cellClasses}`}
                        >
                          {item ? (
                             <span className={`text-[9px] font-mono font-bold ${isBaking ? 'text-orange-400' : 'text-green-400'} truncate w-full px-1 text-center`} title={item.barkod}>{item.barkod?.slice(-4)}</span>
                          ) : (
                            <span className="text-[9px] font-bold text-dim-foreground/50 uppercase tracking-tighter">{r}-{c}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-dim-foreground gap-4 border border-dashed border-border rounded-3xl">
          <LayoutGrid size={48} className="opacity-10" />
          <p className="text-sm italic">Lütfen ayarlar sekmesinden dolap yapılandırmasını yapın</p>
        </div>
      )}

      {selectedCell && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl w-full max-w-sm shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Raf {selectedCell.row}-{selectedCell.col}</h3>
                <p className="text-[10px] text-dim-foreground font-bold uppercase tracking-widest">{selectedCell.cabinetId.replace(/_/g, ' ')}</p>
              </div>
              <button onClick={() => { setSelectedCell(null); setSearchQuery(''); }} className="text-dim-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-4">
              {(() => {
                const itemInCell = malzemeler.find(m => m.location === selectedCell.cabinetId && m.row === selectedCell.row && m.col === selectedCell.col);
                
                if (itemInCell) {
                  return (
                    <div className="space-y-4">
                      <div className="bg-background p-4 rounded-2xl border border-border">
                        <div className="text-[10px] text-dim-foreground font-bold uppercase tracking-widest mb-1">Bulunan Malzeme</div>
                        <div className="text-sm font-mono text-blue-400 break-all">{itemInCell.barkod}</div>
                        <div className="text-xs text-muted-foreground mt-1">{itemInCell.parcaNo || (itemInCell as any).STOK_KODU}</div>
                      </div>
                      {selectedCell.cabinetId.startsWith('OVEN') && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-dim-foreground font-bold uppercase tracking-widest pl-1">Hedef Konum</label>
                          <select 
                            value={removeTargetLocation}
                            onChange={(e) => setRemoveTargetLocation(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                          >
                            <option value="DEPO">Depo Mühürlü</option>
                            <option value="URETIM_SEALED">Üretim Mühürlü</option>
                            <option value="URETIM_OPENED">Üretim Kullanımda</option>
                          </select>
                        </div>
                      )}
                      <button 
                        onClick={() => handleRemove(itemInCell.barkod)}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl py-3 text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        {selectedCell.cabinetId.startsWith('OVEN') ? 'Fırından Çıkar' : 'Raftan Çıkar'}
                      </button>
                    </div>
                  );
                }
                
                return null;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

