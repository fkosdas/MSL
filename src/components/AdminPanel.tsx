import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { dataService } from '../dataService';
import { Shield, Users, Key, Plus, Trash2, Edit2, Save, X, Calendar, PackageOpen, XCircle, CheckCircle2 } from 'lucide-react';

export function AdminPanel() {
  const [activeSubTab, setActiveSubTab] = useState<'USERS' | 'ROLES' | 'DAILY_SUMMARY'>('USERS');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [dailySummary, setDailySummary] = useState<{openedCount: number, expiredCount: number, readyPasteCount: number} | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  useEffect(() => {
    const fetchAuthData = () => {
      setUsers(dataService.getUsers());
      setRoles(dataService.getRoles());
    };
    fetchAuthData();
    const unsubscribe = dataService.subscribe(fetchAuthData);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (activeSubTab === 'DAILY_SUMMARY') {
      setIsLoadingSummary(true);
      fetch('/api/reports/daily-summary')
        .then(res => res.json())
        .then(data => {
          setDailySummary(data);
          setIsLoadingSummary(false);
        })
        .catch(err => {
          console.error('Failed to fetch daily summary', err);
          setIsLoadingSummary(false);
        });
    }
  }, [activeSubTab]);

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      if (!editingUser.id) {
          editingUser.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      }
      dataService.updateUser(editingUser);
      setEditingUser(null);
    }
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      if (!editingRole.id) {
          editingRole.id = editingRole.name.toUpperCase().replace(/\s+/g, '_');
      }
      dataService.updateRole(editingRole);
      setEditingRole(null);
    }
  };

  const togglePermission = (perm: string) => {
    if (!editingRole) return;
    const permissions = editingRole.permissions.includes(perm)
      ? editingRole.permissions.filter(p => p !== perm)
      : [...editingRole.permissions, perm];
    setEditingRole({ ...editingRole, permissions });
  };

  const ALL_PERMISSIONS = [
    'ALL', 'VIEW_MSL', 'EDIT_MSL', 'VIEW_CABINETS', 'EDIT_CABINETS', 'MANAGE_SETTINGS', 'MANAGE_USERS', 'VIEW_HISTORY'
  ];

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center gap-4 border-b border-border p-4">
         <button onClick={() => setActiveSubTab('USERS')} className={`px-4 py-2 font-bold text-xs tracking-wider rounded-lg border ${activeSubTab === 'USERS' ? 'bg-blue-600 border-blue-500' : 'border-border text-muted-foreground'}`}>
            KULLANICILAR
         </button>
         <button onClick={() => setActiveSubTab('ROLES')} className={`px-4 py-2 font-bold text-xs tracking-wider rounded-lg border ${activeSubTab === 'ROLES' ? 'bg-blue-600 border-blue-500' : 'border-border text-muted-foreground'}`}>
            ROLLER VE YETKİLER
         </button>
         <button onClick={() => setActiveSubTab('DAILY_SUMMARY')} className={`px-4 py-2 font-bold text-xs tracking-wider rounded-lg border flex items-center gap-2 ${activeSubTab === 'DAILY_SUMMARY' ? 'bg-blue-600 border-blue-500' : 'border-border text-muted-foreground'}`}>
            <Calendar size={14} /> GÜNLÜK VARDİYA ÖZETİ
         </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeSubTab === 'USERS' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold flex items-center gap-2"><Users className="text-blue-400"/> Kullanıcı Yönetimi</h2>
                 <button onClick={() => setEditingUser({ id: '', firstName: '', lastName: '', title: '', roleId: roles[0]?.id || '', qrCode: '' })} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-foreground px-4 py-2 rounded-xl text-sm font-bold">
                    <Plus size={16}/> YENİ KULLANICI
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {users.map(u => (
                    <div key={u.id} className="bg-card border border-border p-4 rounded-xl flex flex-col gap-2">
                       <div className="flex justify-between items-start">
                          <div>
                             <h3 className="font-bold text-lg">{u.firstName} {u.lastName}</h3>
                             <p className="text-xs text-blue-400 font-bold uppercase">{u.title}</p>
                          </div>
                          <div className="flex gap-2 text-dim-foreground">
                             <button onClick={() => setEditingUser(u)} className="hover:text-blue-400"><Edit2 size={16}/></button>
                             <button onClick={() => dataService.deleteUser(u.id)} className="hover:text-red-400"><Trash2 size={16}/></button>
                          </div>
                       </div>
                       <div className="mt-2 text-sm text-muted-foreground">
                           <p><strong>Rol:</strong> {roles.find(r => r.id === u.roleId)?.name || u.roleId}</p>
                           <p className="break-all text-[10px] bg-background p-2 rounded border border-border mt-2 font-mono"><Key size={12} className="inline mr-1"/> {u.qrCode}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeSubTab === 'ROLES' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="text-blue-400"/> Rol Yönetimi</h2>
                 <button onClick={() => setEditingRole({ id: '', name: '', permissions: [] })} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-foreground px-4 py-2 rounded-xl text-sm font-bold">
                    <Plus size={16}/> YENİ ROL
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {roles.map(r => (
                    <div key={r.id} className="bg-card border border-border p-4 rounded-xl flex flex-col gap-4">
                       <div className="flex justify-between items-center">
                          <h3 className="font-bold text-lg">{r.name}</h3>
                          <div className="flex gap-2 text-dim-foreground">
                             <button onClick={() => setEditingRole(r)} className="hover:text-blue-400"><Edit2 size={16}/></button>
                             <button onClick={() => dataService.deleteRole(r.id)} disabled={r.id==='ADMIN'} className={r.id==='ADMIN'? 'opacity-30' : 'hover:text-red-400'}><Trash2 size={16}/></button>
                          </div>
                       </div>
                       <div className="flex flex-wrap gap-2 mt-2">
                           {r.permissions.map(p => (
                             <span key={p} className="text-[10px] font-bold bg-surface text-muted-foreground px-2 py-1 rounded-md border border-border-strong">{p}</span>
                           ))}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeSubTab === 'DAILY_SUMMARY' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="text-blue-400"/> Günlük Vardiya Özeti (00:01 - 23:59)</h2>
              </div>
              
              {isLoadingSummary ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : dailySummary ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                       <PackageOpen size={24} />
                    </div>
                    <div className="text-4xl font-black">{dailySummary.openedCount}</div>
                    <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Açılan Ürün Sayısı</div>
                  </div>
                  
                  <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                       <XCircle size={24} />
                    </div>
                    <div className="text-4xl font-black">{dailySummary.expiredCount}</div>
                    <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Süresi Aşılan Ürün Sayısı</div>
                  </div>
                  
                  <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                       <CheckCircle2 size={24} />
                    </div>
                    <div className="text-4xl font-black">{dailySummary.readyPasteCount}</div>
                    <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Kullanıma Hazır Krem Lehim</div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">Veri yüklenemedi.</div>
              )}
           </div>
        )}
      </div>

      {/* User Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
           <form onSubmit={handleSaveUser} className="bg-background border border-border-strong p-6 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-foreground">{editingUser.id ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</h2>
                 <button type="button" onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground"><X/></button>
              </div>
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Adı</label>
                    <input required value={editingUser.firstName} onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} className="w-full bg-card border border-border-strong p-2 rounded-lg text-foreground outline-none focus:border-blue-500" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Soyadı</label>
                    <input required value={editingUser.lastName} onChange={e => setEditingUser({...editingUser, lastName: e.target.value})} className="w-full bg-card border border-border-strong p-2 rounded-lg text-foreground outline-none focus:border-blue-500" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Ünvan</label>
                    <input required value={editingUser.title} onChange={e => setEditingUser({...editingUser, title: e.target.value})} className="w-full bg-card border border-border-strong p-2 rounded-lg text-foreground outline-none focus:border-blue-500" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Rol</label>
                    <select value={editingUser.roleId} onChange={e => setEditingUser({...editingUser, roleId: e.target.value})} className="w-full bg-card border border-border-strong p-2 rounded-lg text-foreground outline-none focus:border-blue-500">
                       <option value="">Rol Seç...</option>
                       {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-2">
                        <span>Giriş QR Kodu (36 Karakter)</span>
                        <button type="button" onClick={() => setEditingUser({...editingUser, qrCode: crypto.randomUUID()})} className="text-[10px] bg-surface px-2 py-0.5 rounded text-blue-400 hover:text-foreground border border-border-strong">Rastgele Oluştur</button>
                    </label>
                    <input required minLength={36} maxLength={36} value={editingUser.qrCode} onChange={e => setEditingUser({...editingUser, qrCode: e.target.value})} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="w-full bg-card border border-border-strong p-2 rounded-lg text-foreground outline-none focus:border-blue-500 font-mono text-sm" />
                 </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                 <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 rounded-xl border border-border-strong text-muted-foreground">İptal</button>
                 <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-foreground font-bold flex items-center gap-2"><Save size={16}/> Kaydet</button>
              </div>
           </form>
        </div>
      )}

      {/* Role Edit Modal */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
           <form onSubmit={handleSaveRole} className="bg-background border border-border-strong p-6 rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-foreground">{editingRole.id ? 'Rol Düzenle' : 'Yeni Rol'}</h2>
                 <button type="button" onClick={() => setEditingRole(null)} className="text-muted-foreground hover:text-foreground"><X/></button>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Rol Adı</label>
                    <input required value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value})} className="w-full bg-card border border-border-strong p-2 rounded-lg text-foreground outline-none focus:border-blue-500" />
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Yetkiler</label>
                    <div className="grid grid-cols-2 gap-2">
                       {ALL_PERMISSIONS.map(perm => {
                          const hasPerm = editingRole.permissions.includes(perm);
                          return (
                             <div 
                                key={perm} 
                                onClick={() => togglePermission(perm)}
                                className={`p-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${hasPerm ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-card border-border text-dim-foreground hover:border-slate-600'}`}>
                                {hasPerm && <span className="mr-1">✓</span>} {perm}
                             </div>
                          );
                       })}
                    </div>
                 </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                 <button type="button" onClick={() => setEditingRole(null)} className="px-4 py-2 rounded-xl border border-border-strong text-muted-foreground">İptal</button>
                 <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-foreground font-bold flex items-center gap-2"><Save size={16}/> Kaydet</button>
              </div>
         </form>
        </div>
      )}
    </div>
  );
}
