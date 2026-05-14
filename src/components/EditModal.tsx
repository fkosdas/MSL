import React, { useState, useEffect } from 'react';
import { Malzeme, CabinetId, CabinetConfig, MSLLevel, BakeTemp } from '../types';
import { X, Save, Box, Flame } from 'lucide-react';
import { getBakingTimeHours } from '../constants';

import { mslEngine } from '../mslEngine';
import { dataService } from '../dataService';

interface Props {
  malzeme: Malzeme;
  malzemeler: Malzeme[];
  action?: string;
  onClose: () => void;
  onSave: (updated: Malzeme) => void;
}

const formatLocalDate = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    const pad4 = (n: number) => n.toString().padStart(4, '0');
    return `${pad4(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const EditModal: React.FC<Props> = ({ malzeme, malzemeler, action, onClose, onSave }) => {
  const defaultLocation = action === 'OVEN' ? 'OVEN_1' : 
                          action === 'DRY_CABINET' ? 'DRY_CABINET_2' : 
                          malzeme.location;
                          
  const defaultDurum = action === 'OVEN' ? 'BAKING' :
                       action === 'DRY_CABINET' ? 'DRY_CABINET' :
                       malzeme.durum;
  
  const [edited, setEdited] = useState<Malzeme>({ 
    ...malzeme,
    location: defaultLocation as any,
    durum: defaultDurum as any,
    mslSeviyesi: ((malzeme.mslSeviyesi || malzeme.MSL?.toString() || '').trim() as MSLLevel) || 'N/A',
    kalinlik: malzeme.kalinlik || malzeme.THICKNESS || 0,
    bakingTemp: malzeme.bakingTemp || 60
  });
  const [sealDateInput, setSealDateInput] = useState<string>(formatLocalDate(malzeme.sealDate));
  const [cabinetConfigs, setCabinetConfigs] = useState<CabinetConfig[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config/cabinets')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCabinetConfigs(data);
        }
      })
      .catch(err => console.error('Error fetching cabinet configurations:', err));
  }, []);

  const handleLocationChange = (loc: CabinetId) => {
      let newDurum = edited.durum;
      if (loc === 'DEPO') newDurum = 'SEALED';
      else if (loc.startsWith('DRY_CABINET')) newDurum = 'DRY_CABINET';
      else if (loc.startsWith('OVEN')) newDurum = 'BAKING';
      else if (loc === 'URETIM') {
          // If moving to URETIM, it could be either SEALED or OPENED, 
          // let's keep existing if it's SEALED or OPENED, else default to OPENED
          if (newDurum !== 'SEALED' && newDurum !== 'OPENED') {
              newDurum = 'OPENED';
          }
      }

      setEdited({
          ...edited, 
          location: loc, 
          row: undefined, 
          col: undefined,
          durum: newDurum,
          // Clear session start if moving to storage or sealed
          acilisZamani: (newDurum === 'OPENED') ? (edited.acilisZamani || new Date().toISOString()) : null
      });
  };

  const selectedCabinetConfig = cabinetConfigs.find(c => c.id === edited.location);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-card border border-border rounded-3xl w-full max-w-2xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Malzeme Düzenle</h3>
            <p className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest">{edited.barkod}</p>
          </div>
          <button onClick={onClose} className="p-2 text-dim-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs font-bold flex items-center justify-between">
              {error}
              <button onClick={() => setError(null)}><X size={14} /></button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest ml-1">Konum</label>
              <select 
                value={edited.location}
                onChange={e => handleLocationChange(e.target.value as CabinetId)}
                disabled={!!action} // Lock if action passed
                className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm text-foreground focus:border-blue-500 outline-none transition-all disabled:opacity-50"
              >
                {!action ? (
                  <>
                    <option value="DEPO">Depo</option>
                    <option value="URETIM">Üretim Sahası</option>
                  </>
                ) : (
                  <>
                    {action === 'OVEN' && <option value="OVEN_1">Kürleme Dolabı</option>}
                    {action === 'DRY_CABINET' && (
                        <>
                           <option value="DRY_CABINET_1">Lehim Dolabı</option>
                           <option value="DRY_CABINET_2">Nem Dolabı</option>
                        </>
                    )}
                  </>
                )}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest ml-1">Durum</label>
              <select 
                value={edited.durum}
                onChange={e => {
                    const newDurum = e.target.value as any;
                    setEdited({
                        ...edited, 
                        durum: newDurum,
                        acilisZamani: (newDurum === 'OPENED') ? (edited.acilisZamani || new Date().toISOString()) : null
                    });
                }}
                disabled={edited.location.startsWith('DRY_CABINET') || edited.location.startsWith('OVEN')}
                className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm text-foreground focus:border-blue-500 outline-none transition-all disabled:opacity-50"
              >
                {edited.location === 'DEPO' && (
                  <option value="SEALED">Mühürlü (Vakum)</option>
                )}
                {edited.location === 'URETIM' && (
                  <>
                    <option value="OPENED">Açık (Kullanımda)</option>
                    <option value="SEALED">Mühürlü (Vakum)</option>
                  </>
                )}
                {edited.location.startsWith('DRY_CABINET') && (
                  <option value="DRY_CABINET">Nem Dolabında (Bekliyor)</option>
                )}
                {edited.location.startsWith('OVEN') && (
                  <option value="BAKING">Fırınlanıyor</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest ml-1 flex justify-between pr-2">
                    <div>Kalınlık (mm)</div>
                    {edited.location.startsWith('OVEN') && (!edited.kalinlik || edited.kalinlik <= 0) && <span className="text-red-500">Zorunlu!</span>}
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={edited.kalinlik || ''} 
                  onChange={e => setEdited({...edited, kalinlik: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                  className={`w-full bg-background border rounded-2xl px-4 py-3 text-sm text-foreground focus:border-blue-500 outline-none transition-all ${edited.location.startsWith('OVEN') && (!edited.kalinlik || edited.kalinlik <= 0) ? 'border-red-500/50 bg-red-500/5' : 'border-border'}`}
                />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest ml-1 flex justify-between pr-2">
                    <div>MSL Seviyesi</div>
                    {edited.location.startsWith('OVEN') && (!edited.mslSeviyesi || edited.mslSeviyesi === 'N/A') && <span className="text-red-500">Zorunlu!</span>}
                </label>
                <select 
                  value={edited.mslSeviyesi} 
                  onChange={e => setEdited({...edited, mslSeviyesi: e.target.value as MSLLevel})}
                  className={`w-full bg-background border rounded-2xl px-4 py-3 text-sm text-foreground focus:border-blue-500 outline-none transition-all ${edited.location.startsWith('OVEN') && (!edited.mslSeviyesi || edited.mslSeviyesi === 'N/A') ? 'border-red-500/50 bg-red-500/5' : 'border-border'}`}
                >
                    <option value="" disabled>Seçiniz...</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="2a">2a</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="5a">5a</option>
                    <option value="6">6</option>
                    <option value="N/A">Bilinmiyor (N/A)</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest ml-1">Seal Tarihi</label>
                <input 
                  type="datetime-local" 
                  value={sealDateInput}
                  onChange={e => {
                     const val = e.target.value;
                     setSealDateInput(val);
                     if (val) {
                         const d = new Date(val);
                         if (!isNaN(d.getTime())) {
                             setEdited({...edited, sealDate: d.toISOString()});
                         }
                     } else {
                         setEdited({...edited, sealDate: ''});
                     }
                  }}
                  className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm text-foreground focus:border-blue-500 outline-none transition-all"
                />
             </div>
             {edited.location.startsWith('OVEN') && (
               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest ml-1">Fırın Sıcaklığı</label>
                  <select 
                    value={edited.bakingTemp || 60} 
                    onChange={e => setEdited({...edited, bakingTemp: parseInt(e.target.value) as BakeTemp})}
                    className="w-full bg-background border border-blue-500/50 rounded-2xl px-4 py-3 text-sm text-foreground focus:border-blue-500 outline-none transition-all"
                  >
                      <option value={40}>40 °C</option>
                      <option value={60}>60 °C</option>
                      <option value={90}>90 °C</option>
                      <option value={125}>125 °C</option>
                  </select>
               </div>
             )}
          </div>

          {edited.location.startsWith('OVEN') && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                   <Flame size={20} className="text-orange-400" />
                </div>
                <div>
                   <h4 className="text-xs font-bold text-foreground uppercase flex items-center gap-2">J-STD-033 Fırınlama Beklentisi</h4>
                   <p className="text-[10px] text-orange-200 uppercase tracking-widest mt-1">SÜRE: <span className="font-mono text-orange-400 font-bold">{getBakingTimeHours(edited.mslSeviyesi, edited.kalinlik, edited.bakingTemp || 60)} SAAT</span></p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Tahmini Bitiş</p>
                <div className="text-xs font-mono font-bold text-orange-300 bg-orange-500/20 px-3 py-1.5 rounded-lg">
                   {new Date((edited.firinlamaBaslangicZamani ? new Date(edited.firinlamaBaslangicZamani).getTime() : Date.now()) + getBakingTimeHours(edited.mslSeviyesi, edited.kalinlik, edited.bakingTemp || 60) * 3600000).toLocaleString('tr-TR')}
                </div>
              </div>
            </div>
          )}

          {selectedCabinetConfig && (
              <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest ml-1 flex items-center justify-between pr-2">
                     <div className="flex items-center gap-2">
                        <Box size={14} /> 
                        Raf Seçici ({selectedCabinetConfig.id.replace(/_/g, ' ')})
                     </div>
                     {edited.location.startsWith('OVEN') && (edited.row === undefined || edited.col === undefined) && <span className="text-red-500">Zorunlu!</span>}
                  </h4>
                  <div className={`bg-background rounded-lg border p-2 ${edited.location.startsWith('OVEN') && (edited.row === undefined || edited.col === undefined) ? 'border-red-500/50 bg-red-500/5' : 'border-border'}`}>
                      <div 
                        className="grid gap-1.5"
                        style={{ 
                          gridTemplateColumns: `repeat(${selectedCabinetConfig.cols}, minmax(0, 1fr))` 
                        }}
                      >
                        {Array.from({ length: selectedCabinetConfig.rows * selectedCabinetConfig.cols }).map((_, idx) => {
                          const r = Math.floor(idx / selectedCabinetConfig.cols) + 1;
                          const c = (idx % selectedCabinetConfig.cols) + 1;
                          
                          // Check if occupied by another item
                          const occupier = malzemeler.find(m => m.location === selectedCabinetConfig.id && m.row === r && m.col === c);
                          const isOccupied = occupier && occupier.barkod !== edited.barkod;
                          const isSelected = edited.row === r && edited.col === c;

                          return (
                            <button
                              key={`${r}-${c}`}
                              onClick={() => {
                                  if (!isOccupied) setEdited({ ...edited, row: r, col: c });
                              }}
                              disabled={!!isOccupied}
                              className={`
                                aspect-square rounded-md border flex items-center justify-center transition-all text-[8px] font-bold uppercase p-1
                                ${isOccupied ? 'bg-red-500/10 border-red-500/30 text-red-400 cursor-not-allowed opacity-50' : 
                                  isSelected ? 'bg-blue-600 border-blue-500 text-foreground shadow-lg shadow-blue-500/20' : 
                                  'bg-card border-border hover:border-blue-500/50 text-dim-foreground hover:text-foreground cursor-pointer'}
                              `}
                            >
                                {`${r}-${c}`}
                            </button>
                          );
                        })}
                      </div>
                  </div>
              </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest ml-1">Açıklama</label>
            <textarea 
              disabled
              value={edited.description || ''}
              className="w-full bg-background/50 border border-border/50 rounded-2xl px-4 py-3 text-sm text-muted-foreground min-h-[80px] outline-none transition-all resize-none cursor-not-allowed"
              placeholder="Malzeme hakkında notlar..."
            />
          </div>
        </div>

        <div className="p-6 border-t border-border bg-surface/20 flex gap-4">
          <button 
            onClick={() => {
                setError(null);
                if (edited.location.startsWith('OVEN')) {
                    if (!edited.mslSeviyesi || edited.mslSeviyesi === 'N/A') {
                        setError('Fırına ürün koymak için MSL seviyesi zorunludur.');
                        return;
                    }
                    if (edited.mslSeviyesi === '1') {
                        setError('MSL 1 seviyesindeki malzemeler fırınlanamaz.');
                        return;
                    }
                    if (!edited.kalinlik || edited.kalinlik <= 0) {
                        setError('Fırına ürün koymak için geçerli bir kalınlık (0\'dan büyük) girilmesi zorunludur.');
                        return;
                    }
                    if (edited.row === undefined || edited.col === undefined) {
                        setError('Lütfen fırın içi raf (satır x sütun) seçimi yapın.');
                        return;
                    }
                }

                // If moving to OPENED, start tracking
                const update = {...edited};
                // Update usage if coming from OPENED
                if (malzeme.durum === 'OPENED' && update.durum !== 'OPENED') {
                   const result = mslEngine.hesapla(malzeme, Date.now());
                   if (result.toplamZamanMs && result.toplamZamanMs > 0) {
                      update.kullanilanZamanMs = result.toplamZamanMs - Math.max(0, result.kalanZamanMs || 0);
                   }
                }

                if (update.durum === 'OPENED' && update.durum !== malzeme.durum) {
                    update.acilisZamani = new Date().toISOString();
                } else if (update.durum === 'SEALED') {
                    update.acilisZamani = null;
                } else if (update.durum === 'BAKING') {
                    // Update baking times dynamically (or if newly entering bake)
                    if (update.durum !== malzeme.durum) {
                         update.firinlamaBaslangicZamani = new Date().toISOString();
                    }
                    const startMs = update.firinlamaBaslangicZamani ? new Date(update.firinlamaBaslangicZamani).getTime() : Date.now();
                    const reqHours = getBakingTimeHours(update.mslSeviyesi, update.kalinlik, update.bakingTemp || 60);
                    update.firinlamaBitisZamani = new Date(startMs + reqHours * 3600000).toISOString();
                }

                // Handling completion of BAKING is done in TakeOutModal primarily
                // However, just in case user forces it from here (e.g. from DEPO/URETIM selection manually):
                if (malzeme.durum === 'BAKING' && update.durum !== 'BAKING') {
                    const result = mslEngine.hesapla(malzeme, Date.now());
                    if (result.kalanZamanMs !== null && result.kalanZamanMs <= 0) {
                        update.kullanilanZamanMs = 0;
                        update.sonFirinlamaZamani = new Date().toISOString();
                    }
                    update.acilisZamani = update.durum === 'OPENED' ? new Date().toISOString() : null;
                    update.firinlamaBaslangicZamani = null;
                    update.firinlamaBitisZamani = null;
                }

                // Log History
                if (update.durum !== malzeme.durum || update.location !== malzeme.location) {
                    let islem = 'Konum/Durum Değişikliği';
                    let detay = `${malzeme.location || 'Bilinmiyor'} konumundan ${update.location}'a taşındı.`;
                    
                    if (malzeme.durum === 'SEALED' && update.durum === 'OPENED') {
                        islem = 'Paket Açıldı';
                        detay = 'Vakumlu paket açılarak üretime alındı.';
                    } else if (update.durum === 'BAKING' && malzeme.durum !== 'BAKING') {
                        islem = 'Fırınlama Başladı';
                        detay = `${update.bakingTemp || 60}°C sıcaklıkta fırınlamaya alındı.`;
                    }

                    dataService.createHistoryLog({
                        barkod: update.barkod,
                        stokAdi: update.parcaNo || update.STOK_KODU || '',
                        islemTipi: islem,
                        eskiDeger: malzeme.durum !== update.durum ? malzeme.durum : malzeme.location,
                        yeniDeger: malzeme.durum !== update.durum ? update.durum : update.location,
                        detay: detay
                    });
                }

                onSave(update);
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-foreground rounded-2xl py-4 text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
          >
            <Save size={14} />
            Güncellemeleri Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};
