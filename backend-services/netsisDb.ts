import sql from 'mssql';
import { NetsisConfig, NetsisMalzeme } from '../src/types';

let pool: sql.ConnectionPool | null = null;

export async function connectToNetsis(config: NetsisConfig) {
  try {
    if (pool) {
      await pool.close();
    }
    
    pool = await sql.connect({
      user: config.username,
      password: config.password,
      server: config.server,
      database: config.database,
      port: config.port,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    });
    console.log('[NetsisDB] SQL Connected Successfully');
    return true;
  } catch (error) {
    console.error('[NetsisDB] Connection Error:', error);
    throw error;
  }
}

export async function fetchNetsisMslData(): Promise<NetsisMalzeme[]> {
  if (!pool) {
    console.warn('[NetsisDB] Not connected. Returning empty array.');
    return [];
  }
  
  try {
    const result = await pool.request().query<NetsisMalzeme>(`
      SELECT TOP 1000
        STOK_KODU, 
        STOK_ADI, 
        MAX(BARKOD) AS BARKOD, 
        SERILOTNO, 
        MAX(TARIH) AS TARIH, 
        MSL, 
        MAX(THICKNESS) AS THICKNESS, 
        MAX(PACKAGE) AS PACKAGE,
        MAX(OLCU_BR1) AS OLCU_BR1
      FROM DN_MSLTRACK 
      GROUP BY SERILOTNO, STOK_KODU, STOK_ADI, MSL
      ORDER BY MAX(TARIH) DESC
    `);
    
    if (result.recordset.length > 0) {
      console.log('Örnek Veri Yapısı (fetch):', result.recordset[0]);
    }
    
    return result.recordset;
  } catch (error) {
    console.error('[NetsisDB] Fetch Error:', error);
    return [];
  }
}

export async function searchNetsisMslData(searchFilter: string): Promise<NetsisMalzeme[]> {
  if (!pool) {
    return [];
  }
  try {
    const request = pool.request();
    request.input('search', sql.NVarChar(sql.MAX), searchFilter);

    const result = await request.query<NetsisMalzeme>(`
      SELECT TOP 1000
        STOK_KODU, 
        STOK_ADI, 
        MAX(BARKOD) AS BARKOD, 
        SERILOTNO, 
        MAX(TARIH) AS TARIH, 
        MSL, 
        MAX(THICKNESS) AS THICKNESS, 
        MAX(PACKAGE) AS PACKAGE,
        MAX(OLCU_BR1) AS OLCU_BR1
      FROM DN_MSLTRACK 
      WHERE (
          LTRIM(RTRIM(SERILOTNO)) LIKE '%' + LTRIM(RTRIM(@search)) + '%'
          OR LTRIM(RTRIM(STOK_KODU)) LIKE '%' + LTRIM(RTRIM(@search)) + '%'
        )
      GROUP BY SERILOTNO, STOK_KODU, STOK_ADI, MSL
      ORDER BY MAX(TARIH) DESC
    `);
    
    return result.recordset;
  } catch (error) {
    console.error('[NetsisDB] Search Error:', error);
    return [];
  }
}
