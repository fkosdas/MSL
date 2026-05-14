import { io, Socket } from 'socket.io-client';
import { Malzeme, CabinetId, NetsisConfig, ConnectionStatus, CabinetConfig, SolderPaste, NetsisMalzeme, HistoryLog, User, Role } from './types';
import { createMslService } from './services/mslService';
import { createSolderPasteService } from './services/solderPasteService';
import { createCabinetService } from './services/cabinetService';
import { createNetsisService } from './services/netsisService';

const socket: Socket = io(window.location.origin);

let localMalzemeler: Record<string, Malzeme> = {};
let localSolderPastes: Record<string, SolderPaste> = {};
let localCabinetConfigState: { cabinetConfigs: CabinetConfig[] } = { cabinetConfigs: [] };
let localNetsisConfigState: { netsisConfig: NetsisConfig | null, netsisCache: NetsisMalzeme[] } = {
  netsisConfig: null,
  netsisCache: []
};
let localUsers: User[] = [];
let localRoles: Role[] = [];
let currentUser: User | null = null;
let connectionStatus: ConnectionStatus = { connected: false, lastChecked: null };
let listeners: (() => void)[] = [];

const notifyListeners = () => listeners.forEach(l => l());

socket.on('initial-state', (data) => {
  data.malzemeler.forEach((m: Malzeme) => localMalzemeler[m.barkod] = m);
  data.solderPastes.forEach((p: SolderPaste) => localSolderPastes[p.barkod] = p);
  localCabinetConfigState.cabinetConfigs = data.cabinetConfigs;
  localNetsisConfigState.netsisConfig = data.netsisConfig;
  localNetsisConfigState.netsisCache = data.netsisCache || [];
  localUsers = data.users || [];
  localRoles = data.roles || [];
  
  if (data.netsisStatus) {
    connectionStatus = {
      connected: data.netsisStatus === 'CONNECTED',
      lastChecked: new Date().toISOString(),
      error: data.netsisError
    };
  }
  
  notifyListeners();
});

socket.on('users-updated', (users: User[]) => {
  localUsers = users;
  notifyListeners();
});

socket.on('roles-updated', (roles: Role[]) => {
  localRoles = roles;
  notifyListeners();
});

socket.on('netsis-data-updated', () => {
  // Frontend App.tsx handles refetching the API on its own now,
  // but we can notify listeners just in case
  notifyListeners();
});

socket.on('netsis-config-updated', (update: { config: NetsisConfig, status: string, error?: string }) => {
  localNetsisConfigState.netsisConfig = update.config;
  connectionStatus = {
    connected: update.status === 'CONNECTED',
    lastChecked: new Date().toISOString(),
    error: update.error
  };
  notifyListeners();
});

socket.on('malzeme-updated', (updated: Malzeme) => {
  localMalzemeler[updated.barkod] = updated;
  notifyListeners();
});

socket.on('malzeme-deleted', (barkod: string) => {
  delete localMalzemeler[barkod];
  notifyListeners();
});

socket.on('periodic-update', (data: { malzemeler: Malzeme[] }) => {
  data.malzemeler.forEach(m => localMalzemeler[m.barkod] = m);
  notifyListeners();
});

socket.on('solder-paste-updated', (updated: SolderPaste) => {
  localSolderPastes[updated.barkod] = updated;
  notifyListeners();
});

socket.on('solder-paste-deleted', (barkod: string) => {
  delete localSolderPastes[barkod];
  notifyListeners();
});

socket.on('cabinet-configs-updated', (configs: CabinetConfig[]) => {
  localCabinetConfigState.cabinetConfigs = configs;
  notifyListeners();
});

const mslService = createMslService(socket, localMalzemeler);
const solderPasteService = createSolderPasteService(socket, localSolderPastes);
const cabinetService = createCabinetService(socket, localCabinetConfigState);
const netsisService = createNetsisService(socket, localNetsisConfigState);

export const dataService = {
  subscribe: (callback: () => void) => {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  },

  ...mslService,
  ...solderPasteService,
  ...cabinetService,
  ...netsisService,
  
  createHistoryLog: async (logData: Partial<HistoryLog>) => {
    try {
      if (currentUser) {
        logData.userId = currentUser.id;
        logData.userName = `${currentUser.firstName} ${currentUser.lastName}`;
      }
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      });
    } catch (err) {
      console.error('Failed to create history log', err);
    }
  },

  getConnectionStatus: () => connectionStatus,

  syncAll: async () => ({
    malzemeler: Object.values(localMalzemeler),
    solderPastes: Object.values(localSolderPastes)
  }),

  // User and Role methods
  getUsers: () => localUsers,
  getRoles: () => localRoles,
  setCurrentUser: (user: User | null) => { 
    currentUser = user; 
    if (user) {
      socket.emit('login', { token: user.qrCode });
    } else {
      socket.emit('login', { token: '' });
    }
  },
  getCurrentUser: () => currentUser,
  updateUser: (user: User) => socket.emit('update-user', user),
  deleteUser: (userId: string) => socket.emit('delete-user', userId),
  updateRole: (role: Role) => socket.emit('update-role', role),
  deleteRole: (roleId: string) => socket.emit('delete-role', roleId),
  getSocket: () => socket,
};
