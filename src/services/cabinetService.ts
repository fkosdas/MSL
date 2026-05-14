import { Socket } from 'socket.io-client';
import { CabinetId, CabinetConfig } from '../types';

export const createCabinetService = (socket: Socket, state: { cabinetConfigs: CabinetConfig[] }) => {
  const fetchCabinetData = async (url: string): Promise<{ temp: string, hum: string }> => {
    try {
      const proxyUrl = `/api/proxy-cabinet?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    } catch (error) {
      console.error(`Nem Dolabı Veri Çekme Hatası (${url}):`, error);
      return { temp: 'N/A', hum: 'N/A' };
    }
  };

  return {
    fetchCabinetData,
    getSensorData: async (): Promise<Record<string, { temp: number, hum: number }>> => {
      const urls = {
        'DRY_CABINET_1': 'http://192.168.2.229/mm?desc=Nem%20Dolab%C4%B1&ipadr=192.168.2.21&pieg=&barg=&nog=selected',
        'DRY_CABINET_2': 'http://192.168.2.21/mm?desc=Nem%20Dolab%C4%B1&ipadr=192.168.2.21&pieg=&barg=&nog=selected',
        'OVEN_1': 'http://192.168.2.116/mm?desc=Nem%20Dolab%C4%B1&ipadr=192.168.2.21&pieg=&barg=&nog=selected'
      };

      const results: Record<string, { temp: number, hum: number }> = {};
      const entries = Object.entries(urls);

      for (let i = 0; i < entries.length; i++) {
        const [id, url] = entries[i];
        try {
          const data = await fetchCabinetData(url);
          const cleanVal = (val: string) => {
            if (!val || val === 'N/A') return 0;
            const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
            return isNaN(num) ? 0 : num;
          };
          results[id] = { temp: cleanVal(data.temp), hum: cleanVal(data.hum) };
        } catch (error) {
          results[id] = { temp: 0, hum: 0 };
        }
        if (i < entries.length - 1) await new Promise(resolve => setTimeout(resolve, 1000));
      }
      return results;
    },
    getCabinetConfigs: (): CabinetConfig[] => state.cabinetConfigs,
    saveCabinetConfigs: (configs: CabinetConfig[]): void => {
      socket.emit('update-cabinet-configs', configs);
    },
    findEmptyShelf: (cabinetId: CabinetId, rows: number, cols: number, occupiedItems: { row?: number | null, col?: number | null, location: CabinetId }[]): { row: number, col: number } | null => {
      const cabinetItems = occupiedItems.filter(i => i.location === cabinetId);
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          if (!cabinetItems.some(i => i.row === r && i.col === c)) return { row: r, col: c };
        }
      }
      return null;
    }
  };
};
