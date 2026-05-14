import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Box, Thermometer, Droplets } from 'lucide-react';
import { HistoryLog } from '../types';
import { dataService } from '../dataService';
import { SOLDER_PASTE_CODES } from '../constants';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { SensorCharts } from './SensorCharts';

export const HistoryPanel: React.FC = () => {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const [activeSubTab, setActiveSubTab] = useState<'MALZEME' | 'LEHIM' | 'SICAKLIK_NEM'>('MALZEME');

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Sort by date descending
          setLogs(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
      })
      .catch(err => console.error("History fetch error", err));

    const handleUpdate = () => {
        fetch('/api/history')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setLogs(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }
          });
    };

    const unsubscribe = dataService.subscribe(handleUpdate);
    return () => unsubscribe();
  }, []);

  const isSolderPaste = (parcaNo: string | undefined) => {
    if (!parcaNo) return false;
    const clean = parcaNo.trim().toUpperCase();
    return Object.keys(SOLDER_PASTE_CODES).some(code => clean.includes(code.toUpperCase()));
  };

  const filteredLogs = logs.filter(log => {
    // Hide periodic sensor updates from the table view
    if (log.islemTipi === 'SENSÖR_GÜNCELLEME') return false;

    const isLehim = isSolderPaste(log.stokAdi);
    
    if (activeSubTab === 'MALZEME' && isLehim) return false;
    if (activeSubTab === 'LEHIM' && !isLehim) return false;

    let match = true;
    if (search) {
      match = log.barkod.toLowerCase().includes(search.toLowerCase()) || 
              (log.stokAdi || '').toLowerCase().includes(search.toLowerCase());
    }
    if (match && filterType !== 'ALL') {
      match = log.islemTipi === filterType;
    }
    return match;
  });

  // Compute unique action types for the filter dropdown based on active tab
  const actionTypes = Array.from(new Set(logs.filter(log => {
      if (log.islemTipi === 'SENSÖR_GÜNCELLEME') return false;
      const isLehim = isSolderPaste(log.stokAdi);
      if (activeSubTab === 'MALZEME' && isLehim) return false;
      if (activeSubTab === 'LEHIM' && !isLehim) return false;
      return true;
  }).map(l => l.islemTipi))).filter(Boolean);

  const getActionColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'FIRINLAMA BAŞLADI':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/20';
      case 'FIRINDAN ÇIKARMA':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
      case 'DOLAPTAN ÇIKARMA':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
      case 'TAKİBE ALINDI':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20';
      case 'KAYIT SİLİNDİ':
        return 'bg-red-500/20 text-red-400 border-red-500/20';
      case 'ÇIKARMA İPTAL':
      case 'İPTAL / DOLABA İADE':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/20';
      case 'HAZIR / ISINDI':
        return 'bg-green-500/20 text-green-400 border-green-500/20';
      default:
        return 'bg-surface text-muted-foreground border-border-strong';
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-3xl overflow-hidden">
      {/* Sub tabs */}
      <div className="shrink-0 px-6 py-3 border-b border-border flex gap-4 bg-background/30">
        <button 
           onClick={() => setActiveSubTab('MALZEME')}
           className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'MALZEME' ? 'bg-blue-600 text-foreground shadow-lg shadow-blue-900/20' : 'text-dim-foreground hover:text-muted-foreground'}`}
        >
          Malzeme Geçmişi
        </button>
        <button 
           onClick={() => setActiveSubTab('LEHIM')}
           className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'LEHIM' ? 'bg-blue-600 text-foreground shadow-lg shadow-blue-900/20' : 'text-dim-foreground hover:text-muted-foreground'}`}
        >
          Lehim Geçmişi
        </button>
        <button 
           onClick={() => setActiveSubTab('SICAKLIK_NEM')}
           className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === 'SICAKLIK_NEM' ? 'bg-blue-600 text-foreground shadow-lg shadow-blue-900/20' : 'text-dim-foreground hover:text-muted-foreground'}`}
        >
          Sıcaklık ve Nem
        </button>
      </div>

      {/* Internal Toolbar */}
      {activeSubTab !== 'SICAKLIK_NEM' && (
        <>
          <div className="shrink-0 p-4 border-b border-border bg-background/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim-foreground" size={16} />
              <input 
                type="text" 
                placeholder="Barkod veya Stok Adı ile Ara..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-dim-foreground focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                <Filter size={14} />
              </div>
              <select 
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="flex-1 sm:w-48 bg-card border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="ALL">Tüm İşlemler</option>
                {actionTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-card/90 backdrop-blur-md border-b border-border z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-dim-foreground uppercase tracking-widest">Tarih</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-dim-foreground uppercase tracking-widest border-l border-border/50">Malzeme</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-dim-foreground uppercase tracking-widest border-l border-border/50">Kullanıcı</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-dim-foreground uppercase tracking-widest border-l border-border/50">İşlem</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-dim-foreground uppercase tracking-widest border-l border-border/50">Detay</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length > 0 ? filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-surface/40 transition-colors group">
                    <td className="px-6 py-4 align-top w-48">
                      <div className="text-xs font-mono text-muted-foreground">
                        {new Date(log.date).toLocaleString('tr-TR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top w-64 border-l border-border/50">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                          <Box size={14} className="text-muted-foreground group-hover:text-blue-400 transition-colors" />
                        </div>
                        <div>
                          <div className="text-xs font-mono font-bold text-blue-400 mb-1">{log.barkod}</div>
                          <div className="text-[10px] text-dim-foreground font-bold uppercase tracking-widest">{log.stokAdi || 'İsimsiz'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top w-48 border-l border-border/50">
                       <div className="text-xs text-muted-foreground">
                         {log.userName || '-'}
                       </div>
                    </td>
                    <td className="px-6 py-4 align-top w-48 border-l border-border/50">
                       <div className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${getActionColor(log.islemTipi)}`}>
                         {log.islemTipi}
                       </div>
                    </td>
                    <td className="px-6 py-4 align-top border-l border-border/50">
                       <div className="text-sm text-muted-foreground">
                         {log.detay}
                       </div>
                       <div className="flex flex-col gap-2 mt-2">
                           {(log.eskiDeger || log.yeniDeger) && (
                             <div className="flex items-center gap-2 text-[10px] font-mono">
                                <span className="text-dim-foreground line-through">{log.eskiDeger || '-'}</span>
                                <span className="text-dim-foreground">→</span>
                                <span className="text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">{log.yeniDeger || '-'}</span>
                             </div>
                           )}
                           {(log.temp !== undefined || log.hum !== undefined) && (
                             <div className="flex items-center gap-3 mt-1">
                                 {log.temp !== undefined && (
                                   <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-md text-orange-400 text-[10px] font-mono font-bold w-fit">
                                     <Thermometer size={12} />
                                     {log.temp.toFixed(1)}°C
                                   </div>
                                 )}
                                 {log.hum !== undefined && (
                                   <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md text-blue-400 text-[10px] font-mono font-bold w-fit">
                                     <Droplets size={12} />
                                     {log.hum.toFixed(1)}%
                                   </div>
                                 )}
                             </div>
                           )}
                       </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-dim-foreground text-sm">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSubTab === 'SICAKLIK_NEM' && (
        logs && logs.length > 0 ? <SensorCharts logs={logs} /> : <div className="p-8 text-center text-dim-foreground">Gösterilecek sensör verisi bulunamadı.</div>
      )}
    </div>
  );
};
