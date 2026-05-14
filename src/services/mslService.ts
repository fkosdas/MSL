import { Socket } from 'socket.io-client';
import { Malzeme } from '../types';

export const createMslService = (socket: Socket, localMalzemeler: Record<string, Malzeme>) => ({
  getMalzemeByBarkod: async (barkod: string): Promise<Malzeme | null> => {
    return localMalzemeler[barkod] || null;
  },
  
  updateMalzeme: async (barkod: string, updates: Partial<Malzeme>): Promise<Malzeme | null> => {
    const existing = localMalzemeler[barkod];
    if (existing) {
      const updated = { ...existing, ...updates };
      socket.emit('update-malzeme', updated);
      return updated;
    }
    // Allow creating new one if it doesn't exist
    const updated = updates as Malzeme;
    socket.emit('update-malzeme', updated);
    return updated;
  },
  
  getAllMalzeme: async (): Promise<Malzeme[]> => {
    return Object.values(localMalzemeler);
  },
  
  deleteMalzeme: async (barkod: string): Promise<boolean> => {
    if (localMalzemeler[barkod]) {
      socket.emit('delete-malzeme', barkod);
      return true;
    }
    return false;
  }
});
