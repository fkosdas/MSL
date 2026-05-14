import { FLOOR_LIFE_HOURS, getBakingTimeHours } from './constants';
import { Durum, MSLLevel, Malzeme } from './types';

export interface HesaplamaSonucu {
  kalanZamanMs: number | null;
  toplamZamanMs: number | null;
  yeniDurum: Durum;
  renkDurumu: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple' | 'orange' | 'cyan';
  mesaj: string;
}

export const mslEngine = {
  hesapla(malzeme: Malzeme, currentTime: number = Date.now()): HesaplamaSonucu {
    const rawMsl = (malzeme.mslSeviyesi || malzeme.MSL?.toString() || '').trim();
    const mslSeviyesi: MSLLevel = rawMsl ? (rawMsl as MSLLevel) : 'N/A';
    const kalinlik = malzeme.kalinlik || malzeme.THICKNESS || 0;
    const bakingTemp = malzeme.bakingTemp || 60;
    
    const { acilisZamani, durum, kullanilanZamanMs = 0, firinlamaBaslangicZamani, sealDate, sonFirinlamaZamani } = malzeme;

    const limitSaat = FLOOR_LIFE_HOURS[mslSeviyesi];
    const floorLifeLimitMs = limitSaat !== null ? limitSaat * 60 * 60 * 1000 : null;

    let isSealExpired = false;
    if (sealDate && mslSeviyesi !== '1') {
         const sealTimeMs = new Date(sealDate).getTime();
         const lastBakeTimeMs = sonFirinlamaZamani ? new Date(sonFirinlamaZamani).getTime() : 0;
         const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
         if (sealTimeMs >= lastBakeTimeMs && (currentTime - sealTimeMs > ONE_YEAR_MS)) {
             isSealExpired = true;
         }
    }

    if (durum === 'SEALED') {
        if (floorLifeLimitMs === null) {
            return { kalanZamanMs: null, toplamZamanMs: null, yeniDurum: 'SEALED', renkDurumu: 'cyan', mesaj: 'MÜHÜRLÜ / GÜVENLİ' };
        }
        let kalanMs = floorLifeLimitMs - kullanilanZamanMs;
        if (isSealExpired) kalanMs = 0;

        if (kalanMs <= 0) {
           return { kalanZamanMs: 0, toplamZamanMs: floorLifeLimitMs, yeniDurum: 'SEALED', renkDurumu: 'red', mesaj: 'MÜHÜR SÜRESİ DOLDU -> FIRIN' };
        }

        return { 
            kalanZamanMs: Math.max(0, kalanMs), 
            toplamZamanMs: floorLifeLimitMs, 
            yeniDurum: 'SEALED', 
            renkDurumu: 'cyan',
            mesaj: 'MÜHÜRLÜ / GÜVENLİ'
        };
    }

    if (durum === 'DRY_CABINET') {
       if (floorLifeLimitMs === null) {
           return { kalanZamanMs: null, toplamZamanMs: null, yeniDurum: 'DRY_CABINET', renkDurumu: 'purple', mesaj: 'DURAKLATILDI (SINIRSIZ)' };
       }
       let kalanMs = floorLifeLimitMs - kullanilanZamanMs;
       if (isSealExpired) kalanMs = 0;

       if (kalanMs <= 0) {
          return { kalanZamanMs: 0, toplamZamanMs: floorLifeLimitMs, yeniDurum: 'EXPIRED', renkDurumu: 'red', mesaj: 'SÜRESİ DOLDU -> FIRIN GEREKLİ' };
       }

       return { 
           kalanZamanMs: Math.max(0, kalanMs), 
           toplamZamanMs: floorLifeLimitMs, 
           yeniDurum: 'DRY_CABINET', 
           renkDurumu: 'purple',
           mesaj: 'DOLAPTA DURAKLATILDI'
       };
    }

    if (durum === 'BAKING') {
        const bakingLimitSaat = getBakingTimeHours(mslSeviyesi, kalinlik, bakingTemp);
        const bakingLimitMs = bakingLimitSaat * 60 * 60 * 1000;
        
        if (!firinlamaBaslangicZamani) {
             return { kalanZamanMs: bakingLimitMs, toplamZamanMs: bakingLimitMs, yeniDurum: 'BAKING', renkDurumu: 'orange', mesaj: 'FIRIN BEKLİYOR' };
        }

        const suAn = currentTime;
        let kalanMs = 0;
        
        if (malzeme.firinlamaBitisZamani) {
            kalanMs = new Date(malzeme.firinlamaBitisZamani).getTime() - suAn;
            // Also limit Ms should match what we expect
            if (bakingLimitMs !== (new Date(malzeme.firinlamaBitisZamani).getTime() - new Date(firinlamaBaslangicZamani || 0).getTime())) {
                 // In case temperature or thickness was updated while baking
                 const newBitisZamani = new Date(new Date(firinlamaBaslangicZamani).getTime() + bakingLimitMs);
                 kalanMs = newBitisZamani.getTime() - suAn;
            }
        } else {
            const baslangicTarihi = new Date(firinlamaBaslangicZamani).getTime();
            const gecenZamanMs = suAn - baslangicTarihi;
            kalanMs = bakingLimitMs - gecenZamanMs;
        }

        if (kalanMs <= 0) {
            return { kalanZamanMs: kalanMs, toplamZamanMs: bakingLimitMs, yeniDurum: 'BAKING', renkDurumu: 'red', mesaj: 'FIRIN TAMAMLANDI (SÜRE AŞIMI)' };
        }

        return { kalanZamanMs: kalanMs, toplamZamanMs: bakingLimitMs, yeniDurum: 'BAKING', renkDurumu: 'orange', mesaj: `FIRIN DÖNGÜSÜ (${bakingTemp}°C)` };
    }

    // OPENED condition
    if (floorLifeLimitMs === null) {
       return { kalanZamanMs: null, toplamZamanMs: null, yeniDurum: 'OPENED', renkDurumu: 'green', mesaj: 'AKTİF KULLANIMDA' };
    }

    let suankiSessionKullanimi = 0;
    if (acilisZamani) {
        suankiSessionKullanimi = currentTime - new Date(acilisZamani).getTime();
    }
    
    const toplamKullanilan = kullanilanZamanMs + suankiSessionKullanimi;
    let kalanZamanMs = floorLifeLimitMs - toplamKullanilan;
    if (isSealExpired) {
        kalanZamanMs = 0;
    }

    if (kalanZamanMs <= 0) {
       return { kalanZamanMs: 0, toplamZamanMs: floorLifeLimitMs, yeniDurum: 'EXPIRED', renkDurumu: 'red', mesaj: 'SÜRESİ DOLDU -> FIRIN GEREKLİ' };
    }

    let renkDurumu: 'green' | 'yellow' = 'green';
    if (kalanZamanMs <= floorLifeLimitMs * 0.1) {
       renkDurumu = 'yellow';
    }

    return { kalanZamanMs, toplamZamanMs: floorLifeLimitMs, yeniDurum: 'OPENED', renkDurumu, mesaj: 'AKTİF KULLANIMDA' };
  }
};
