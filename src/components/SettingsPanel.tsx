import React, { useState, useEffect } from 'react';
import { Settings, Save, Database, LayoutGrid } from 'lucide-react';
import { dataService } from '../dataService';
import { CabinetConfig, NetsisConfig } from '../types';

export const SettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CABINETS' | 'NETSIS'>('CABINETS');
  const [cabinetConfigs, setCabinetConfigs] = useState<CabinetConfig[]>([]);
  const [netsisConfig, setNetsisConfig] = useState<NetsisConfig>({
    server: '',
    port: 1433,
    database: '',
    username: '',
    password: ''
  });
  
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // Load initial configs
    const initialConfigs = dataService.getCabinetConfigs();
    console.log('Mount: initial configs', initialConfigs);
    
    const fetchOrSetDefaults = () => {
      fetch('/api/config/cabinets')
        .then(res => res.json())
        .then(data => {
            console.log('Fetched configs', data);
            if (Array.isArray(data) && data.length > 0) {
              setCabinetConfigs(data);
              dataService.saveCabinetConfigs(data); // Sync service just in case
            } else {
              // Provide hardcoded defaults if broken
              const defaults: CabinetConfig[] = [
                { id: 'DRY_CABINET_1', rows: 5, cols: 2 },
                { id: 'DRY_CABINET_2', rows: 5, cols: 2 },
                { id: 'OVEN_1', rows: 3, cols: 1 }
              ];
              setCabinetConfigs(defaults);
              handleSaveCabinetsWithConfigs(defaults); // Force save on server
            }
        })
        .catch(e => console.error(e));
    };

    if (!initialConfigs || initialConfigs.length === 0) {
      fetchOrSetDefaults();
    } else {
      setCabinetConfigs(initialConfigs);
    }
    
    setNetsisConfig(dataService.getNetsisConfig() || {
      server: '',
      port: 1433,
      database: '',
      username: '',
      password: ''
    });
    const unsubscribe = dataService.subscribe(() => {
      const subConfigs = dataService.getCabinetConfigs();
      if (subConfigs && subConfigs.length > 0) {
        setCabinetConfigs(subConfigs);
      }
      setNetsisConfig(dataService.getNetsisConfig() || {
        server: '',
        port: 1433,
        database: '',
        username: '',
        password: ''
      });
    });
    
    return unsubscribe;
  }, []);

  const handleUpdateCabinet = (id: string, field: 'rows' | 'cols', value: string) => {
    if (value === '') {
      setCabinetConfigs(prev => 
        prev.map(c => c.id === id ? { ...c, [field]: '' as any } : c)
      );
      return;
    }
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    
    setCabinetConfigs(prev => 
      prev.map(c => c.id === id ? { ...c, [field]: numValue } : c)
    );
  };

  const handleSaveCabinetsWithConfigs = async (configsToSave: CabinetConfig[]) => {
    try {
      const validConfigs = configsToSave.map(c => ({
        ...c,
        rows: Math.max(1, Number(c.rows) || 1),
        cols: Math.max(1, Number(c.cols) || 1)
      }));
      setCabinetConfigs(validConfigs);
      await fetch('/api/config/cabinets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validConfigs)
      });
      dataService.saveCabinetConfigs(validConfigs);
      showSuccess('Dolap ayarları kaydedildi!');
    } catch (e) {
      console.error('Failed to save cabinets:', e);
    }
  };

  const handleSaveCabinets = () => handleSaveCabinetsWithConfigs(cabinetConfigs);

  const handleUpdateNetsis = (field: keyof NetsisConfig, value: string | number) => {
    setNetsisConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveNetsis = () => {
    dataService.saveNetsisConfig(netsisConfig);
    showSuccess('Netsis ayarları kaydedildi ve bağlantı kontrol ediliyor!');
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-3xl overflow-hidden">
      {/* Sub tabs */}
      <div className="flex bg-card border-b border-border p-2 gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('CABINETS')}
          className={`px-4 py-2 flex items-center gap-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'CABINETS' ? 'bg-blue-600 text-foreground shadow-lg' : 'bg-surface/50 text-muted-foreground hover:text-foreground hover:bg-surface'}`}
        >
          <LayoutGrid size={14} />
          Dolap Kapasiteleri
        </button>
        <button
          onClick={() => setActiveTab('NETSIS')}
          className={`px-4 py-2 flex items-center gap-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'NETSIS' ? 'bg-blue-600 text-foreground shadow-lg' : 'bg-surface/50 text-muted-foreground hover:text-foreground hover:bg-surface'}`}
        >
          <Database size={14} />
          Netsis SQL Bağlantısı
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {successMsg}
          </div>
        )}

        {activeTab === 'CABINETS' && (
          <div className="max-w-3xl space-y-6">
            <p className="text-muted-foreground text-sm">
              Tesis içindeki kuru dolapların ve fırınların satır/sütun kapasitelerini buradan ayarlayabilirsiniz.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cabinetConfigs && cabinetConfigs.length > 0 && cabinetConfigs.map((config, index) => (
                <div key={`${config.id}-${index}`} className="bg-surface/50 border border-border-strong/50 rounded-xl p-5 flex flex-col gap-4 relative">
                  <h3 className="font-bold text-foreground flex items-center gap-2 mb-2">
                     <LayoutGrid size={16} className="text-blue-400" />
                     {config.id.replace(/_/g, ' ')}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">Satır (Row)</label>
                      <input 
                        type="number"
                        min="1"
                        value={config.rows}
                        onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                            setCabinetConfigs(prev => {
                                const arr = [...prev];
                                arr[index] = { ...arr[index], rows: val as any };
                                return arr;
                            });
                        }}
                        className="w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-foreground outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">Sütun (Col)</label>
                      <input 
                        type="number"
                        min="1"
                        value={config.cols}
                        onChange={(e) => {
                            const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                            setCabinetConfigs(prev => {
                                const arr = [...prev];
                                arr[index] = { ...arr[index], cols: val as any };
                                return arr;
                            });
                        }}
                        className="w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-foreground outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                  
                  {/* Capacity Simulation */}
                  <div className="mt-2 pt-4 border-t border-border-strong/50">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 text-center">
                        Simülasyon • {Number(config.rows || 0) * Number(config.cols || 0)} Bölme
                    </div>
                    <div className="flex justify-center">
                        <div 
                          className="grid gap-1 bg-card p-2 rounded-lg border border-border"
                          style={{
                            gridTemplateColumns: `repeat(${Math.min(Number(config.cols) || 1, 15)}, minmax(0, 1fr))`,
                            width: 'fit-content'
                          }}
                        >
                          {Array.from({length: Math.min((Number(config.rows) || 1) * (Number(config.cols) || 1), 200)}).map((_, i) => (
                            <div key={i} className="w-5 h-5 bg-surface rounded-sm border border-border-strong shadow-sm" />
                          ))}
                        </div>
                    </div>
                    {(Number(config.rows) || 1) * (Number(config.cols) || 1) > 200 && (
                        <p className="text-xs text-dim-foreground text-center mt-2">+ daha fazlası görselleştirilmiyor</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border/50 flex justify-end">
              <button
                onClick={handleSaveCabinets}
                className="bg-blue-600 hover:bg-blue-500 text-foreground px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
              >
                <Save size={16} />
                Kapasiteleri Kaydet
              </button>
            </div>
          </div>
        )}

        {activeTab === 'NETSIS' && (
          <div className="max-w-2xl space-y-6">
            <p className="text-muted-foreground text-sm">
              Netsis veritabanı bağlantı detaylarını yapılandırın. Sistem malzeme bilgileri için bu veritabanını sorgulayacaktır.
            </p>
            
            <div className="bg-surface/50 border border-border-strong/50 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">Sunucu (Server)</label>
                    <input 
                      type="text"
                      value={netsisConfig.server}
                      onChange={(e) => handleUpdateNetsis('server', e.target.value)}
                      placeholder="örn: 192.168.1.100"
                      className="w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-foreground focus:border-blue-500 transition-colors"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">Port</label>
                    <input 
                      type="number"
                      value={netsisConfig.port}
                      onChange={(e) => handleUpdateNetsis('port', e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-foreground focus:border-blue-500 transition-colors"
                    />
                 </div>
              </div>
              
              <div className="space-y-1">
                 <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">Veritabanı (Database)</label>
                 <input 
                   type="text"
                   value={netsisConfig.database}
                   onChange={(e) => handleUpdateNetsis('database', e.target.value)}
                   className="w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-foreground focus:border-blue-500 transition-colors"
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">Kullanıcı Adı</label>
                    <input 
                      type="text"
                      value={netsisConfig.username}
                      onChange={(e) => handleUpdateNetsis('username', e.target.value)}
                      className="w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-foreground focus:border-blue-500 transition-colors"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest pl-1">Şifre</label>
                    <input 
                      type="password"
                      value={netsisConfig.password}
                      onChange={(e) => handleUpdateNetsis('password', e.target.value)}
                      className="w-full bg-card border border-border-strong rounded-lg px-3 py-2 text-foreground focus:border-blue-500 transition-colors"
                    />
                 </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50 flex justify-end">
              <button
                onClick={handleSaveNetsis}
                className="bg-blue-600 hover:bg-blue-500 text-foreground px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
              >
                <Save size={16} />
                Bağlantıyı Kaydet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
