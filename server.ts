import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { scrapeCabinetData, getCachedSensors } from './backend-services/cabinetScraper';
import { connectToNetsis, fetchNetsisMslData, searchNetsisMslData } from './backend-services/netsisDb';
import { Malzeme, SolderPaste, CabinetConfig, NetsisConfig, NetsisMalzeme } from './src/types';
import { mslEngine } from './src/mslEngine';
import { SOLDER_PASTE_THAW_HOURS } from './src/constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const safeWriteJson = async (filePath: string, data: any) => {
  const tmpPath = filePath + '.tmp';
  try {
    const jsonString = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(tmpPath, jsonString, 'utf-8');
    await fs.promises.rename(tmpPath, filePath);
  } catch (error) {
    console.error(`Error safely writing ${filePath}:`, error);
  }
};

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    maxHttpBufferSize: 1e8, // 100 MB
    perMessageDeflate: true
  });

  // --- In-Memory State ---
  let malzemeler: Record<string, Malzeme> = {};
  let solderPastes: Record<string, SolderPaste> = {};
  
  const CONFIG_FILE = path.join(__dirname, 'cabinetConfig.json');
  const DATA_FILE = path.join(__dirname, 'malzemeler.json');
  const HISTORY_FILE = path.join(__dirname, 'history.json');
  const USERS_FILE = path.join(__dirname, 'users.json');
  const ROLES_FILE = path.join(__dirname, 'roles.json');
  const NETSIS_CONFIG_FILE = path.join(__dirname, 'netsisConfig.json');
  const ARCHIVE_DIR = path.join(__dirname, 'archives');

  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR);
  }

  const appendLogToArchive = async (log: any) => {
    try {
      const dateTarget = new Date(log.date || Date.now());
      const year = dateTarget.getFullYear();
      const month = String(dateTarget.getMonth() + 1).padStart(2, '0');
      // Arşiv formatı satır bazlı olacağı için uzantıyı .ndjson yapıyoruz
      const archiveFile = path.join(ARCHIVE_DIR, `history_${year}_${month}.ndjson`);
      
      // Dosyayı belleğe okumadan doğrudan sonuna yeni bir satır olarak ekler
      await fs.promises.appendFile(archiveFile, JSON.stringify(log) + '\n', 'utf-8');
    } catch (e) {
      console.error('Error appending log to archive:', e);
    }
  };

  let historyLogs: any[] = [];
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      historyLogs = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('History parsing error', e);
  }

  let users: any[] = [];
  try {
    if (fs.existsSync(USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    } else {
      // Default admin user
      users = [{
        id: '1',
        firstName: 'Admin',
        lastName: 'User',
        title: 'System Administrator',
        roleId: 'ADMIN',
        qrCode: '11111111-2222-3333-4444-555555555555' 
      }];
      fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    }
  } catch (e) { console.error('Users parsing error', e); }

  let roles: any[] = [];
  try {
    if (fs.existsSync(ROLES_FILE)) {
      roles = JSON.parse(fs.readFileSync(ROLES_FILE, 'utf-8'));
    } else {
      // Default roles
      roles = [
        { id: 'ADMIN', name: 'Admin', permissions: ['ALL'] },
        { id: 'OPERATOR', name: 'Operator', permissions: ['VIEW_MSL', 'EDIT_MSL'] }
      ];
      fs.writeFileSync(ROLES_FILE, JSON.stringify(roles));
    }
  } catch (e) { console.error('Roles parsing error', e); }

  let cabinetConfigs: CabinetConfig[] = [];
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      cabinetConfigs = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } else {
      cabinetConfigs = [
        { id: 'DRY_CABINET_1', rows: 5, cols: 2 },
        { id: 'DRY_CABINET_2', rows: 5, cols: 2 },
        { id: 'OVEN_1', rows: 3, cols: 1 }
      ];
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(cabinetConfigs));
    }
  } catch (e) {
    console.error('Config parsing error', e);
  }

  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (parsedData.malzemeler) malzemeler = parsedData.malzemeler;
      if (parsedData.solderPastes) solderPastes = parsedData.solderPastes;
    }
  } catch (e) {
    console.error('Data parsing error', e);
  }

  const saveTrackingData = async () => {
    try {
      const now = Date.now();
      let updatedCount = 0;
      
      // Update MSL times for OPENED and BAKING items before saving
      for (const key of Object.keys(malzemeler)) {
         const m = malzemeler[key];
         if (m.durum === 'OPENED' && m.acilisZamani) {
             // Check expiration
             const sonuc = mslEngine.hesapla(m, now);
             if (sonuc.kalanZamanMs !== null && sonuc.kalanZamanMs <= 0) {
                 const timeOpen = now - new Date(m.acilisZamani).getTime();
                 m.kullanilanZamanMs = (m.kullanilanZamanMs || 0) + timeOpen;
                 m.acilisZamani = null;
                 m.durum = 'EXPIRED';
                 updatedCount++;
                 
                 const log = {
                    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                    date: new Date(now).toISOString(),
                    barkod: m.barkod,
                    stokAdi: m.parcaNo || m.STOK_KODU || '',
                    islemTipi: 'Süre Aşımı',
                    eskiDeger: 'OPENED',
                    yeniDeger: 'EXPIRED',
                    detay: 'Malzeme kullanım ömrü (Floor Life) doldu ve süresi aşıldı.'
                 };
                 historyLogs.push(log);
                 await appendLogToArchive(log);
                 if (historyLogs.length > 5000) historyLogs = historyLogs.slice(-5000);
                 await safeWriteJson(HISTORY_FILE, historyLogs);
                 io.emit('history-updated', log);
             }
         }
      }

      for (const key of Object.keys(solderPastes)) {
         const p = solderPastes[key];
         if (p.status === 'WARMING_UP' && p.outOfCoolerTime) {
             const limitHours = p.type ? SOLDER_PASTE_THAW_HOURS[p.type] : 8;
             const limitMs = limitHours * 3600000;
             const elapsed = now - new Date(p.outOfCoolerTime).getTime();
             if (elapsed >= limitMs) {
                 p.status = 'READY';
                 io.emit('solder-paste-updated', p);
                 
                 const log = {
                    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
                    date: new Date(now).toISOString(),
                    barkod: p.barkod,
                    stokAdi: p.parcaNo || '',
                    islemTipi: 'Hazır / Isındı',
                    detay: `${p.parcaNo} (${p.type}) ısınma süresi tamamlandı. Hazır durumda.`
                 };
                 historyLogs.push(log);
                 await appendLogToArchive(log);
                 if (historyLogs.length > 5000) historyLogs = historyLogs.slice(-5000);
                 await safeWriteJson(HISTORY_FILE, historyLogs);
                 io.emit('history-updated', log);
             }
         }
      }

      await safeWriteJson(DATA_FILE, { malzemeler, solderPastes });
      
      if (updatedCount > 0) {
         io.emit('periodic-update', { malzemeler: Object.values(malzemeler) });
      }
    } catch(err) {
      console.error('Error saving tracking data:', err);
    }
  };

  // Run MSL update and save every 60 seconds
  setInterval(saveTrackingData, 60 * 1000);

  // --- Periodic Sensor Logging for Charts ---
  const logSensorsPeriodically = async () => {
    try {
      const urls: Record<string, string> = {
        'DRY_CABINET_1': 'http://192.168.2.229/mm?desc=Nem%20Dolab%C4%B1&ipadr=192.168.2.21&pieg=&barg=&nog=selected',
        'DRY_CABINET_2': 'http://192.168.2.21/mm?desc=Nem%20Dolab%C4%B1&ipadr=192.168.2.21&pieg=&barg=&nog=selected',
        'OVEN_1': 'http://192.168.2.116/mm?desc=Nem%20Dolab%C4%B1&ipadr=192.168.2.21&pieg=&barg=&nog=selected'
      };

      const now = new Date();
      for (const [id, url] of Object.entries(urls)) {
        try {
          const data = await scrapeCabinetData(url);
          const log = {
            id: 'sensor-' + Date.now().toString() + '-' + id,
            date: now.toISOString(),
            barkod: 'SENSÖR',
            stokAdi: id === 'OVEN_1' ? 'Kürleme Fırını' : (id === 'DRY_CABINET_1' ? 'Lehim Dolabı' : 'Nem Dolabı'),
            islemTipi: 'SENSÖR_GÜNCELLEME',
            yeniDeger: id,
            temp: data.temp || 0,
            hum: data.hum || 0,
            detay: `${id} sensör verisi kaydedildi.`
          };
          historyLogs.push(log);
          await appendLogToArchive(log);
          
          // Limit logs if they grow too much (e.g. keep last 5000 logs)
          if (historyLogs.length > 5000) historyLogs = historyLogs.slice(-5000);
          
          await safeWriteJson(HISTORY_FILE, historyLogs);
          io.emit('history-updated', log);
        } catch (e) {
          console.error(`Periodic sensor logging failed for ${id}:`, e);
        }
      }
    } catch (err) {
      console.error('Periodic sensor logging error:', err);
    }
  };

  // Log sensors every 5 minutes
  setInterval(logSensorsPeriodically, 5 * 60 * 1000);
  // Initial log on startup after a small delay
  setTimeout(logSensorsPeriodically, 10000);

  let netsisConfig: NetsisConfig | null = null;
  try {
    if (fs.existsSync(NETSIS_CONFIG_FILE)) {
      netsisConfig = JSON.parse(fs.readFileSync(NETSIS_CONFIG_FILE, 'utf-8'));
    } else {
      netsisConfig = {
        server: 'NETSIS\\SQLNTS',
        port: 1433,
        database: 'EMS',
        username: 'MSL',
        password: 'msl1234*',
      };
      fs.writeFileSync(NETSIS_CONFIG_FILE, JSON.stringify(netsisConfig, null, 2));
    }
  } catch (e) {
    console.error('Netsis config parsing error', e);
    netsisConfig = {
      server: 'NETSIS\\SQLNTS',
      port: 1433,
      database: 'EMS',
      username: 'MSL',
      password: 'msl1234*',
    };
  }

  let netsisCache: NetsisMalzeme[] = [];

  // --- Netsis Helper ---
  function generateMockNetsisData(count: number): NetsisMalzeme[] {
    const data: NetsisMalzeme[] = [];
    const levels = ['1', '2', '2a', '3', '4', '5', '5a', '6', ''];
    for (let i = 0; i < count; i++) {
      data.push({
        SERILOTNO: `LOT-${2000 + i}`,
        STOK_KODU: `PN-${100 + (i % 20)}`,
        STOK_ADI: `COMPONENT TYPE ${i % 5} - ${i}`,
        MSL: levels[i % levels.length],
        THICKNESS: parseFloat((0.5 + Math.random() * 2).toFixed(2))
      });
    }
    return data;
  }

  // Initial Sync
  let isNetsisConnecting = false;
  let lastNetsisStatus: 'CONNECTED' | 'ERROR' | 'IDLE' = 'IDLE';
  let lastNetsisError = '';

  const refreshNetsisCache = async () => {
    if (netsisConfig) {
      try {
        const fetched = await fetchNetsisMslData();
        netsisCache = fetched.length > 0 ? fetched : generateMockNetsisData(100);
        lastNetsisStatus = 'CONNECTED';
        lastNetsisError = '';
        io.emit('netsis-data-updated');
        io.emit('netsis-config-updated', { config: netsisConfig, status: 'CONNECTED' });
        console.log(`[Netsis] Cache refreshed: ${netsisCache.length} items`);
      } catch (err: any) {
        console.error('[Netsis] Cache refresh failed:', err);
        lastNetsisStatus = 'ERROR';
        lastNetsisError = err.message;
        netsisCache = generateMockNetsisData(100);
        io.emit('netsis-data-updated');
        io.emit('netsis-config-updated', { config: netsisConfig, status: 'ERROR', error: err.message });
      }
    } else {
      netsisCache = generateMockNetsisData(100);
      io.emit('netsis-data-updated');
    }
  };

  if (netsisConfig) {
    isNetsisConnecting = true;
    connectToNetsis(netsisConfig)
      .then(() => {
        isNetsisConnecting = false;
        refreshNetsisCache();
      })
      .catch((e: any) => {
        isNetsisConnecting = false;
        lastNetsisStatus = 'ERROR';
        lastNetsisError = e.message;
        console.log('Initial SQL fail, using mock:', e.message);
        netsisCache = generateMockNetsisData(100);
      });
  }

  // --- API Routes ---
  app.get('/api/materials', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      // Remove all spaces inside the search term as well, to match frontend behavior
      const search = (req.query.search as string || '').replace(/\s+/g, '').trim().toLowerCase();

      let filteredData = netsisCache;

      if (netsisConfig && lastNetsisStatus === 'CONNECTED') {
        if (search) {
          filteredData = await searchNetsisMslData(search);
        } else {
          filteredData = await fetchNetsisMslData();
          netsisCache = filteredData; // Update cache
        }
      } else {
        if (search) {
          filteredData = netsisCache.filter(m => {
            const serilotno = (m.SERILOTNO || '').toString().replace(/\s+/g, '').trim().toLowerCase();
            const stokKodu = (m.STOK_KODU || '').toString().replace(/\s+/g, '').trim().toLowerCase();
            return serilotno.includes(search) || stokKodu.includes(search);
          });
        }
      }

      const total = filteredData.length;
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      // Using res.write stream if preferred, but since it's paginated, res.json is fine
      res.json({
        data: paginatedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });
    } catch (err) {
      console.error('[API] Error sending materials:', err);
      res.status(500).json({ error: 'Data serialization failed' });
    }
  });

  app.get('/api/history', (req, res) => {
    try {
      res.json(historyLogs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  app.post('/api/history', async (req, res) => {
    try {
      const log = req.body;
      if (!log || !log.barkod) return res.status(400).json({ error: 'Invalid log' });
      
      if (!log.id) log.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      if (!log.date) log.date = new Date().toISOString();
      
      historyLogs.push(log);
      await appendLogToArchive(log);
      if (historyLogs.length > 5000) {
        historyLogs = historyLogs.slice(-5000);
      }
      await safeWriteJson(HISTORY_FILE, historyLogs);
      io.emit('history-updated', log);
      res.json({ success: true, log });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create history log' });
    }
  });

  // Keep old endpoint just in case, but empty it out
  app.get('/api/netsis-materials', (req, res) => {
    res.json([]);
  });

  app.get('/api/sensors/cache', (req, res) => {
    res.json(getCachedSensors());
  });

  app.get('/api/proxy-cabinet', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send('URL required');
    try {
      const data = await scrapeCabinetData(targetUrl);
      res.json(data);
    } catch (error: any) {
      console.error('[Proxy] Error scraping cabinet data:', error.message);
      res.json({ temp: 0, hum: 0 });
    }
  });

  app.get('/api/config/cabinets', (req, res) => {
    try {
      let currentConfigs = cabinetConfigs;
      if (fs.existsSync(CONFIG_FILE)) {
        currentConfigs = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        cabinetConfigs = currentConfigs;
      }
      res.json(currentConfigs);
    } catch (error) {
      console.error('Error reading cabinet config:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/config/cabinets', (req, res) => {
    try {
      const newConfigs = req.body;
      if (!Array.isArray(newConfigs)) {
        return res.status(400).json({ error: 'Invalid config format' });
      }
      cabinetConfigs = newConfigs;
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(cabinetConfigs, null, 2));
      io.emit('cabinet-configs-updated', cabinetConfigs); // Still emit to connected clients
      res.json({ success: true });
    } catch (error) {
      console.error('Error writing cabinet config:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // --- Socket.io Logic ---
  io.on('connection', (socket) => {
    socket.emit('initial-state', {
      malzemeler: Object.values(malzemeler),
      solderPastes: Object.values(solderPastes),
      cabinetConfigs,
      netsisConfig,
      netsisCache: [], // Send empty string so no heavy data goes through socket
      netsisStatus: lastNetsisStatus,
      netsisError: lastNetsisError,
      users,
      roles
    });

    socket.on('update-user', async (user: any) => {
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        users[idx] = user;
      } else {
        users.push(user);
      }
      await safeWriteJson(USERS_FILE, users);
      io.emit('users-updated', users);
    });

    socket.on('delete-user', async (userId: string) => {
      users = users.filter(u => u.id !== userId);
      await safeWriteJson(USERS_FILE, users);
      io.emit('users-updated', users);
    });

    socket.on('update-role', async (role: any) => {
      const idx = roles.findIndex(r => r.id === role.id);
      if (idx !== -1) {
        roles[idx] = role;
      } else {
        roles.push(role);
      }
      await safeWriteJson(ROLES_FILE, roles);
      io.emit('roles-updated', roles);
    });

    socket.on('delete-role', async (roleId: string) => {
      roles = roles.filter(r => r.id !== roleId);
      await safeWriteJson(ROLES_FILE, roles);
      io.emit('roles-updated', roles);
    });

    socket.on('update-malzeme', (updated: Malzeme) => {
      malzemeler[updated.barkod] = updated;
      io.emit('malzeme-updated', updated);
    });

    socket.on('delete-malzeme', (barkod: string) => {
      delete malzemeler[barkod];
      io.emit('malzeme-deleted', barkod);
    });

    socket.on('update-solder-paste', (updated: SolderPaste) => {
      solderPastes[updated.barkod] = updated;
      io.emit('solder-paste-updated', updated);
    });

    socket.on('delete-solder-paste', (barkod: string) => {
      delete solderPastes[barkod];
      io.emit('solder-paste-deleted', barkod);
    });

    socket.on('update-cabinet-configs', async (configs: CabinetConfig[]) => {
      cabinetConfigs = configs;
      await safeWriteJson(CONFIG_FILE, cabinetConfigs);
      io.emit('cabinet-configs-updated', configs);
    });

    socket.on('update-netsis-config', async (config: NetsisConfig) => {
      netsisConfig = config;
      await safeWriteJson(NETSIS_CONFIG_FILE, netsisConfig);
      try {
        await connectToNetsis(config);
        await refreshNetsisCache();
        io.emit('netsis-config-updated', { config, status: 'CONNECTED' });
      } catch (err: any) {
        io.emit('netsis-config-updated', { config, status: 'ERROR', error: err.message });
      }
    });

    socket.on('disconnect', () => {});
  });

  setInterval(refreshNetsisCache, 10 * 60 * 1000);

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
