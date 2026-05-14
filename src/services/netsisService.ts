import { Socket } from 'socket.io-client';
import { NetsisConfig, NetsisMalzeme, Malzeme } from '../types';

export const createNetsisService = (socket: Socket, localState: { netsisConfig: NetsisConfig | null, netsisCache: NetsisMalzeme[] }) => {
  
  // Transform Netsis Data to App-compatible Malzeme format
  const transformToMalzeme = (item: NetsisMalzeme): Malzeme => {
    return {
      id: `netsis-${item.SERILOTNO || Math.random()}`,
      barkod: (item.SERILOTNO || '').trim(),
      parcaNo: (item.STOK_KODU || '').trim(), 
      description: (item.STOK_ADI || '').trim(),
      mslSeviyesi: (item.MSL?.toLowerCase() as any) || '3',
      kalinlik: item.THICKNESS || 0,
      sealDate: new Date().toISOString(),
      durum: 'SEALED',
      location: 'DEPO', // Default to Depo
      acilisZamani: null,
      sonFirinlamaZamani: null,
      kullanilanZamanMs: 0,
      SERILOTNO: item.SERILOTNO,
      STOK_KODU: item.STOK_KODU,
      STOK_ADI: item.STOK_ADI,
      MSL: item.MSL,
      THICKNESS: item.THICKNESS
    };
  };

  return {
    saveNetsisConfig: async (config: NetsisConfig): Promise<boolean> => {
      socket.emit('update-netsis-config', config);
      return true;
    },

    fetchPaginatedMaterials: async (page: number, limit: number, search: string = ''): Promise<{ data: NetsisMalzeme[], total: number }> => {
      try {
        const url = new URL(window.location.origin + '/api/materials');
        url.searchParams.append('page', page.toString());
        url.searchParams.append('limit', limit.toString());
        const cleanSearch = search.trim();
        if (cleanSearch) {
          url.searchParams.append('search', cleanSearch);
        }
        
        const response = await fetch(url.toString());
        const result = await response.json();
        
        return {
          data: result.data || [],
          total: result.total || 0,
        };
      } catch (err) {
        console.error('Failed to fetch paginated netsis data', err);
        return { data: [], total: 0 };
      }
    },

    getNetsisConfig: (): NetsisConfig | null => {
      return localState.netsisConfig;
    },

    getNetsisData: (): NetsisMalzeme[] => {
      return localState.netsisCache;
    },
    
    getTransformedNetsisData: (): Malzeme[] => {
      return localState.netsisCache.map(transformToMalzeme);
    },

    findInNetsis: (barkod: string): NetsisMalzeme | null => {
      return localState.netsisCache.find(item => item.SERILOTNO === barkod) || null;
    }
  };
};
