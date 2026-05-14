import { MSLLevel, BakeTemp } from './types';

// JEDEC J-STD-033 Standartlarına göre zemin ömrü (Floor Life) süreleri (Saat cinsinden)
// Ortam şartları: <=30°C / 60% RH
export const FLOOR_LIFE_HOURS: Record<MSLLevel, number | null> = {
  '1': null, // Sınırsız
  '2': 8760, // 1 Yıl (365 gün * 24 saat)
  '2a': 672, // 4 Hafta (28 gün * 24 saat)
  '3': 168,
  '4': 72,
  '5': 48,
  '5a': 24,
  '6': 0, // Kullanımdan önce mutlaka fırınlanmalı (Label'a göre)
  'N/A': null, 
};

// Fırınlama Süreleri (Saat)
// Kaynak: J-STD-033
export const BAKING_TABLE: Record<string, Record<BakeTemp, Record<string, number>>> = {
  '<=1.4': {
    125: { '2': 5, '2a': 7, '3': 9, '4': 11, '5': 12, '5a': 16 },
    90: { '2': 17, '2a': 23, '3': 33, '4': 37, '5': 41, '5a': 54 },
    60: { '2': 72, '2a': 96, '3': 120, '4': 144, '5': 168, '5a': 216 },
    40: { '2': 192, '2a': 216, '3': 312, '4': 360, '5': 408, '5a': 528 },
  },
  '>1.4,<=2.0': {
    125: { '2': 18, '2a': 21, '3': 27, '4': 34, '5': 40, '5a': 48 },
    90: { '2': 63, '2a': 72, '3': 96, '4': 120, '5': 144, '5a': 192 },
    60: { '2': 240, '2a': 264, '3': 336, '4': 432, '5': 528, '5a': 720 },
    40: { '2': 600, '2a': 696, '3': 888, '4': 1128, '5': 1368, '5a': 1896 },
  },
  '>2.0': {
    125: { '2': 48, '2a': 48, '3': 48, '4': 48, '5': 48, '5a': 48 },
    90: { '2': 240, '2a': 240, '3': 240, '4': 240, '5': 240, '5a': 240 },
    60: { '2': 720, '2a': 720, '3': 720, '4': 720, '5': 720, '5a': 720 },
    40: { '2': 1896, '2a': 1896, '3': 1896, '4': 1896, '5': 1896, '5a': 1896 },
  }
};

export const getBakingTimeHours = (msl: MSLLevel, thickness: number, temp: BakeTemp = 125): number => {
  if (msl === '1') return 0;
  // MSL 6 is usually user-specified on the label, default to MSL 5a times if not provided
  const safeMsl = msl === '6' ? '5a' : msl; 
  
  let thicknessKey = '<=1.4';
  if (thickness > 1.4 && thickness <= 2.0) thicknessKey = '>1.4,<=2.0';
  else if (thickness > 2.0) thicknessKey = '>2.0';

  return BAKING_TABLE[thicknessKey][temp][safeMsl] || 0;
};

// Krem Lehim (Solder Paste) çözülme süreleri (Saat)
export const SOLDER_PASTE_THAW_HOURS: Record<'KURSUNLU' | 'KURSUNSUZ', number> = {
  'KURSUNLU': 8,
  'KURSUNSUZ': 4
};

export const SOLDER_PASTE_CODES: Record<string, 'KURSUNLU' | 'KURSUNSUZ'> = {
  'Y.SARF.304': 'KURSUNLU',
  'Y.SARF.305': 'KURSUNSUZ',
  'Y.SARF.319': 'KURSUNLU',
  'Y.SARF.323': 'KURSUNSUZ',
  'Y.SARF.328': 'KURSUNLU',
  'Y.SARF.350': 'KURSUNLU',
};
