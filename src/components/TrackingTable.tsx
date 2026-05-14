import React from 'react';
import { Malzeme } from '../types';
import { TrackingRow } from './TrackingRow';
import { Box } from 'lucide-react';

interface Props {
  data: Malzeme[];
  onEdit: (m: Malzeme) => void;
  onUpdate: (updated: Malzeme) => void;
  simulatedNow: number;
  searchFilter?: string;
  onLog: any;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export const TrackingTable: React.FC<Props> = ({ data, onEdit, onUpdate, simulatedNow, searchFilter, onLog, onLoadMore, hasMore }) => {
  if (!data) {
    return (
      <div className="h-full flex items-center justify-center text-dim-foreground">
        <span className="text-sm italic">Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-card/30 rounded-xl border border-border/50 backdrop-blur-sm overflow-hidden flex flex-col max-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border bg-surface/30 grid grid-cols-12 gap-1 text-[10px] font-bold text-dim-foreground uppercase tracking-widest">
        <div className="col-span-3">Barkod / P/N</div>
        <div className="col-span-3">Açıklama</div>
        <div className="col-span-2">MSL & Konum</div>
        <div className="col-span-2">Kalan Oda Ömrü</div>
        <div className="col-span-2">Zaman Çizelgesi</div>
      </div>

      {/* Body with Standard Scroll */}
      <div key={`table-list-${searchFilter}`} className="flex-1 overflow-y-auto block max-h-[calc(100vh-300px)] min-h-[400px] no-scrollbar pb-20 relative">
        {data && data.length > 0 ? (
          <>
            {data.map((item: any, index: number) => (
              <TrackingRow 
                key={`${item.SERILOTNO || item.barkod || 'row'}-${index}`} 
                malzeme={item} 
                onEdit={onEdit} 
                onUpdate={onUpdate}
                        onLog={onLog}
                simulatedNow={simulatedNow}
                searchFilter={searchFilter}
              />
            ))}
            
            {hasMore && onLoadMore && (
              <div className="p-4 text-center border-t border-border/50 pt-6">
                <button 
                  onClick={onLoadMore} 
                  className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 bg-blue-900/20 hover:bg-blue-900/40 rounded-lg border border-blue-500/20 transition-colors inline-block"
                >
                  Sonraki Kayıtları Yükle...
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-dim-foreground gap-4">
            <Box size={48} className="opacity-20" />
            <span className="text-sm font-bold uppercase tracking-widest text-dim-foreground">Gösterilecek kayıt bulunamadı...</span>
          </div>
        )}
      </div>
    </div>
  );
};
