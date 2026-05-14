export interface HistoryLog {
  id: string;
  date: string;
  userId?: string;
  userName?: string;
  barkod: string;
  stokAdi: string;
  islemTipi: string;
  eskiDeger: string | null;
  yeniDeger: string | null;
  detay: string;
  temp?: number;
  hum?: number;
}

export interface NetsisMalzeme {
  SERILOTNO: string;
  STOK_KODU: string;
  STOK_ADI: string;
  MSL: string;
  THICKNESS: number;
}

export type MSLLevel = '1' | '2' | '2a' | '3' | '4' | '5' | '5a' | '6' | 'N/A';

export type Durum = 'SEALED' | 'OPENED' | 'DRY_CABINET' | 'BAKING' | 'EXPIRED';

export type CabinetId = 'DRY_CABINET_1' | 'DRY_CABINET_2' | 'OVEN_1' | 'DEPO' | 'URETIM';

export type BakeTemp = 40 | 60 | 90 | 125;

export interface Malzeme {
  id: string;
  barkod: string;
  parcaNo: string;
  mslSeviyesi: MSLLevel;
  kalinlik: number;
  sealDate: string;
  acilisZamani: string | null;
  sonFirinlamaZamani: string | null;
  firinlamaBaslangicZamani?: string | null;
  firinlamaBitisZamani?: string | null;
  bakingTemp?: BakeTemp | null;
  kullanilanZamanMs: number;
  durum: Durum;
  location: CabinetId | 'URETIM';
  description?: string;
  row?: number | null;
  col?: number | null;
  SERILOTNO?: string;
  STOK_KODU?: string;
  STOK_ADI?: string;
  MSL?: string;
  THICKNESS?: number;
}

export type SolderPasteStatus = 'IN_COOLER' | 'THAWING' | 'WARMING_UP' | 'READY' | 'ON_MACHINE' | 'USED' | 'EXPIRED' | 'DELETED';

export interface SolderPaste {
  id: string;
  barkod: string;
  parcaNo: string;
  type: 'KURSUNLU' | 'KURSUNSUZ';
  status: SolderPasteStatus;
  outOfCoolerTime: string | null;
  location: CabinetId;
  row: number;
  col: number;
  createdAt: string;
}

export interface CabinetConfig {
  id: CabinetId;
  rows: number;
  cols: number;
}

export interface NetsisConfig {
  server: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface ConnectionStatus {
  connected: boolean;
  lastChecked: string | null;
  error?: string;
}

export type AppTab = 'MSL' | 'SOLDER_PASTE' | 'CABINETS' | 'SETTINGS' | 'HISTORY' | 'ADMIN';

export interface Role {
  id: string; // e.g., 'ADMIN', 'OPERATOR'
  name: string;
  permissions: string[]; // List of permission strings, e.g., 'manage_users', 'manage_cabinets', 'edit_msl', etc.
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  roleId: string;
  qrCode: string; // 36-character unique string
}
