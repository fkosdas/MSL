import React, { useState, useEffect } from 'react';
import { CabinetId, Malzeme, CabinetConfig, SolderPaste } from '../types';
import { Thermometer, Droplets, Layers, Package, Factory, Warehouse, Snowflake } from 'lucide-react';
import { dataService } from '../dataService';

interface CabinetProps {
  id: CabinetId;
  name: string;
  temp?: number;
  hum?: number;
  items: { row?: number | null; col?: number | null; location: CabinetId }[];
  rows?: number;
  cols?: number;
  onFilter: (id: CabinetId | 'ALL') => void;
  isActive: boolean;
}

const CabinetCard: React.FC<CabinetProps> = ({ id, name, temp, hum, items, rows, cols, onFilter, isActive }) => {
  const isFloor = id === 'DEPO' || id === 'URETIM';
  const isSolderCooler = id === 'DRY_CABINET_1';

  const getIcon = () => {
    if (id === 'DEPO') return <Warehouse size={14} />;
    if (id === 'URETIM') return <Factory size={14} />;
    if (isSolderCooler) return <Snowflake size={14} className="text-blue-400" />;
    return <Layers size={14} />;
  };

  return (
    <div 
      onClick={() => onFilter(isActive ? 'ALL' : id)}
      className={`relative overflow-hidden rounded-lg border transition-all cursor-pointer w-full ${
        isActive 
          ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/10' 
          : 'bg-card/40 border-border/50 hover:border-border-strong'
      }`}
    >
      <div className="p-3 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <div className={`transition-colors ${isActive ? 'text-blue-400' : 'text-dim-foreground'}`}>
              {getIcon()}
            </div>
            <div>
              <h3 className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-blue-400' : 'text-muted-foreground'}`}>{name}</h3>
              {isSolderCooler && <p className="text-[7px] text-blue-500/70 font-bold uppercase tracking-tighter">Lehim Soğutucu</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 bg-background px-1.5 py-0.5 rounded border border-border">
             <Package size={10} className="text-dim-foreground" />
             <span className="text-[10px] font-mono font-bold text-foreground">{items.length}</span>
          </div>
        </div>

        {!isFloor && (
          <div className="flex gap-3 mb-2 px-1">
             <div className="flex items-center gap-1">
                <Thermometer size={10} className="text-orange-500/70" />
                <span className="text-[10px] font-mono text-muted-foreground">{temp?.toFixed(1) || '--'}°</span>
             </div>
             <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                <Droplets size={10} className="text-blue-400/70" />
                <span>{hum?.toFixed(1) || '--'}%</span>
             </div>
          </div>
        )}

        {rows && cols && (
           <div className="pt-2 border-t border-border/30">
              <div 
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                  {Array.from({ length: rows }, (_, r) => 
                    Array.from({ length: cols }, (_, c) => {
                      const row = r + 1;
                      const col = c + 1;
                      const hasItem = items.some(m => m.row === row && m.col === col);
                      return (
                         <div 
                          key={`${row}-${col}`} 
                          className={`h-1.5 rounded-[1px] transition-colors ${hasItem ? 'bg-blue-500' : 'bg-muted-foreground/30'}`}
                          title={`Raf ${row},${col}: ${hasItem ? 'Dolu' : 'Boş'}`}
                         ></div>
                      );
                    })
                  )}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

interface Props {
  locationFilter: CabinetId | 'ALL';
  setLocationFilter: (loc: CabinetId | 'ALL') => void;
  malzemeler: Malzeme[];
  solderPastes?: SolderPaste[];
  sensorData: Record<string, { temp: number, hum: number }>;
}

export const CabinetGrid: React.FC<Props> = ({ 
  locationFilter, 
  setLocationFilter, 
  malzemeler, 
  solderPastes = [],
  sensorData 
}) => {
  const [configs, setConfigs] = useState<CabinetConfig[]>([]);

  useEffect(() => {
    setConfigs(dataService.getCabinetConfigs());
  }, []);

  const cabinets: { id: CabinetId; name: string }[] = [
    { id: 'DEPO', name: 'Depo' },
    { id: 'URETIM', name: 'Üretim' },
    { id: 'DRY_CABINET_1', name: 'Lehim Dolabı' },
    { id: 'DRY_CABINET_2', name: 'Nem Dolabı' },
    { id: 'OVEN_1', name: 'Kürleme Dolabı' }
  ];

  return (
    <div className="p-3 z-0">
      <div className="flex flex-col gap-2">
        {cabinets.map((cab) => {
          const config = configs.find(c => c.id === cab.id);
          const cabinItems = [
            ...malzemeler.filter(m => m.location === cab.id),
            ...solderPastes.filter(p => p.location === cab.id)
          ];
          
          return (
            <CabinetCard
              key={cab.id}
              id={cab.id}
              name={cab.name}
              isActive={locationFilter === cab.id}
              onFilter={setLocationFilter}
              items={cabinItems}
              temp={sensorData[cab.id]?.temp}
              hum={sensorData[cab.id]?.hum}
              rows={config?.rows}
              cols={config?.cols}
            />
          );
        })}
      </div>
    </div>
  );
};
