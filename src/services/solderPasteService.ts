import { Socket } from 'socket.io-client';
import { SolderPaste } from '../types';

export const createSolderPasteService = (socket: Socket, localSolderPastes: Record<string, SolderPaste>) => ({
  getSolderPasteByBarkod: async (barkod: string): Promise<SolderPaste | null> => localSolderPastes[barkod] || null,
  updateSolderPaste: async (barkod: string, updates: Partial<SolderPaste>): Promise<SolderPaste | null> => {
    const existing = localSolderPastes[barkod];
    const updated = existing ? { ...existing, ...updates } : (updates as SolderPaste);
    socket.emit('update-solder-paste', updated);
    return updated;
  },
  deleteSolderPaste: async (barkod: string): Promise<boolean> => {
    if (localSolderPastes[barkod]) {
      socket.emit('delete-solder-paste', barkod);
      return true;
    }
    return false;
  },
  getAllSolderPaste: async (): Promise<SolderPaste[]> => Object.values(localSolderPastes)
});
