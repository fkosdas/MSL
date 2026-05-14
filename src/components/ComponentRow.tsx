import React, { useState, useEffect } from 'react';
import { Malzeme, BakeTemp, CabinetId, MSLLevel, CabinetConfig } from '../types';
import { mslEngine, HesaplamaSonucu } from '../mslEngine';
import { dataService } from '../dataService';
import { BakingModal } from './BakingModal';
import { ShelfSelectorModal } from './ShelfSelectorModal';
import { TakeOutModal } from './TakeOutModal';
import { EditMaterialModal } from './EditMaterialModal';
import { Edit2 } from 'lucide-react';

interface Props {
  malzeme: Malzeme;
  onUpdate: (updated: Malzeme) => void;
  simulatedNow?: number;
  onLog: (l: any) => void;
}

export const ComponentRow: React.FC<Props> = ({ malzeme, onUpdate, simulatedNow, onLog }) => {
  const [hesaplama, setHesaplama] = useState<HesaplamaSonucu | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDryCabinet, setSelectedDryCabinet] = useState<CabinetId>('DRY_CABINET_1');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBakeModal, setShowBakeModal] = useState(false);
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [showTakeOutModal, setShowTakeOutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [configs, setConfigs] = useState<CabinetConfig[]>([]);

  useEffect(() => {
    setConfigs(dataService.getCabinetConfigs());
    const update = () => {
      setHesaplama(mslEngine.hesapla(malzeme, simulatedNow));
    };
    
    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [malzeme, simulatedNow]);

  if (!hesaplama) return null;

  const getRowStyle = () => {
    switch(hesaplama.renkDurumu) {
      case 'red': return 'bg-red-500/5 border-l-2 border-l-red-500';
      case 'yellow': return 'bg-orange-500/5 border-l-2 border-l-orange-500';
      case 'orange': return 'bg-orange-600/10 border-l-2 border-l-orange-600';
      case 'green': return 'hover:bg-surface/20 border-l-2 border-l-transparent';
      case 'blue': return 'bg-blue-500/10 border-l-2 border-l-blue-500';
      case 'purple': return 'bg-purple-500/10 border-l-2 border-l-purple-500';
      default: return 'hover:bg-surface/20 border-l-2 border-l-transparent';
    }
  };

  const getStatusColor = () => {
    switch(hesaplama.renkDurumu) {
      case 'red': return 'text-red-500';
      case 'yellow': return 'text-orange-400';
      case 'orange': return 'text-orange-500';
      case 'green': return 'text-green-500';
      case 'blue': return 'text-blue-400';
      case 'purple': return 'text-purple-400';
      default: return 'text-muted-foreground';
    }
  };

  const getProgressColor = () => {
    switch(hesaplama.renkDurumu) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-orange-500';
      case 'orange': return 'bg-orange-500';
      case 'green': return 'bg-green-500';
      case 'blue': return 'bg-blue-400';
      case 'purple': return 'bg-purple-400';
      default: return 'bg-slate-500';
    }
  };

  const formatKalanZaman = () => {
    if (hesaplama.kalanZamanMs === null) return 'SINIRSIZ';
    if (hesaplama.kalanZamanMs <= 0) return '00s 00d 00sn';

    const h = Math.floor(hesaplama.kalanZamanMs / (1000 * 60 * 60));
    const m = Math.floor((hesaplama.kalanZamanMs % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((hesaplama.kalanZamanMs % (1000 * 60)) / 1000);

    return `${h.toString().padStart(2, '0')}s ${m.toString().padStart(2, '0')}d ${s.toString().padStart(2, '0')}sn`;
  };
  
  const formatLocation = (loc?: CabinetId) => {
      switch(loc) {
          case 'DRY_CABINET_1': return 'Lehim Dolabı';
          case 'DRY_CABINET_2': return 'Nem Dolabı';
          case 'OVEN_1': return 'Kürleme Dolabı';
          case 'DEPO': return 'Depo';
          case 'URETIM': return 'Üretim';
          default: return 'Bilinmiyor';
      }
  };

  const percentage = hesaplama.toplamZamanMs && hesaplama.kalanZamanMs !== null 
    ? Math.max(0, Math.min(100, (hesaplama.kalanZamanMs / hesaplama.toplamZamanMs) * 100)) 
    : 100;

  const handleShelfConfirm = async (row: number, col: number) => {
    setLoading(true);
    let currentSessionMs = 0;
    const nowValue = simulatedNow || Date.now();
    if (malzeme.acilisZamani) {
       currentSessionMs = nowValue - new Date(malzeme.acilisZamani).getTime();
    }
    const updates: Partial<Malzeme> = {
      durum: 'DRY_CABINET',
      acilisZamani: null,
      kullanilanZamanMs: (malzeme.kullanilanZamanMs || 0) + currentSessionMs,
      location: selectedDryCabinet,
      row: row,
      col: col
    };
    
    const res = await dataService.updateMalzeme(malzeme.barkod, updates);
    if (res) {
        onLog({
           barkod: malzeme.barkod,
           stokAdi: malzeme.parcaNo || malzeme.STOK_KODU || '',
           islemTipi: 'Dolaba Kondu',
           eskiDeger: malzeme.location,
           yeniDeger: updates.location,
           detay: `Temsili Dolap (${selectedDryCabinet === 'DRY_CABINET_1' ? 'Lehim Dolabı' : selectedDryCabinet === 'DRY_CABINET_2' ? 'Nem Dolabı' : selectedDryCabinet}) içerisine koyuldu. Raf: ${row}, Sütun: ${col}`
        });
        onUpdate(res);
    }

    setShowShelfModal(false);
    setLoading(false);
  };

  const handleAction = async (action: 'OPEN' | 'DRY_CABINET' | 'BAKING' | 'SEAL' | 'TRANSFER_TO_PROD', confirmed: boolean | 'PENDING_CONFIRM' = false) => {
    setLoading(true);
    let updates: Partial<Malzeme> = {};
    const nowValue = simulatedNow || Date.now();
    const suAn = new Date(nowValue).toISOString();

    if (action === 'TRANSFER_TO_PROD') {
      updates = {
        location: 'URETIM',
        row: null,
        col: null
      };
    } else if (action === 'OPEN') {
      if (malzeme.durum === 'DRY_CABINET' && !confirmed) {
        setShowTakeOutModal(true);
        setLoading(false);
        return;
      }
      setShowTakeOutModal(false);
      updates = {
        durum: 'OPENED',
        acilisZamani: suAn,
        location: 'URETIM',
        row: null,
        col: null
      };
    } else if (action === 'DRY_CABINET') {
       setLoading(false);
       setShowShelfModal(true);
       return;
    } else if (action === 'BAKING') {
      // Handled by handleBakeConfirm
      return;
    } else if (action === 'SEAL') {
      const isBakingIncomplete = malzeme.durum === 'BAKING' && hesaplama?.kalanZamanMs !== undefined && hesaplama.kalanZamanMs !== null && hesaplama.kalanZamanMs > 0;
      
      if (malzeme.durum === 'BAKING' && !confirmed) {
        setShowTakeOutModal(true);
        setLoading(false);
        return;
      }

      if (isBakingIncomplete && confirmed === 'PENDING_CONFIRM') {
          setShowConfirm(true);
          setShowTakeOutModal(false);
          setLoading(false);
          return;
      }
      setShowConfirm(false);
      setShowTakeOutModal(false);

      updates = {
        durum: 'SEALED',
        acilisZamani: null,
        kullanilanZamanMs: isBakingIncomplete ? malzeme.kullanilanZamanMs : 0,
        firinlamaBaslangicZamani: null,
        bakingTemp: undefined,
        sonFirinlamaZamani: malzeme.durum === 'BAKING' && !isBakingIncomplete ? suAn : malzeme.sonFirinlamaZamani,
        row: null,
        col: null
      };
    }

    const res = await dataService.updateMalzeme(malzeme.barkod, updates);
    if (res) {
        let islemTipi = 'Düzenleme';
        if (action === 'TRANSFER_TO_PROD') islemTipi = 'Üretime Alındı';
        else if (action === 'OPEN') islemTipi = 'Oda Ömrü Başlatıldı';
        else if (action === 'SEAL') islemTipi = (malzeme.durum === 'BAKING' ? 'Fırınlama Bitirildi' : 'Vakumlandı');
        else islemTipi = action;

        onLog({
           barkod: malzeme.barkod,
           stokAdi: malzeme.parcaNo || malzeme.STOK_KODU || '',
           islemTipi,
           eskiDeger: malzeme.location,
           yeniDeger: updates.location || malzeme.location,
           detay: action === 'SEAL' && malzeme.durum === 'BAKING' ? 'Malzeme fırından çıkarıldı ve kullanıma hazır.' : ''
        });
        onUpdate(res);
    }
    setLoading(false);
  };

  const handleBakeConfirm = async (settings: { mslSeviyesi: MSLLevel, kalinlik: number, temp: BakeTemp, row: number, col: number }) => {
    setLoading(true);
    let currentSessionMs = 0;
    const nowValue = simulatedNow || Date.now();
    if (malzeme.acilisZamani) {
       currentSessionMs = nowValue - new Date(malzeme.acilisZamani).getTime();
    }
    
    const updates: Partial<Malzeme> = {
      durum: 'BAKING',
      firinlamaBaslangicZamani: new Date(nowValue).toISOString(),
      bakingTemp: settings.temp,
      mslSeviyesi: settings.mslSeviyesi,
      kalinlik: settings.kalinlik,
      row: settings.row,
      col: settings.col,
      acilisZamani: null,
      kullanilanZamanMs: (malzeme.kullanilanZamanMs || 0) + currentSessionMs,
      location: 'OVEN_1'
    };

    const res = await dataService.updateMalzeme(malzeme.barkod, updates);
    if (res) {
        onLog({
           barkod: malzeme.barkod,
           stokAdi: malzeme.parcaNo || malzeme.STOK_KODU || '',
           islemTipi: 'Fırına Verildi',
           eskiDeger: malzeme.location,
           yeniDeger: updates.location || malzeme.location,
           detay: `Kürleme işlemi başlatıldı. Raf: ${settings.row}, Sütun: ${settings.col}, Ayar: ${settings.temp}°C, Kalınlık: ${settings.kalinlik}mm`
        });
        onUpdate(res);
    }
    setShowBakeModal(false);
    setLoading(false);
  };

  const handleEditConfirm = async (updates: Partial<Malzeme>) => {
    setLoading(true);
    const res = await dataService.updateMalzeme(malzeme.barkod, updates);
    if (res) {
        onLog({
           barkod: malzeme.barkod,
           stokAdi: malzeme.parcaNo || malzeme.STOK_KODU || '',
           islemTipi: 'Bilgi Güncelleme',
           eskiDeger: malzeme.location,
           yeniDeger: updates.location || malzeme.location,
           detay: 'Malzeme bilgileri doğrudan düzenlendi.'
        });
        onUpdate(res);
    }
    setShowEditModal(false);
    setLoading(false);
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 border-b border-border/50 items-center transition-colors ${getRowStyle()}`}>
      {showEditModal && (
        <EditMaterialModal 
          malzeme={malzeme}
          onConfirm={handleEditConfirm}
          onCancel={() => setShowEditModal(false)}
        />
      )}
      {showBakeModal && (
        <BakingModal 
          malzeme={malzeme} 
          onConfirm={handleBakeConfirm} 
          onCancel={() => setShowBakeModal(false)} 
        />
      )}
      {showShelfModal && (
        <ShelfSelectorModal 
          cabinetId={selectedDryCabinet} 
          rows={configs.find(c => c.id === selectedDryCabinet)?.rows || 5}
          cols={configs.find(c => c.id === selectedDryCabinet)?.cols || 2}
          onConfirm={handleShelfConfirm}
          onCancel={() => setShowShelfModal(false)}
        />
      )}
      {showTakeOutModal && (
        <TakeOutModal 
          malzeme={malzeme}
          rows={configs.find(c => c.id === malzeme.location)?.rows || 5}
          cols={configs.find(c => c.id === malzeme.location)?.cols || 2}
          onConfirm={() => {
            if (malzeme.durum === 'BAKING') {
               handleAction('SEAL', (hesaplama?.kalanZamanMs || 0) > 0 ? 'PENDING_CONFIRM' : true);
            } else {
               handleAction('OPEN', true);
            }
          }}
          onCancel={() => setShowTakeOutModal(false)}
        />
      )}
      <div className="md:col-span-3 flex flex-col group relative">
        <div className="flex items-center gap-2">
           <div className="font-mono text-sm text-blue-400">{malzeme.barkod}</div>
           <button 
             onClick={() => setShowEditModal(true)}
             className="p-1 rounded bg-surface text-dim-foreground hover:text-foreground hover:bg-surface-hover opacity-0 group-hover:opacity-100 transition-all border border-border-strong" 
             title="Düzenle"
           >
             <Edit2 size={10} />
           </button>
        </div>
        <div className="text-[10px] text-dim-foreground mt-0.5">{malzeme.parcaNo} &bull; {malzeme.kalinlik}mm</div>
      </div>
      
      <div className="md:col-span-2">
        <span className="px-2 py-0.5 bg-surface rounded text-[10px] font-bold text-muted-foreground uppercase tracking-widest inline-block border border-border-strong">
          SEVİYE {malzeme.mslSeviyesi}
        </span>
        <div className="text-[10px] text-dim-foreground mt-1 uppercase flex items-center gap-2">
          {formatLocation(malzeme.location)}
          {malzeme.row && malzeme.col && (
            <span className="bg-blue-600 text-foreground px-1.5 py-0.5 rounded-sm font-mono font-bold text-[8px]">
              RAF {malzeme.row},{malzeme.col}
            </span>
          )}
        </div>
      </div>
      
      <div className="md:col-span-3">
        <div className={`font-mono text-sm font-bold ${getStatusColor()}`}>{formatKalanZaman()}</div>
        <div className="text-[10px] text-dim-foreground uppercase tracking-wider mt-0.5">
          {hesaplama.toplamZamanMs ? `Toplam: ${hesaplama.toplamZamanMs / (1000 * 60 * 60)}s` : (
             malzeme.durum === 'SEALED' && malzeme.sealDate 
               ? `Mühürlü: ${new Date(malzeme.sealDate).toLocaleDateString()}`
               : 'Sınırsız'
          )}
        </div>
      </div>
      
      <div className="md:col-span-4">
        <div className="flex flex-col gap-1 w-full relative">
            <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden mt-1 shadow-inner">
            <div 
                className={`${getProgressColor()} h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_currentColor]`} 
                style={{ width: `${percentage}%` }}
            ></div>
            </div>
            <div className="flex justify-between items-center mt-1.5 relative">
              <div className="flex flex-col text-[9px] text-dim-foreground uppercase tracking-wider font-medium">
                  {hesaplama.mesaj}
              </div>
              
              <div className={`flex gap-2`}>
                   {malzeme.durum === 'SEALED' && (
                       <>
                         {malzeme.location === 'DEPO' ? (
                            <button disabled={loading} onClick={() => handleAction('TRANSFER_TO_PROD')} className="text-[9px] bg-indigo-600 hover:bg-indigo-500 text-foreground px-2 py-1 rounded font-bold uppercase transition-colors">Üretime Al</button>
                         ) : (
                            <button disabled={loading} onClick={() => handleAction('OPEN')} className="text-[9px] bg-surface hover:bg-surface-hover text-foreground px-2 py-1 rounded font-bold uppercase transition-colors">Oda Ömrü Başlat</button>
                         )}
                         {hesaplama.renkDurumu === 'red' && (
                            <button disabled={loading} onClick={() => setShowBakeModal(true)} className="text-[9px] bg-blue-600 hover:bg-blue-500 text-foreground px-3 py-1 rounded font-bold uppercase transition-colors whitespace-nowrap">Fırına Ver</button>
                         )}
                       </>
                   )}
                   {(malzeme.durum === 'OPENED' || malzeme.durum === 'EXPIRED') && (
                       <>
                         {malzeme.durum === 'OPENED' && (
                             <div className="flex bg-surface rounded overflow-hidden border border-border-strong">
                               <select 
                                  value={selectedDryCabinet} 
                                  onChange={(e) => setSelectedDryCabinet(e.target.value as CabinetId)}
                                  className="bg-transparent text-[9px] text-foreground px-1.5 py-1 font-bold outline-none cursor-pointer"
                               >
                                 <option className="text-foreground bg-card" value="DRY_CABINET_1">Lehim Dolabı</option>
                                 <option className="text-foreground bg-card" value="DRY_CABINET_2">Nem Dolabı</option>
                               </select>
                               <button disabled={loading} onClick={() => handleAction('DRY_CABINET')} className="text-[9px] bg-purple-600 hover:bg-purple-500 text-foreground px-2 py-1 font-bold uppercase transition-colors border-l border-border-strong whitespace-nowrap">Koy</button>
                             </div>
                         )}
                         <button disabled={loading} onClick={() => setShowBakeModal(true)} className="text-[9px] bg-blue-600 hover:bg-blue-500 text-foreground px-3 py-1 rounded font-bold uppercase transition-colors whitespace-nowrap mx-1">Fırına Ver</button>
                       </>
                   )}
                   {malzeme.durum === 'DRY_CABINET' && (
                       <button disabled={loading} onClick={() => handleAction('OPEN')} className="text-[9px] bg-green-600 hover:bg-green-500 text-foreground px-2 py-1 rounded font-bold uppercase transition-colors">Çıkar</button>
                   )}
                   {malzeme.durum === 'BAKING' && !showConfirm && (
                       <button disabled={loading} onClick={() => handleAction('SEAL')} className="text-[9px] bg-surface-hover hover:bg-slate-600 text-foreground px-2 py-1 rounded font-bold uppercase transition-colors">Fırını Bitir</button>
                   )}
                   {showConfirm && (
                       <div className="flex items-center gap-1 bg-red-900/80 p-0.5 rounded border border-red-500/50">
                           <span className="text-[8px] text-foreground font-bold px-1 hidden sm:inline">FIRINI BİTİR?</span>
                           <button disabled={loading} onClick={() => handleAction('SEAL', true)} className="text-[9px] bg-red-600 hover:bg-red-500 text-foreground px-1.5 py-0.5 rounded font-bold uppercase transition-colors">Evet</button>
                           <button disabled={loading} onClick={() => setShowConfirm(false)} className="text-[9px] bg-slate-600 hover:bg-slate-500 text-foreground px-1.5 py-0.5 rounded font-bold uppercase transition-colors">Hayır</button>
                       </div>
                   )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

