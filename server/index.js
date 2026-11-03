import express from 'express';
import http from 'http';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import {
  DEFAULT_FAMILY_MEMBERS,
  DEFAULT_BOOK_SETTINGS,
  SAMPLE_PHOTOS,
} from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STORAGE_DIR = path.join(__dirname, 'storage');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');
const DB_FILE = path.join(STORAGE_DIR, 'archive.db.json');
const CLOUD_CONFIG_FILE = path.join(STORAGE_DIR, 'cloud.config.json');

if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function getSeasonFromMonth(month) {
  if ([3, 4, 5].includes(month)) return 'spring';
  if ([6, 7, 8].includes(month)) return 'summer';
  if ([9, 10, 11].includes(month)) return 'autumn';
  return 'winter';
}

function loadLocalDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      members: DEFAULT_FAMILY_MEMBERS,
      bookSettings: DEFAULT_BOOK_SETTINGS,
      photos: SAMPLE_PHOTOS,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read DB_FILE, re-initializing:', err);
    return {
      members: DEFAULT_FAMILY_MEMBERS,
      bookSettings: DEFAULT_BOOK_SETTINGS,
      photos: SAMPLE_PHOTOS,
      updatedAt: new Date().toISOString(),
    };
  }
}

function saveLocalDb(data) {
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

function loadCloudConfig() {
  const envUrl = process.env.SUPABASE_URL || '';
  const envKey = process.env.SUPABASE_ANON_KEY || '';
  if (envUrl && envKey) {
    return { supabaseUrl: envUrl, supabaseAnonKey: envKey, source: 'env' };
  }
  if (fs.existsSync(CLOUD_CONFIG_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(CLOUD_CONFIG_FILE, 'utf-8'));
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return { ...parsed, source: 'config' };
      }
    } catch {
      // ignore
    }
  }
  return { supabaseUrl: '', supabaseAnonKey: '', source: 'none' };
}

function getSupabaseClient() {
  const cfg = loadCloudConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  try {
    return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  } catch {
    return null;
  }
}

// Configure Multer for photo uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB per photo
});

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '25mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // GET /api/archive — Fetch entire archive state
  app.get('/api/archive', async (_req, res) => {
    const db = loadLocalDb();
    const cloudCfg = loadCloudConfig();
    const supabase = getSupabaseClient();
    let cloudConnected = false;

    if (supabase) {
      try {
        const { data: cloudState, error } = await supabase
          .from('family_archive_state')
          .select('payload')
          .eq('id', 'main')
          .maybeSingle();

        if (!error && cloudState?.payload) {
          cloudConnected = true;
          return res.json({
            ...cloudState.payload,
            cloudStatus: {
              connected: true,
              mode: 'supabase',
              supabaseUrl: cloudCfg.supabaseUrl,
              updatedAt: cloudState.payload.updatedAt,
            },
          });
        } else if (!error) {
          // Initialize cloud table with current local DB
          await supabase
            .from('family_archive_state')
            .upsert({ id: 'main', payload: db, updated_at: new Date().toISOString() });
          cloudConnected = true;
        }
      } catch {
        // Fallback to local DB seamlessly
      }
    }

    // Sort photos chronologically
    db.photos.sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));

    res.json({
      ...db,
      cloudStatus: {
        connected: cloudConnected,
        mode: cloudConnected ? 'supabase' : 'local-server',
        supabaseUrl: cloudCfg.supabaseUrl || null,
        updatedAt: db.updatedAt,
      },
    });
  });

  // Helper to persist both locally and to Supabase if configured
  async function persistState(db) {
    db.photos.sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
    saveLocalDb(db);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase
          .from('family_archive_state')
          .upsert({ id: 'main', payload: db, updated_at: new Date().toISOString() });
      } catch (e) {
        console.warn('Supabase sync skipped:', e.message);
      }
    }
    return db;
  }

  // POST /api/photos — Upload one or multiple photos with metadata
  app.post('/api/photos', upload.array('files', 30), async (req, res) => {
    try {
      const db = loadLocalDb();
      const files = req.files || [];
      const metadataList = req.body.metadata ? JSON.parse(req.body.metadata) : [];
      const supabase = getSupabaseClient();

      const createdPhotos = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const meta = metadataList[i] || {};
        let photoUrl = `/uploads/${file.filename}`;

        // If Supabase Storage bucket `family-photos` is available, try uploading there too
        if (supabase) {
          try {
            const fileBuffer = fs.readFileSync(file.path);
            const { error: upErr } = await supabase.storage
              .from('family-photos')
              .upload(file.filename, fileBuffer, {
                contentType: file.mimetype,
                upsert: true,
              });
            if (!upErr) {
              const { data: pubUrl } = supabase.storage
                .from('family-photos')
                .getPublicUrl(file.filename);
              if (pubUrl?.publicUrl) {
                photoUrl = pubUrl.publicUrl;
              }
            }
          } catch {
            // Keep local `/uploads/...` URL
          }
        }

        const takenAtIso = meta.takenAt
          ? new Date(meta.takenAt).toISOString()
          : new Date().toISOString();
        const d = new Date(takenAtIso);
        const month = d.getMonth() + 1;
        const dateStr = takenAtIso.slice(0, 10);
        const width = Number(meta.width) || 1200;
        const height = Number(meta.height) || 900;
        const aspectRatio = Number((width / height).toFixed(2));
        let orientation = 'landscape';
        if (aspectRatio < 0.92) orientation = 'portrait';
        else if (aspectRatio <= 1.08) orientation = 'square';

        const newPhoto = {
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url: photoUrl,
          takenAt: takenAtIso,
          dateStr,
          month,
          season: getSeasonFromMonth(month),
          memberId: meta.memberId || db.members[0]?.id || 'member-first',
          location: meta.location || '',
          caption: meta.caption || '',
          aspectRatio,
          orientation,
          width,
          height,
          exif: meta.exif || {
            camera: 'Smart Device',
            source: 'Auto Date Extraction',
          },
          isFavorite: Boolean(meta.isFavorite),
          comments: [],
        };

        db.photos.push(newPhoto);
        createdPhotos.push(newPhoto);
      }

      await persistState(db);
      res.status(201).json({ photos: createdPhotos, allPhotos: db.photos });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: '사진 업로드 중 오류가 발생했습니다.' });
    }
  });

  // PATCH /api/photos/:id — Update photo date, caption, location, favorite, memberId
  app.patch('/api/photos/:id', async (req, res) => {
    const db = loadLocalDb();
    const idx = db.photos.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Photo not found' });

    const target = db.photos[idx];
    const updates = req.body;

    if (updates.takenAt || updates.dateStr) {
      const rawDate = updates.takenAt || `${updates.dateStr}T12:00:00.000Z`;
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        target.takenAt = parsed.toISOString();
        target.dateStr = target.takenAt.slice(0, 10);
        target.month = parsed.getMonth() + 1;
        target.season = getSeasonFromMonth(target.month);
      }
    }
    if (typeof updates.caption === 'string') target.caption = updates.caption;
    if (typeof updates.location === 'string') target.location = updates.location;
    if (typeof updates.memberId === 'string') target.memberId = updates.memberId;
    if (typeof updates.isFavorite === 'boolean') target.isFavorite = updates.isFavorite;
    if (typeof updates.layoutHint === 'string') target.layoutHint = updates.layoutHint;

    await persistState(db);
    res.json({ photo: target, allPhotos: db.photos });
  });

  // DELETE /api/photos/:id — Delete photo
  app.delete('/api/photos/:id', async (req, res) => {
    const db = loadLocalDb();
    const target = db.photos.find((p) => p.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Photo not found' });

    if (target.url && target.url.startsWith('/uploads/')) {
      const localPath = path.join(UPLOADS_DIR, path.basename(target.url));
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
        } catch {
          // ignore
        }
      }
    }

    db.photos = db.photos.filter((p) => p.id !== req.params.id);
    await persistState(db);
    res.json({ allPhotos: db.photos });
  });

  // POST /api/photos/:id/comments — Add a family comment
  app.post('/api/photos/:id/comments', async (req, res) => {
    const db = loadLocalDb();
    const photo = db.photos.find((p) => p.id === req.params.id);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    const { memberId, text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text required' });
    }

    const comment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      memberId: memberId || db.members[0]?.id,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    if (!Array.isArray(photo.comments)) photo.comments = [];
    photo.comments.push(comment);

    await persistState(db);
    res.status(201).json({ photo, allPhotos: db.photos });
  });

  // DELETE /api/photos/:id/comments/:commentId
  app.delete('/api/photos/:id/comments/:commentId', async (req, res) => {
    const db = loadLocalDb();
    const photo = db.photos.find((p) => p.id === req.params.id);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    photo.comments = (photo.comments || []).filter((c) => c.id !== req.params.commentId);
    await persistState(db);
    res.json({ photo, allPhotos: db.photos });
  });

  // POST /api/members — Add or update a family member
  app.post('/api/members', async (req, res) => {
    const db = loadLocalDb();
    const { id, name, role, city, color, badgeBg, avatar } = req.body;

    if (id) {
      const existing = db.members.find((m) => m.id === id);
      if (existing) {
        if (typeof name === 'string' && name.trim()) {
          existing.name = name.trim();
        }
        if (typeof city === 'string') existing.city = city.trim();
        if (typeof role === 'string') {
          existing.role = role.trim();
        } else if (typeof city === 'string' && city.trim()) {
          existing.role = city.trim();
        }
        if (color) existing.color = color;
        if (badgeBg) existing.badgeBg = badgeBg;
        if (typeof avatar === 'string' && avatar.trim()) {
          existing.avatar = avatar.trim().slice(0, 2);
        } else if (typeof name === 'string' && name.trim()) {
          existing.avatar = name.trim().slice(0, 1);
        }
        await persistState(db);
        return res.json({ member: existing, members: db.members });
      }
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '이름을 입력해 주세요.' });
    }

    const palette = [
      { color: '#8C5A3C', badgeBg: '#F5EBE6' },
      { color: '#3B5249', badgeBg: '#E6EFEA' },
      { color: '#2C3E50', badgeBg: '#E8EEF5' },
      { color: '#6C5B7B', badgeBg: '#EFEBF5' },
      { color: '#B85D19', badgeBg: '#F9EFE6' },
      { color: '#7A4988', badgeBg: '#F3EAF6' },
    ];
    const pick = palette[db.members.length % palette.length];

    const newMember = {
      id: `member-${Date.now()}`,
      name: name.trim(),
      role: (role || city || '가족 구성원').trim(),
      city: (city || '대한민국').trim(),
      color: color || pick.color,
      badgeBg: badgeBg || pick.badgeBg,
      avatar: avatar || name.trim().slice(0, 1),
    };

    db.members.push(newMember);
    await persistState(db);
    res.status(201).json({ member: newMember, members: db.members });
  });

  // PATCH /api/members/:id — Update a specific member's city, role, name, avatar, color
  app.patch('/api/members/:id', async (req, res) => {
    const db = loadLocalDb();
    const existing = db.members.find((m) => m.id === req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '가족 구성원을 찾을 수 없습니다.' });
    }
    const { name, city, role, color, badgeBg, avatar } = req.body;
    if (typeof name === 'string' && name.trim()) {
      existing.name = name.trim();
    }
    if (typeof city === 'string') {
      existing.city = city.trim();
    }
    if (typeof role === 'string') {
      existing.role = role.trim();
    } else if (typeof city === 'string' && city.trim()) {
      existing.role = city.trim();
    }
    if (color) existing.color = color;
    if (badgeBg) existing.badgeBg = badgeBg;
    if (typeof avatar === 'string' && avatar.trim()) {
      existing.avatar = avatar.trim().slice(0, 2);
    } else if (typeof name === 'string' && name.trim()) {
      existing.avatar = name.trim().slice(0, 1);
    }
    await persistState(db);
    res.json({ member: existing, members: db.members });
  });

  // DELETE /api/members/:id
  app.delete('/api/members/:id', async (req, res) => {
    const db = loadLocalDb();
    if (db.members.length <= 1) {
      return res.status(400).json({ error: '최소 1명의 가족 구성원이 필요합니다.' });
    }
    db.members = db.members.filter((m) => m.id !== req.params.id);
    await persistState(db);
    res.json({ members: db.members });
  });

  // PATCH /api/book-settings — Update photobook cover & layout configuration
  app.patch('/api/book-settings', async (req, res) => {
    const db = loadLocalDb();
    db.bookSettings = {
      ...db.bookSettings,
      ...req.body,
    };
    await persistState(db);
    res.json({ bookSettings: db.bookSettings });
  });

  // POST /api/cloud-config — Configure Supabase Cloud credentials dynamically
  app.post('/api/cloud-config', async (req, res) => {
    const { supabaseUrl, supabaseAnonKey, disconnect } = req.body;
    if (disconnect) {
      if (fs.existsSync(CLOUD_CONFIG_FILE)) fs.unlinkSync(CLOUD_CONFIG_FILE);
      return res.json({
        cloudStatus: { connected: false, mode: 'local-server', supabaseUrl: null },
      });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(400).json({ error: 'Supabase URL과 Anon Key를 모두 입력해 주세요.' });
    }

    try {
      const client = createClient(supabaseUrl.trim(), supabaseAnonKey.trim());
      const db = loadLocalDb();
      const { error } = await client
        .from('family_archive_state')
        .upsert({ id: 'main', payload: db, updated_at: new Date().toISOString() });

      fs.writeFileSync(
        CLOUD_CONFIG_FILE,
        JSON.stringify(
          { supabaseUrl: supabaseUrl.trim(), supabaseAnonKey: supabaseAnonKey.trim() },
          null,
          2
        ),
        'utf-8'
      );

      res.json({
        cloudStatus: {
          connected: !error,
          mode: !error ? 'supabase' : 'supabase-pending-table',
          supabaseUrl: supabaseUrl.trim(),
          tableWarning: error ? error.message : null,
        },
      });
    } catch (err) {
      res.status(400).json({ error: `클라우드 연결 확인 실패: ${err.message}` });
    }
  });

  // POST /api/reset — Reset archive to sample data or empty state
  app.post('/api/reset', async (req, res) => {
    const { mode } = req.body; // 'empty' | 'sample'
    const db = loadLocalDb();
    if (mode === 'empty') {
      db.photos = [];
    } else {
      db.members = DEFAULT_FAMILY_MEMBERS;
      db.bookSettings = DEFAULT_BOOK_SETTINGS;
      db.photos = SAMPLE_PHOTOS;
    }
    await persistState(db);
    res.json(db);
  });

  const httpServer = http.createServer(app);

  // Mount Vite in dev mode or static files in prod
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3456;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ OUR YEAR Family Photobook Archive Server running at http://localhost:${PORT}`);
  });
}

startServer();
