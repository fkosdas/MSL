import React from 'react';
import { ScanLine } from 'lucide-react';
import { CabinetId, Malzeme } from '../types';
import { ComponentRow } from './ComponentRow';

interface Props {
  filteredMalzemeler: Malzeme[];
  locationFilter: CabinetId | 'ALL';
  onUpdateMalzeme: (updated: Malzeme) => void;
  onLog: any;
  simulatedNow?: number;
}

export const ComponentList: React.FC<Props> = ({ 
  filteredMalzemeler, 
  locationFilter,
  onUpdateMalzeme,
  onLog,
  simulatedNow
}) => {
  return (
    <div className="flex-1 overflow-hidden flex flex-col px-6 pb-6">
      <div className="bg-card/50 border border-border rounded-xl h-full flex flex-col shadow-2xl relative overflow-hidden backdrop-blur-sm">
        {/* Subtle top glow */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        
        {/* List Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-border bg-surface/40 text-[10px] font-bold uppercase tracking-widest text-dim-foreground shrink-0">
          <div className="col-span-3">Barcode / P/N</div>
          <div className="col-span-2">MSL & Loc</div>
          <div className="col-span-3">Floor Life Rem.</div>
          <div className="col-span-4">Status Timeline</div>
        </div>
        
        {/* List Items */}
        <div className="flex-1 overflow-y-auto">
           {filteredMalzemeler.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-dim-foreground py-12">
                <div className="w-16 h-16 rounded-full border border-border-strong bg-surface/50 flex items-center justify-center mb-4 shadow-inner">
                  <ScanLine size={24} className="text-dim-foreground" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">No Items Found</p>
                <p className="text-[11px] mt-2 opacity-50 font-mono tracking-wide">
                    {locationFilter === 'ALL' ? 'Awaiting barcode scan input...' : `No items in ${locationFilter}`}
                </p>
              </div>
           ) : (
              <div>
                {filteredMalzemeler.map((malzeme) => (
                  <ComponentRow 
                    key={malzeme.barkod} 
                    malzeme={malzeme} 
                    onUpdate={onUpdateMalzeme}
                    onLog={onLog}
                    simulatedNow={simulatedNow}
                  />
                ))}
              </div>
           )}
        </div>

        {/* Footer */}
        <div className="h-10 border-t border-border flex items-center justify-between px-6 shrink-0 rounded-b-xl bg-card/80">
          <div className="flex gap-6">
            <span className="text-[9px] text-dim-foreground font-bold uppercase tracking-widest">Standard: <span className="text-muted-foreground font-mono">JEDEC J-STD-033</span></span>
          </div>
          <div className="text-[9px] text-dim-foreground font-medium uppercase tracking-wider">
            Visible Items: <span className="text-muted-foreground font-mono">{filteredMalzemeler.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
