import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  onScan: (barkod: string) => void;
  searchFilter: string;
  setSearchFilter: (filter: string) => void;
  loading: boolean;
  error: string | null;
}

export const BarcodeScanner: React.FC<Props> = ({ 
  onScan, 
  searchFilter, 
  setSearchFilter, 
  loading, 
  error 
}) => {
  const [barkod, setBarkod] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barkod.trim().toUpperCase();
    if (!query) {
      setSearchFilter('');
      return;
    }
    onScan(query);
    setBarkod('');
  };

  return (
    <div className="px-6 py-4 shrink-0 z-0">
      <form onSubmit={handleSubmit} className="max-w-4xl flex gap-3">
        <div className="relative flex-1 group">
           <input
            id="barkod"
            type="text"
            autoFocus
            value={barkod}
            onChange={(e) => setBarkod(e.target.value)}
            placeholder="Barkod okutun veya aramayı temizlemek için boş bırakın..."
            className="w-full bg-card/80 border border-border-strong rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 font-mono transition-all placeholder:text-dim-foreground uppercase shadow-inner"
          />
          <div className="absolute right-3 top-3.5 text-[9px] bg-surface text-muted-foreground px-1.5 py-0.5 rounded font-bold uppercase tracking-wider hidden sm:block border border-border-strong">OTO</div>
          <div className="absolute inset-x-0 bottom-0 h-[100%] rounded-lg pointer-events-none ring-1 ring-inset ring-white/5 group-focus-within:ring-white/10 transition-all"></div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-foreground px-8 py-3 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : 'Scan'}
        </button>
      </form>
      {searchFilter && (
        <div className="mt-4 flex items-center gap-3">
           <div className="text-xs text-muted-foreground font-bold uppercase">Active Filter:</div>
           <div className="text-sm font-mono bg-blue-900/40 text-blue-300 px-3 py-1 rounded-full border border-blue-500/30 shadow-inner flex items-center gap-2">
             {searchFilter}
             <button onClick={() => setSearchFilter('')} className="bg-blue-800/50 hover:bg-blue-700/50 rounded-full p-0.5" title="Clear Filter">
               <AlertCircle size={14} className="text-blue-300" />
             </button>
           </div>
        </div>
      )}
      {error && (
        <div className="mt-3 p-3 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 text-xs font-medium flex items-center gap-2 max-w-4xl shadow-inner">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};
