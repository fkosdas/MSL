import { useState, useEffect, useMemo, useRef } from 'react';
import { Settings, RefreshCw, Box, Layers, History, LayoutDashboard, LayoutGrid, Thermometer, Package, Factory, Shield, LogOut, PanelRight } from 'lucide-react';
import { dataService } from './dataService';
import { Malzeme, CabinetId, AppTab, ConnectionStatus, User, Role } from './types';
import { TrackingTable } from './components/TrackingTable';
import { CabinetView } from './components/CabinetView';
import { SettingsPanel } from './components/SettingsPanel';
import { EditModal } from './components/EditModal';
import { SolderPasteView } from './components/SolderPasteView';
import { HistoryPanel } from './components/HistoryPanel';
import { TakeOutModal } from './components/TakeOutModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { LoginScreen } from './components/LoginScreen';
import { AdminPanel } from './components/AdminPanel';
import { ThemeToggle } from './components/ThemeToggle';
import { mslEngine } from './mslEngine';
import { motion, AnimatePresence } from 'motion/react';
import { SOLDER_PASTE_CODES } from './constants';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());

  const [activeTab, setActiveTab] = useState<AppTab>('MSL');
  const [malzemeler, setMalzemeler] = useState<Malzeme[]>([]);
  const [editingMalzeme, setEditingMalzeme] = useState<Malzeme | null>(null);
  const [editingAction, setEditingAction] = useState<string | undefined>(undefined);
  const [deletingMalzeme, setDeletingMalzeme] = useState<Malzeme | null>(null);
  const [cancellingMalzeme, setCancellingMalzeme] = useState<Malzeme | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.classList.add(savedTheme + '-mode');
      document.body.classList.remove(savedTheme === 'dark' ? 'light-mode' : 'dark-mode');
    } else {
      document.body.classList.add('dark-mode'); // Default
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('app-theme', newTheme);
      document.body.classList.remove('dark-mode', 'light-mode');
      document.body.classList.add(`${newTheme}-mode`);
      return newTheme;
    });
  };

  const handleEdit = (m: Malzeme, action?: string) => {
    if (action === 'DELETE') {
        setDeletingMalzeme(m);
        return;
    }
    if (action === 'CANCEL_TAKEOUT') {
        setCancellingMalzeme(m);
        return;
    }
    setEditingMalzeme(m);
    setEditingAction(action);
  };

  const handleDeleteMalzeme = async (m: Malzeme) => {
    // In mslService.ts we need to add delete function
    await dataService.deleteMalzeme(m.barkod);
    handleLogHistory({
        barkod: m.barkod,
        stokAdi: m.parcaNo || m.STOK_KODU || '',
        islemTipi: 'Kayıt Silindi',
        detay: `Malzeme (${m.barkod}) takipten tamamen kaldırıldı.`,
        date: new Date().toISOString()
    });
    setDeletingMalzeme(null);
  };
  const [searchFilter, setSearchFilter] = useState('');
  const [showLocationSidebar, setShowLocationSidebar] = useState(true);
  
  const [locationFilter, setLocationFilter] = useState<CabinetId | 'ALL'>('ALL');
  const [loading, setLoading] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>({ connected: false, lastChecked: null });
  const [simulatedNow, setSimulatedNow] = useState(Date.now());
  const [sensors, setSensors] = useState<Record<string, { temp: number, hum: number }>>({});
  const [cabinetConfigs, setCabinetConfigs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/config/cabinets')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCabinetConfigs(data);
        }
      })
      .catch(err => console.error('Error fetching cabinet configurations:', err));
  }, []);

  const [netsisData, setNetsisData] = useState<any[]>([]);
  const [solderPasteNetsisData, setSolderPasteNetsisData] = useState<any[]>([]);
  const [isFetchingFull, setIsFetchingFull] = useState(false);
  const [netsisPage, setNetsisPage] = useState(1);
  const [netsisTotal, setNetsisTotal] = useState(0);

  const fetchPaginatedData = async (page: number, search: string = '', append: boolean = false) => {
    setIsFetchingFull(true);
    const { data: newNetsisParams, total } = await dataService.fetchPaginatedMaterials(page, 100, search);
    setIsFetchingFull(false);
    
    setNetsisTotal(total);
    setNetsisPage(page);
    
    if (append) {
      setNetsisData(prev => {
        const existingMap = new Set(prev.map(p => p.SERILOTNO));
        const toAdd = newNetsisParams.filter(n => !existingMap.has(n.SERILOTNO));
        return [...prev, ...toAdd];
      });
    } else {
      setNetsisData(newNetsisParams);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilter(e.target.value);
  };

  useEffect(() => {
    const cleanSearch = searchFilter.replace(/\s+/g, '').trim();
    if (cleanSearch === '') {
      setNetsisData([]);
      setNetsisPage(1);
      fetchPaginatedData(1, '', false);
      return;
    }

    const timer = setTimeout(() => {
      setNetsisData([]);
      setNetsisPage(1);
      fetchPaginatedData(1, cleanSearch, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchFilter]);

  // Pre-fetch Solder Paste codes to ensure they are available in the SolderPasteView
  useEffect(() => {
    const codes = Object.keys(SOLDER_PASTE_CODES);
    codes.forEach(code => {
       dataService.fetchPaginatedMaterials(1, 20, code).then(res => {
         if (res.data && res.data.length > 0) {
           setSolderPasteNetsisData(prev => {
             const existingMap = new Set(prev.map(p => p.SERILOTNO));
             const toAdd = res.data.filter((n: any) => !existingMap.has(n.SERILOTNO));
             return [...prev, ...toAdd];
           });
         }
       });
    });
  }, []);

  const combinedNetsisData = useMemo(() => {
    const map = new Map();
    netsisData.forEach(item => map.set(item.SERILOTNO, item));
    solderPasteNetsisData.forEach(item => map.set(item.SERILOTNO, item));
    return Array.from(map.values());
  }, [netsisData, solderPasteNetsisData]);

  const loadMoreNetsis = () => {
    if (netsisData.length < netsisTotal && !isFetchingFull) {
      fetchPaginatedData(netsisPage + 1, searchFilter, true);
    }
  };

  useEffect(() => {
    const updateLocalState = () => {
      dataService.getAllMalzeme().then(setMalzemeler);
      setConnStatus(dataService.getConnectionStatus());
    };

    updateLocalState();
    const unsubscribe = dataService.subscribe(updateLocalState);

    const fetchSensors = async () => {
      const data = await dataService.getSensorData();
      setSensors(data);
    };
    fetchSensors();

    const timer = setInterval(() => {
      setSimulatedNow(Date.now());
    }, 1000);

    const sensorTimer = setInterval(() => {
      fetchSensors();
    }, 300000);
    
    // Initial fetch handled by searchFilter dependency effect
    
    return () => {
      unsubscribe();
      clearInterval(timer);
      clearInterval(sensorTimer);
    };
  }, []);

  const transformedNetsisData = useMemo(() => {
    // We recreate transform inside App or just use the local netsisData directly
    return combinedNetsisData.map(item => ({
      id: `netsis-${item.SERILOTNO || Math.random()}`,
      barkod: (item.SERILOTNO || '').trim(),
      parcaNo: (item.STOK_KODU || '').trim(), 
      description: (item.STOK_ADI || '').trim(),
      mslSeviyesi: (item.MSL?.toString().trim() as any) || 'N/A',
      kalinlik: item.THICKNESS || 0,
      sealDate: new Date().toISOString(),
      durum: 'SEALED' as any,
      location: 'DEPO' as any,
      acilisZamani: null,
      sonFirinlamaZamani: null,
      kullanilanZamanMs: 0,
      SERILOTNO: item.SERILOTNO,
      STOK_KODU: item.STOK_KODU,
      STOK_ADI: item.STOK_ADI,
      MSL: item.MSL,
      THICKNESS: item.THICKNESS
    }));
  }, [combinedNetsisData]);

  const isSolderPaste = (parcaNo: string | undefined) => {
    if (!parcaNo) return false;
    const clean = parcaNo.trim().toUpperCase();
    return Object.keys(SOLDER_PASTE_CODES).some(code => clean.includes(code.toUpperCase()));
  };

  const filteredMalzemeler = useMemo(() => {
    // Combine local tracking and Netsis data
    const trackedSizeBefore = malzemeler.length;
    const tracked = malzemeler.filter(m => !isSolderPaste(m.parcaNo || ''));
    const trackedBarkods = new Set(tracked.map(m => m.barkod));
    
    // Filter out netsis items that are already being tracked
    const untracked = transformedNetsisData.filter(item => {
      if (trackedBarkods.has(item.barkod)) return false;
      if (isSolderPaste(item.parcaNo)) return false; // Filter out solder pastes
      return true;
    });
    let results = [...tracked, ...untracked];

    if (locationFilter !== 'ALL') {
      results = results.filter(m => m.location === locationFilter);
    }

    if (searchFilter) {
      const s = searchFilter.replace(/\s+/g, '').trim().toLowerCase();
      results = results.filter(m => {
        const serilotno = (m.SERILOTNO?.toString() || m.barkod?.toString() || '').replace(/\s+/g, '').trim().toLowerCase();
        const stokKodu = (m.STOK_KODU?.toString() || m.parcaNo?.toString() || '').replace(/\s+/g, '').trim().toLowerCase();
        return serilotno.includes(s) || stokKodu.includes(s);
      });
    }

    results.sort((a, b) => {
      const resA = mslEngine.hesapla(a, simulatedNow);
      const resB = mslEngine.hesapla(b, simulatedNow);

      const msA = resA.kalanZamanMs;
      const msB = resB.kalanZamanMs;

      const aIsBaking = a.location?.startsWith('OVEN');
      const bIsBaking = b.location?.startsWith('OVEN');
      
      const aIsOvertime = aIsBaking && msA !== null && msA <= 0;
      const bIsOvertime = bIsBaking && msB !== null && msB <= 0;

      if (aIsOvertime && !bIsOvertime) return -1;
      if (!aIsOvertime && bIsOvertime) return 1;

      if (aIsOvertime && bIsOvertime) {
         return (msA ?? 0) - (msB ?? 0); 
      }
      return 0;
    });

    return results;
  }, [malzemeler, netsisData, searchFilter, locationFilter, connStatus.lastChecked, simulatedNow]);


  const handleLogHistory = (logData: any) => {
    const loc = logData.yeniDeger || logData.eskiDeger;
    let temp, hum;
    if (loc && (loc.startsWith('DRY_CABINET') || loc.startsWith('OVEN'))) {
        const s = sensors[loc];
        if (s) {
            temp = s.temp;
            hum = s.hum;
        }
    }
    dataService.createHistoryLog({
        ...logData,
        temp,
        hum,
        date: logData.date || new Date().toISOString()
    });
  };

  const handleUpdateMalzeme = async (updated: Malzeme) => {
    const isNew = !malzemeler.some(m => m.barkod === updated.barkod);
    if (isNew) {
        handleLogHistory({
            barkod: updated.barkod,
            stokAdi: updated.parcaNo || updated.STOK_KODU || '',
            islemTipi: 'Takibe Alındı',
            detay: `Malzeme (${updated.barkod}) Netsis'ten takibe alındı.`,
            date: new Date().toISOString()
        });
    }
    await dataService.updateMalzeme(updated.barkod, updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchFilter) {
      const searchTerm = searchFilter.replace(/\s+/g, '').trim().toLowerCase();
      const match = filteredMalzemeler.find(m => {
        const serilotno = (m.SERILOTNO?.toString() || m.barkod?.toString() || '').replace(/\s+/g, '').trim().toLowerCase();
        return serilotno === searchTerm;
      });
      if (match) {
        setEditingMalzeme(match);
        setSearchFilter('');
      } else {
        // Try partial match if no exact match
        const partialMatches = filteredMalzemeler.filter(m => {
          const serilotno = (m.SERILOTNO?.toString() || m.barkod?.toString() || '').replace(/\s+/g, '').trim().toLowerCase();
          return serilotno.includes(searchTerm);
        });
        if (partialMatches.length === 1) {
          setEditingMalzeme(partialMatches[0]);
          setSearchFilter('');
        }
      }
    }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    dataService.setCurrentUser(user);
    const roles = dataService.getRoles();
    const role = roles.find(r => r.id === user.roleId);
    setUserRole(role || null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    dataService.setCurrentUser(null);
    setUserRole(null);
  };

  useEffect(() => {
    if (!currentUser) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      setShowInactivityWarning(false);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    const checkInterval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityRef.current;
      const TIMEOUT_MS = 30 * 60 * 1000;
      const WARNING_MS = 28 * 60 * 1000;

      if (inactiveTime >= TIMEOUT_MS) {
        handleLogout();
        setShowInactivityWarning(false);
      } else if (inactiveTime >= WARNING_MS) {
        setShowInactivityWarning(true);
      }
    }, 60000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      clearInterval(checkInterval);
    };
  }, [currentUser]);

  const hasAdminPerm = userRole?.permissions.includes('ALL') || userRole?.permissions.includes('MANAGE_USERS');
  const hasSettingsPerm = userRole?.permissions.includes('ALL') || userRole?.permissions.includes('MANAGE_SETTINGS');
  const hasHistoryPerm = userRole?.permissions.includes('ALL') || userRole?.permissions.includes('VIEW_HISTORY');
  const hasCabinetsPerm = userRole?.permissions.includes('ALL') || userRole?.permissions.includes('VIEW_CABINETS') || userRole?.permissions.includes('EDIT_CABINETS');
  const hasMslPerm = userRole?.permissions.includes('ALL') || userRole?.permissions.includes('VIEW_MSL') || userRole?.permissions.includes('EDIT_MSL');

  useEffect(() => {
    const tabs = [
      { id: 'MSL', perm: hasMslPerm },
      { id: 'SOLDER_PASTE', perm: hasMslPerm },
      { id: 'CABINETS', perm: hasCabinetsPerm },
      { id: 'HISTORY', perm: hasHistoryPerm },
      { id: 'SETTINGS', perm: hasSettingsPerm },
      { id: 'ADMIN', perm: hasAdminPerm }
    ];

    const currentTabInfo = tabs.find(t => t.id === activeTab);
    if (currentTabInfo && !currentTabInfo.perm) {
      const firstAvailable = tabs.find(t => t.perm);
      if (firstAvailable) {
        setActiveTab(firstAvailable.id as AppTab);
      }
    }
  }, [activeTab, hasAdminPerm, hasSettingsPerm, hasHistoryPerm, hasCabinetsPerm, hasMslPerm]);

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-8 py-4 border-b border-background bg-card/40 backdrop-blur-md flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Layers className="text-foreground" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">MSL Takip Sistemi</h1>
            <p className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest">{currentUser.firstName} {currentUser.lastName} • {currentUser.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${connStatus.connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse'}`}></div>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${connStatus.connected ? 'text-muted-foreground' : 'text-red-400'}`}>
                {connStatus.connected ? 'Netsis Bağlı' : 'Netsis Hatası'}
              </span>
            </div>
            {connStatus.lastChecked && (
              <span className="text-[8px] font-mono text-dim-foreground">Senk: {new Date(connStatus.lastChecked).toLocaleTimeString()}</span>
            )}
          </div>
          
          <div className="flex gap-2 items-center">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            {hasAdminPerm && (
              <button 
                onClick={() => setActiveTab('ADMIN')}
                className={`p-2 rounded-xl border transition-all shadow-md ${activeTab === 'ADMIN' ? 'bg-indigo-600 border-indigo-500 text-foreground' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}
                title="Admin Paneli"
              >
                <Shield size={20} />
              </button>
            )}
            {hasSettingsPerm && (
              <button 
                onClick={() => setActiveTab('SETTINGS')}
                className={`p-2 rounded-xl border transition-all shadow-md ${activeTab === 'SETTINGS' ? 'bg-blue-600 border-blue-500 text-foreground' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}
                title="Ayarlar"
              >
                <Settings size={20} />
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 rounded-xl border bg-card border-border text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all shadow-md"
              title="Çıkış Yap"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      {activeTab !== 'SETTINGS' && (
        <div className="shrink-0 px-8 py-4 bg-card/20 border-b border-background flex items-center gap-4">
          <div className="flex-1 relative">
            <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-dim-foreground" size={16} />
            <input 
              type="text"
              placeholder="Barkod veya Stok Kodu ile filtrele..."
              value={searchFilter}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              className="w-full bg-surface/50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-dim-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-8 flex gap-6">
        {/* Left Area (Tabs + Content) */}
        <div className="flex-1 flex flex-col min-w-0 flex-shrink gap-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {[
                { id: 'MSL', icon: Layers, label: 'Malzeme Takip', perm: hasMslPerm },
                { id: 'CABINETS', icon: LayoutGrid, label: 'Dolap Görünümü', perm: hasCabinetsPerm },
                { id: 'SOLDER_PASTE', icon: LayoutDashboard, label: 'Krem Lehim', perm: hasMslPerm },
                { id: 'HISTORY', icon: History, label: 'Geçmiş', perm: hasHistoryPerm }
              ].filter(t => t.perm).map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-surface text-foreground shadow-inner shadow-black/40' : 'text-dim-foreground hover:text-muted-foreground'}`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-6">
              {activeTab === 'MSL' && (
                <div className="text-[10px] font-bold text-dim-foreground uppercase tracking-widest">
                  Toplam: <span className="text-blue-400">{filteredMalzemeler.length}</span> Kayıt
                </div>
              )}
              <button 
                onClick={() => setShowLocationSidebar(!showLocationSidebar)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest ${showLocationSidebar ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-surface border-border text-dim-foreground hover:text-foreground'}`}
                title="Konum Filtrelerini Göster/Gizle"
              >
                <PanelRight size={14} />
                Filtreler
              </button>
            </div>
          </div>

          <section className="flex-1 min-h-0 relative">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeTab === 'MSL' && hasMslPerm && (
                    <TrackingTable 
                      data={filteredMalzemeler} 
                      onEdit={handleEdit}
                      onUpdate={handleUpdateMalzeme}
                      simulatedNow={simulatedNow}
                      searchFilter={searchFilter}
                      onLog={handleLogHistory}
                      onLoadMore={loadMoreNetsis}
                      hasMore={netsisData.length < netsisTotal}
                    />
                )}
                {activeTab === 'CABINETS' && hasCabinetsPerm && (
                  <CabinetView malzemeler={filteredMalzemeler} />
                )}
                {activeTab === 'SETTINGS' && hasSettingsPerm && (
                  <SettingsPanel />
                )}
                {activeTab === 'SOLDER_PASTE' && hasMslPerm && (
                  <SolderPasteView netsisData={solderPasteNetsisData} onLog={handleLogHistory} />
                )}
                {activeTab === 'HISTORY' && hasHistoryPerm && (
                  <HistoryPanel />
                )}
                {activeTab === 'ADMIN' && hasAdminPerm && (
                  <AdminPanel />
                )}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>

        {/* Location Filters / Cards Sidebar */}
        <AnimatePresence>
          {showLocationSidebar && (
            <motion.div 
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: 280, marginLeft: 24 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              transition={{ duration: 0.3, type: "spring", bounce: 0 }}
              className="shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-8"
            >
              {[
                { id: 'DEPO', label: 'Depo', type: 'area', icon: Package },
                { id: 'URETIM', label: 'Üretim Alanı', type: 'area', icon: Factory },
                { id: 'DRY_CABINET_1', label: 'Lehim Dolabı', type: 'cabinet' },
                { id: 'DRY_CABINET_2', label: 'Nem Dolabı', type: 'cabinet' },
                { id: 'OVEN_1', label: 'Kürleme Dolabı', type: 'cabinet' }
              ].map(loc => {
                const isSelected = locationFilter === loc.id;
                const sensor = loc.type === 'cabinet' ? (sensors[loc.id] || { temp: 0, hum: 0 }) : null;
                const config = loc.type === 'cabinet' ? cabinetConfigs.find(c => c.id === loc.id) : null;
                
                // Occupied spots calculation
                const occupiedMap = new Set();
                if (config) {
                   malzemeler.filter(m => m.location === loc.id && m.row !== undefined && m.col !== undefined).forEach(m => occupiedMap.add(`${m.row}-${m.col}`));
                }

                const inLocationCount = malzemeler.filter(m => m.location === loc.id).length;

                return (
                  <div 
                    key={loc.id} 
                    onClick={() => setLocationFilter(isSelected ? 'ALL' : loc.id as any)}
                    className={`w-full flex-none cursor-pointer border rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all ${isSelected ? 'bg-blue-900/30 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)] scale-[1.02]' : 'bg-card/50 border-border hover:border-border-strong hover:bg-card/80'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-blue-500 text-foreground' : 'bg-surface text-muted-foreground'}`}>
                          {loc.type === 'cabinet' ? <Thermometer size={20} /> : (loc.icon ? <loc.icon size={20} /> : <Box size={20}/>)}
                        </div>
                        <div>
                          <h3 className={`font-bold text-sm transition-colors ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{loc.label}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {loc.type === 'cabinet' ? (
                              <span className={`${isSelected ? 'text-blue-200' : 'text-dim-foreground'} text-[11px] font-mono transition-colors`}>{sensor?.temp || 0}°C / %{sensor?.hum || 0}</span>
                            ) : (
                              <span className={`${isSelected ? 'text-blue-200' : 'text-dim-foreground'} text-[10px] font-bold uppercase tracking-widest transition-colors`}>{inLocationCount} Ürün</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {loc.type === 'cabinet' && (
                         <div className={`w-2 h-2 rounded-full shrink-0 ${sensor?.temp && sensor.temp > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 animate-pulse'}`}></div>
                      )}
                    </div>

                    {/* Grid Visualizer for Cabinets */}
                    {config && (
                      <div className="mt-4 flex flex-col gap-1 items-end overflow-hidden">
                         {Array.from({length: config.rows}).map((_, r) => (
                            <div key={r} className="flex gap-1">
                               {Array.from({length: config.cols}).map((_, c) => {
                                 const isOccupied = occupiedMap.has(`${r+1}-${c+1}`);
                                 return (
                                   <div 
                                     key={c} 
                                     className={`w-3 h-1.5 rounded-[1px] transition-all duration-500 ${isOccupied ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.4)]' : 'bg-muted-foreground/30'}`}
                                     title={`${r+1}-${c+1}`}
                                   >
                                   </div>
                                 );
                               })}
                            </div>
                         ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {editingMalzeme && editingAction === 'TAKE_OUT' && (
        <TakeOutModal
          malzeme={editingMalzeme}
          rows={cabinetConfigs.find(c => c.id === editingMalzeme.location)?.rows || 5}
          cols={cabinetConfigs.find(c => c.id === editingMalzeme.location)?.cols || 2}
          onConfirm={async (targetLocation?: string) => {
             const updated = { ...editingMalzeme, row: undefined, col: undefined };
             
             if (editingMalzeme.durum === 'BAKING' || editingMalzeme.location === 'OVEN_1') {
                 // It came from an OVEN
                 const targetPath = targetLocation || 'URETIM_OPENED'; // default if missing
                 
                 const res = mslEngine.hesapla(editingMalzeme, Date.now());
                 const isBakingFinished = res.kalanZamanMs !== null && res.kalanZamanMs <= 0;

                 if (targetPath === 'DEPO') {
                     updated.durum = 'SEALED';
                     updated.location = 'DEPO';
                     if (isBakingFinished) updated.sealDate = new Date().toISOString();
                 } else if (targetPath === 'URETIM_SEALED') {
                     updated.durum = 'SEALED';
                     updated.location = 'URETIM';
                     if (isBakingFinished) updated.sealDate = new Date().toISOString();
                 } else {
                     // URETIM_OPENED
                     updated.durum = 'OPENED';
                     updated.location = 'URETIM';
                     updated.acilisZamani = new Date().toISOString();
                 }

                 if (isBakingFinished) {
                     // Baking completed successfully
                     updated.kullanilanZamanMs = 0;
                     updated.sonFirinlamaZamani = new Date().toISOString();
                 } else {
                     // Removed prematurely, keep existing kullanilanZamanMs, don't update seal date unless finished.
                 }
                 updated.firinlamaBaslangicZamani = null;
                 updated.firinlamaBitisZamani = null;
             } else if (editingMalzeme.durum === 'DRY_CABINET' || editingMalzeme.location.startsWith('DRY_CABINET')) {
                 updated.durum = 'OPENED';
                 updated.location = 'URETIM';
                 updated.acilisZamani = new Date().toISOString(); 
             } else {
                 updated.durum = 'OPENED';
                 updated.location = 'URETIM';
                 updated.acilisZamani = new Date().toISOString(); 
             }

             // Log History
             let islem = 'Dolaptan Çıkarma';
             let detay = `${editingMalzeme.location || 'Bilinmiyor'} konumundan çıkarıldı ve Üretim alanına (Açık) alındı.`;
             
             if (updated.durum === 'SEALED') {
                 detay = `${editingMalzeme.location || 'Bilinmiyor'} konumundan çıkarıldı ve Depoya (veya Üretime Mühürlü) alındı.`;
             }

             if (editingMalzeme.durum === 'BAKING' || editingMalzeme.location === 'OVEN_1') {
                 islem = 'Fırından Çıkarma';
                 const res = mslEngine.hesapla(editingMalzeme, Date.now());
                 if (res.kalanZamanMs !== null && res.kalanZamanMs < 0) {
                     const absMs = Math.abs(res.kalanZamanMs);
                     const h = Math.floor(absMs / 3600000);
                     const m = Math.floor((absMs % 3600000) / 60000);
                     const s = Math.floor((absMs % 60000) / 1000);
                     const overtimeStr = `${h}s ${m}d ${s}sn`;
                     detay += ` (Fazla Kürleme Süresi: ${overtimeStr})`;
                 }
             }

             handleLogHistory({
                 barkod: updated.barkod,
                 stokAdi: updated.parcaNo || updated.STOK_KODU || '',
                 islemTipi: islem,
                 eskiDeger: editingMalzeme.location,
                 yeniDeger: updated.location,
                 detay: detay
             });

             await handleUpdateMalzeme(updated as any);
             setEditingMalzeme(null);
          }}
          onCancel={() => setEditingMalzeme(null)}
        />
      )}

      {editingMalzeme && editingAction !== 'TAKE_OUT' && (
        <EditModal 
          malzeme={editingMalzeme}
          malzemeler={malzemeler}
          action={editingAction}
          onClose={() => setEditingMalzeme(null)}
          onSave={async (updated) => {
            await handleUpdateMalzeme(updated);
            setEditingMalzeme(null);
          }}
        />
      )}

      {deletingMalzeme && (
        <DeleteConfirmationModal 
          title="Takipten Kaldır"
          message={`${deletingMalzeme.barkod} barkodlu malzemenin takip kaydını tamamen silmek istediğinize emin misiniz?`}
          itemIdentifier={deletingMalzeme.barkod}
          onConfirm={() => handleDeleteMalzeme(deletingMalzeme)}
          onCancel={() => setDeletingMalzeme(null)}
        />
      )}

      {cancellingMalzeme && (
        <DeleteConfirmationModal
          title="Çıkarmayı İptal Et"
          message={`${cancellingMalzeme.barkod} barkodlu malzemenin üretime çıkış işlemini iptal edip depoya geri almak istediğinize emin misiniz?`}
          itemIdentifier={cancellingMalzeme.barkod}
          variant="warning"
          confirmLabel="GERİ AL"
          onConfirm={async () => {
             const updated = { 
               ...cancellingMalzeme, 
               location: 'DEPO' as any, 
               durum: 'SEALED' as any,
               acilisZamani: null 
             };
             await handleUpdateMalzeme(updated);
             handleLogHistory({
                barkod: updated.barkod,
                stokAdi: updated.parcaNo || updated.STOK_KODU || '',
                islemTipi: 'Çıkarma İptal',
                detay: 'Üretime alma işlemi iptal edildi, ürün depoya iade edildi.',
                date: new Date().toISOString()
             });
             setCancellingMalzeme(null);
          }}
          onCancel={() => setCancellingMalzeme(null)}
        />
      )}

      {showInactivityWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-sm w-full mx-4 text-center">
            <h2 className="text-xl font-bold mb-2">Oturum Süresi Doluyor</h2>
            <p className="text-muted-foreground mb-6">İşlem yapılmadığı için, oturum 2 dakika sonra kapatılacaktır.</p>
            <button
              onClick={() => setShowInactivityWarning(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              Oturuma Devam Et
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
