import { SolderPaste, SolderPasteStatus } from './types';
import { SOLDER_PASTE_THAW_HOURS } from './constants';

export const solderPasteEngine = {
  calculateStatus: (paste: SolderPaste, now: Date = new Date()): SolderPasteStatus => {
    if (paste.status === 'USED') return 'USED';
    if (paste.status === 'IN_COOLER') return 'IN_COOLER';
    if (!paste.outOfCoolerTime) return paste.status;

    const outDate = new Date(paste.outOfCoolerTime);
    const diffMs = now.getTime() - outDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    const requiredHours = SOLDER_PASTE_THAW_HOURS[paste.type];

    // Thawing period: From removal until required hours passed
    if (diffHours < requiredHours) {
      return 'THAWING';
    }

    // Ready period: After thawing, standard 24 hours life (simulated for now, can be adjusted)
    if (diffHours >= requiredHours && diffHours < requiredHours + 24) {
      return 'READY';
    }

    return 'EXPIRED';
  },

  getRemainingThawTimeMs: (paste: SolderPaste, now: Date = new Date()): number => {
    if (!paste.outOfCoolerTime) return 0;
    
    const outDate = new Date(paste.outOfCoolerTime);
    const diffMs = now.getTime() - outDate.getTime();
    
    const requiredMs = SOLDER_PASTE_THAW_HOURS[paste.type] * 60 * 60 * 1000;
    const remaining = requiredMs - diffMs;
    
    return remaining > 0 ? remaining : 0;
  },

  getThawProgress: (paste: SolderPaste, now: Date = new Date()): number => {
    if (!paste.outOfCoolerTime) return 0;
    
    const outDate = new Date(paste.outOfCoolerTime);
    const diffMs = now.getTime() - outDate.getTime();
    
    const requiredMs = SOLDER_PASTE_THAW_HOURS[paste.type] * 60 * 60 * 1000;
    const progress = (diffMs / requiredMs) * 100;
    
    return Math.min(progress, 100);
  }
};
