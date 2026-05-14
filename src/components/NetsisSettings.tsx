import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Server, Database, User, Lock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { NetsisConfig, ConnectionStatus } from '../types';
import { dataService } from '../dataService';

interface Props {
  onClose: () => void;
}

export const NetsisSettings: React.FC<Props> = ({ onClose }) => {
  const [config, setConfig] = useState<NetsisConfig>({
    server: '',
    database: 'NETSIS',
    username: '',
    password: '',
    port: 1433
  });

  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const savedStatus = dataService.getConnectionStatus();

  useEffect(() => {
    const saved = dataService.getNetsisConfig();
    if (saved) setConfig(saved);
    if (savedStatus.connected || savedStatus.error) setStatus(savedStatus);
  }, [savedStatus]);

  const handleTest = async () => {
    setLoading(true);
    await dataService.saveNetsisConfig(config);
    // Connection status will come back via socket.on('netsis-config-updated')
    // which eventually updates dataService state and triggers subscribe
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await dataService.saveNetsisConfig(config);
    setIsSaving(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
      <div className="bg-card border border-border-strong rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500">
              <Server size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground uppercase tracking-tight">Netsis ERP Bağlantısı</h3>
              <p className="text-[10px] text-dim-foreground font-bold uppercase tracking-widest">SQL Server Configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          {status && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in slide-in-from-top-2 duration-300 ${
              status.connected 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {status.connected ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide">
                  {status.connected ? 'Bağlantı Başarılı' : 'Bağlantı Hatası'}
                </p>
                <p className="text-[11px] mt-1 opacity-80 uppercase leading-relaxed">
                  {status.error || `SQL Server (${config.server}) ile aktif iletişim sağlandı.`}
                </p>
                <p className="text-[9px] mt-2 font-mono opacity-50">
                  Son Kontrol: {new Date(status.lastChecked!).toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dim-foreground flex items-center gap-2">
                <Server size={12} /> Sunucu (IP / Instance)
              </label>
              <input 
                type="text"
                required
                value={config.server}
                onChange={e => setConfig({...config, server: e.target.value})}
                placeholder="192.168.1.100"
                className="w-full bg-background border border-border-strong rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono transition-all"
              />
            </div>
            <div className="md:col-span-4 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dim-foreground flex items-center gap-2">
                Port
              </label>
              <input 
                type="number"
                required
                value={config.port}
                onChange={e => setConfig({...config, port: Number(e.target.value)})}
                className="w-full bg-background border border-border-strong rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-dim-foreground flex items-center gap-2">
              <Database size={12} /> Veritabanı
            </label>
            <input 
              type="text"
              required
              value={config.database}
              onChange={e => setConfig({...config, database: e.target.value})}
              className="w-full bg-background border border-border-strong rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dim-foreground flex items-center gap-2">
                <User size={12} /> Kullanıcı Adı
              </label>
              <input 
                type="text"
                required
                value={config.username}
                onChange={e => setConfig({...config, username: e.target.value})}
                className="w-full bg-background border border-border-strong rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-dim-foreground flex items-center gap-2">
                <Lock size={12} /> Parola
              </label>
              <input 
                type="password"
                value={config.password || ''}
                onChange={e => setConfig({...config, password: e.target.value})}
                className="w-full bg-background border border-border-strong rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-border flex gap-4">
            <button 
              type="button"
              disabled={loading}
              onClick={handleTest}
              className="flex-none bg-surface hover:bg-surface-hover text-muted-foreground px-6 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all flex items-center gap-2 border border-border-strong"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Test Et
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-foreground py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-orange-900/40 border border-orange-500/30 flex items-center justify-center gap-2"
            >
              Bilgileri Kaydet
            </button>
          </div>
        </form>
        
        <div className="px-8 py-4 bg-background/50 border-t border-border/50 flex items-center gap-3">
          <AlertCircle size={14} className="text-dim-foreground shrink-0" />
          <p className="text-[10px] text-dim-foreground font-medium leading-relaxed uppercase">
            Bu bilgiler yerel tarayıcı hafızasında (LocalStorage) şifresiz olarak tutulur. 
            Güvenlik için sadece iç ağ erişimli SQL sunucusu kullanılması önerilir.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
