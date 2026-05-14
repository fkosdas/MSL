import React from 'react';
import { FastForward, Rewind, Play, Pause, RotateCcw, Clock } from 'lucide-react';

interface Props {
  timeOffset: number;
  setTimeOffset: (val: number | ((prev: number) => number)) => void;
  isPaused: boolean;
  setIsPaused: (val: boolean) => void;
}

export const DemoController: React.FC<Props> = ({ timeOffset, setTimeOffset, isPaused, setIsPaused }) => {
  const formatOffset = () => {
    const hours = Math.floor(Math.abs(timeOffset) / (1000 * 60 * 60));
    const minutes = Math.floor((Math.abs(timeOffset) % (1000 * 60 * 60)) / (1000 * 60));
    const prefix = timeOffset >= 0 ? '+' : '-';
    return `${prefix}${hours}s ${minutes}dk`;
  };

  const addTime = (hours: number) => {
    setTimeOffset(prev => prev + hours * 60 * 60 * 1000);
  };

  const resetTime = () => {
    setTimeOffset(0);
    setIsPaused(false);
  };

  return (
    <div className="fixed bottom-6 left-6 z-[100] animate-in slide-in-from-bottom duration-500">
      <div className="bg-card/80 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 min-w-[240px]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">DEMO KONTROL</h4>
          </div>
          <button 
            onClick={resetTime}
            className="p-1.5 hover:bg-surface rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Zamanı Sıfırla"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="flex items-center justify-between bg-background/50 p-3 rounded-xl border border-border">
          <div className="flex flex-col">
            <span className="text-[8px] text-dim-foreground font-bold uppercase tracking-widest">Zaman Kayması</span>
            <span className={`text-sm font-mono font-bold ${timeOffset >= 0 ? 'text-amber-400' : 'text-blue-400'}`}>
              {formatOffset()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className={`p-2 rounded-lg transition-all ${isPaused ? 'bg-amber-600/20 text-amber-500' : 'bg-surface text-muted-foreground hover:text-foreground'}`}
            >
              {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
           <button 
             onClick={() => addTime(-24)}
             className="flex flex-col items-center gap-1 p-2 bg-surface hover:bg-surface-hover rounded-lg text-muted-foreground hover:text-foreground transition-all border border-border-strong"
           >
             <Rewind size={14} />
             <span className="text-[8px] font-bold">-24s</span>
           </button>
           <button 
             onClick={() => addTime(1)}
             className="flex flex-col items-center gap-1 p-2 bg-amber-600/10 hover:bg-amber-600/20 rounded-lg text-amber-500 transition-all border border-amber-500/20"
           >
             <FastForward size={14} />
             <span className="text-[8px] font-bold">+1s</span>
           </button>
           <button 
             onClick={() => addTime(24)}
             className="flex flex-col items-center gap-1 p-2 bg-amber-600/20 hover:bg-amber-600/30 rounded-lg text-amber-400 transition-all border border-amber-500/20"
           >
             <FastForward size={14} />
             <span className="text-[8px] font-bold">+24s</span>
           </button>
        </div>

        <p className="text-[8px] text-dim-foreground text-center font-medium leading-tight">
          Bu panel sadece test amaçlıdır.<br/>Gerçek operasyonda zaman otomatik akar.
        </p>
      </div>
    </div>
  );
};
