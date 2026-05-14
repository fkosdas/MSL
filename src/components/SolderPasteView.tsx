import React, { useState, useEffect } from 'react';
import { SolderPaste } from '../types';
import { dataService } from '../dataService';
import { LayoutDashboard, Thermometer, Clock, Trash2, Edit2, Plus, Box, AlertTriangle } from 'lucide-react';
import { SOLDER_PASTE_CODES, SOLDER_PASTE_THAW_HOURS } from '../constants';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface Props {
  netsisData?: any[];
  onLog?: (log: any) => void;
}

export const SolderPasteView: React.FC<Props> = ({ netsisData = [], onLog }) => {
  const [trackedData, setTrackedData] = useState<SolderPaste[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [deletingPaste, setDeletingPaste] = useState<SolderPaste | null>(null);
  const [cancellingPaste, setCancellingPaste] = useState<SolderPaste | null>(null);

  useEffect(() => {
    const update = () => {
      dataService.getAllSolderPaste().then(setTrackedData);
    };
    update();
    return dataService.subscribe(update);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
       const nowTime = Date.now();
       setNow(nowTime);

       // Auto-ready logic
       trackedData.forEach(paste => {
          if (paste.status === 'WARMING_UP' && paste.outOfCoolerTime) {
             const limitHours = paste.type ? SOLDER_PASTE_THAW_HOURS[paste.type] : 8;
             const limitMs = limitHours * 3600000;
             const elapsed = nowTime - new Date(paste.outOfCoolerTime).getTime();
             if (elapsed >= limitMs) {
                handleUpdateStatus(paste, 'READY');
             }
          }
       });
    }, 1000);
    return () => clearInterval(timer);
  }, [trackedData]);

  const getStatusColor = (paste: SolderPaste) => {
    switch (paste.status) {
      case 'IN_COOLER': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'WARMING_UP': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'READY': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'EXPIRED': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-surface text-muted-foreground';
    }
  };

  const calculateTimeLeft = (paste: SolderPaste) => {
    if (paste.status !== 'WARMING_UP' || !paste.outOfCoolerTime) return null;
    
    const limitHours = paste.type ? SOLDER_PASTE_THAW_HOURS[paste.type] : 8; // default 8
    const limitMs = limitHours * 3600000;
    const elapsed = now - new Date(paste.outOfCoolerTime).getTime();
    const remaining = limitMs - elapsed;
    
    return remaining;
  };

  const formatTime = (ms: number) => {
    const isNegative = ms < 0;
    const abs = Math.abs(ms);
    const h = Math.floor(abs / 3600000);
    const m = Math.floor((abs % 3600000) / 60000);
    const s = Math.floor((abs % 60000) / 1000);
    return `${isNegative ? '-' : ''}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleUpdateStatus = (paste: SolderPaste, nextStatus: SolderPaste['status']) => {
    const updatePayload: SolderPaste = { 
      ...paste,
      status: nextStatus,
      id: paste.id || `sp-${paste.barkod}`,
      parcaNo: paste.parcaNo,
      type: paste.type,
      barkod: paste.barkod, // CRITICAL: ensure barkod is preserved
      location: paste.location || 'DEPO',
      row: paste.row || 1,
      col: paste.col || 1,
      createdAt: paste.createdAt || new Date().toISOString()
    };
    
    if (nextStatus === 'WARMING_UP' && paste.status === 'IN_COOLER') {
      updatePayload.outOfCoolerTime = new Date().toISOString();
    }
    
    const isNew = !trackedData.some(p => p.barkod === paste.barkod);
    if (isNew) {
        if (onLog) {
            onLog({
                barkod: paste.barkod,
                stokAdi: paste.parcaNo,
                islemTipi: 'Takibe Alındı',
                detay: paste.parcaNo + ' (' + paste.type + ') Netsisten takibe alındı.',
                yeniDeger: 'DRY_CABINET_1',
                date: new Date().toISOString()
            });
        } else {
            dataService.createHistoryLog({
                barkod: paste.barkod,
                stokAdi: paste.parcaNo,
                islemTipi: 'Takibe Alındı',
                detay: paste.parcaNo + ' (' + paste.type + ') Netsisten takibe alındı.',
                date: new Date().toISOString()
            });
        }
    }

    dataService.updateSolderPaste(paste.barkod, updatePayload);

    // History logging
    let islem = '';
    let detay = '';
    if (nextStatus === 'WARMING_UP') {
        islem = 'Dolaptan Çıkarma';
        detay = `${paste.parcaNo} (${paste.type}) dolaptan çıkarıldı. Isınma süreci başladı.`;
    } else if (nextStatus === 'READY') {
        islem = 'Hazır / Isındı';
        detay = `${paste.parcaNo} (${paste.type}) ısınma süresi tamamlandı. Hazır durumda.`;
    } else if (nextStatus === 'IN_COOLER') {
        islem = 'İptal / Dolaba İade';
        detay = `${paste.parcaNo} (${paste.type}) dolaba geri konuldu. Isınma iptal edildi.`;
    } else if (nextStatus === 'DELETED') {
        islem = 'Kayıt Silindi';
        detay = `${paste.parcaNo} (${paste.type}) takipten kaldırıldı.`;
    }

    if (islem) {
        if (onLog) {
            onLog({
                barkod: paste.barkod,
                stokAdi: paste.parcaNo,
                islemTipi: islem,
                detay: detay,
                eskiDeger: nextStatus === 'WARMING_UP' ? 'DRY_CABINET_1' : undefined,
                yeniDeger: nextStatus === 'IN_COOLER' ? 'DRY_CABINET_1' : undefined,
                date: new Date().toISOString()
            });
        } else {
            dataService.createHistoryLog({
                barkod: paste.barkod,
                stokAdi: paste.parcaNo,
                islemTipi: islem,
                detay: detay,
                date: new Date().toISOString()
            });
        }
    }
  };

  const handleDeletePaste = (paste: SolderPaste) => {
    handleUpdateStatus(paste, 'DELETED');
    setDeletingPaste(null);
  };

  const isSolderPasteCode = (parcaNo: string | undefined) => {
    if (!parcaNo) return false;
    const clean = parcaNo.trim().toUpperCase();
    return Object.keys(SOLDER_PASTE_CODES).some(code => clean.includes(code.toUpperCase()));
  };

  // Combine tracked data and untracked netsis data
  const data = React.useMemo(() => {
    const trackedBarkods = new Set(trackedData.map(p => p.barkod));
    const untracked = netsisData.filter(item => {
      const barkod = item.barkod || item.SERILOTNO;
      const parcaNo = item.parcaNo || item.STOK_KODU;
      const isLehim = isSolderPasteCode(parcaNo);
      if (isLehim && !trackedBarkods.has(barkod)) {
        return true;
      }
      return false;
    }).map((item): SolderPaste => {
      const barkod = item.barkod || item.SERILOTNO;
      const parcaNo = item.parcaNo || item.STOK_KODU;
      const type = SOLDER_PASTE_CODES[parcaNo] || (isSolderPasteCode(parcaNo) ? 'KURSUNSUZ' : 'KURSUNSUZ'); // fallback
      return {
        id: `sp-netsis-${barkod}`,
        barkod: barkod,
        parcaNo: parcaNo,
        type: type as any,
        status: 'IN_COOLER', // default initial state
        outOfCoolerTime: null,
        location: 'DEPO',
        row: 1,
        col: 1,
        createdAt: new Date().toISOString()
      };
    });

    return [...trackedData, ...untracked].filter(p => p.status !== 'DELETED');
  }, [trackedData, netsisData]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Krem Lehim Takibi</h2>
          <p className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest mt-1">Netsis & Isınma Süreçleri</p>
        </div>
      </div>

      <div className="flex-1 bg-card/30 rounded-3xl border border-border/50 backdrop-blur-sm overflow-hidden flex flex-col shadow-2xl">
        <div className="shrink-0 px-8 py-4 border-b border-border bg-surface/20 grid grid-cols-7 gap-4 text-[10px] font-bold text-dim-foreground uppercase tracking-widest">
          <div>Barkod</div>
          <div className="col-span-2">Lot No / SKT</div>
          <div>Konum</div>
          <div className="text-center">Kalan Süre</div>
          <div className="text-center">Durum</div>
          <div className="text-right">İşlemler</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {data.length > 0 ? (
            data.map(paste => {
               const remainingMs = calculateTimeLeft(paste);
               const isExpired = remainingMs !== null && remainingMs <= 0;

               return (
                  <div key={paste.barkod} className="px-8 border-b border-border/50 hover:bg-surface/30 transition-colors flex items-center min-h-[64px]">
                    <div className="grid grid-cols-7 w-full items-center gap-4">
                      <div className="font-mono text-xs text-blue-400">{paste.barkod}</div>
                      <div className="col-span-2">
                        <span className="text-xs font-bold text-muted-foreground block">{paste.parcaNo}</span>
                        <span className="text-[9px] text-dim-foreground font-bold uppercase tracking-tighter">
                            {paste.type} ({paste.type ? SOLDER_PASTE_THAW_HOURS[paste.type] : 8} SAAT BEKLEME SÜRESİ)
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-bold">{paste.location}</div>
                      <div className="flex justify-center">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isExpired ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse' : 'bg-card border-border'}`}>
                          {isExpired ? <AlertTriangle size={10} /> : <Clock size={10} className={remainingMs !== null ? 'text-orange-400' : 'text-dim-foreground'} />}
                          <span className={`text-[10px] font-mono font-bold ${remainingMs !== null ? (isExpired ? 'text-red-400' : 'text-orange-400') : 'text-dim-foreground'}`}>
                              {remainingMs !== null ? formatTime(remainingMs) : '--:--:--'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <div className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${getStatusColor(paste)}`}>
                          {paste.status === 'IN_COOLER' ? 'DOLAPTA' : paste.status === 'WARMING_UP' ? 'ISINIYOR' : paste.status === 'READY' ? 'HAZIR' : paste.status === 'EXPIRED' ? 'SÜRESİ DOLDU' : paste.status}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        {paste.status === 'IN_COOLER' && (
                          <button 
                            onClick={() => handleUpdateStatus(paste, 'WARMING_UP')}
                            className="px-2 py-1 bg-orange-600/20 text-orange-400 border border-orange-500/20 hover:bg-orange-600/40 rounded-md text-[8px] font-bold uppercase transition-colors"
                          >
                            ÇIKAR
                          </button>
                        )}
                        {paste.status === 'WARMING_UP' && (
                           <button 
                            onClick={() => setCancellingPaste(paste)}
                            className="px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/20 hover:bg-blue-600/40 rounded-md text-[8px] font-bold uppercase transition-colors"
                          >
                            İPTAL
                          </button>
                        )}
                        <button 
                          onClick={() => setDeletingPaste(paste)}
                          className="p-1 px-2 text-red-500/50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
               );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-dim-foreground gap-4">
              <LayoutDashboard size={48} className="opacity-10" />
              <p className="text-sm italic">Aktif krem lehim takibi bulunmuyor...</p>
            </div>
          )}
        </div>
      </div>

      {cancellingPaste && (
        <DeleteConfirmationModal 
          title="İşlemi İptal Et"
          message={`${cancellingPaste.barkod} barkodlu lehimin ısınma sürecini iptal edip dolaba geri koymak istediğinize emin misiniz?`}
          itemIdentifier={cancellingPaste.barkod}
          variant="warning"
          confirmLabel="GERİ KOY"
          onConfirm={() => {
            handleUpdateStatus(cancellingPaste, 'IN_COOLER');
            setCancellingPaste(null);
          }}
          onCancel={() => setCancellingPaste(null)}
        />
      )}

      {deletingPaste && (
        <DeleteConfirmationModal 
          title="Kaydı Sil"
          message={`${deletingPaste.barkod} barkodlu lehimin takip kaydını tamamen silmek istediğinize emin misiniz?`}
          itemIdentifier={deletingPaste.barkod}
          onConfirm={() => handleDeletePaste(deletingPaste)}
          onCancel={() => setDeletingPaste(null)}
        />
      )}
    </div>
  );
};

